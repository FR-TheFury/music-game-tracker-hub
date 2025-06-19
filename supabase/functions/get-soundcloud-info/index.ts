
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SoundCloudTrack {
  id: number;
  title: string;
  description: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  user: {
    username: string;
    permalink_url: string;
  };
}

interface SoundCloudUser {
  id: number;
  username: string;
  full_name: string;
  description: string;
  followers_count: number;
  track_count: number;
  avatar_url: string;
  permalink_url: string;
  verified: boolean;
}

// Cache pour l'access token OAuth avec un système de retry plus intelligent
let cachedAccessToken: string | null = null;
let tokenExpirationTime: number = 0;
let lastRequestTime: number = 0;
let requestCount: number = 0;

// Système de rate limiting intelligent
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50; // Limite conservatrice
const MIN_REQUEST_INTERVAL = 1200; // 1.2 secondes entre les requêtes

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Reset counter si on a dépassé la fenêtre
  if (now - lastRequestTime > RATE_LIMIT_WINDOW) {
    requestCount = 0;
  }
  
  requestCount++;
  lastRequestTime = now;
  
  // Si on approche de la limite, attendre plus longtemps
  if (requestCount > MAX_REQUESTS_PER_WINDOW * 0.8) {
    console.log('Approaching rate limit, adding extra delay');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

const getAccessToken = async (): Promise<string | null> => {
  // Vérifier si le token en cache est encore valide
  if (cachedAccessToken && Date.now() < tokenExpirationTime) {
    return cachedAccessToken;
  }

  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  const clientSecret = Deno.env.get('SOUNDCLOUD_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('SOUNDCLOUD_CLIENT_ID et SOUNDCLOUD_CLIENT_SECRET sont requis');
    return null;
  }

  try {
    await waitForRateLimit();
    
    // OAuth 2.0 Client Credentials flow
    const tokenResponse = await fetch('https://api.soundcloud.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erreur OAuth SoundCloud:', errorText);
      
      // Si rate limited, attendre plus longtemps
      if (tokenResponse.status === 429) {
        console.log('OAuth rate limited, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        throw new Error('rate_limit_exceeded');
      }
      
      return null;
    }

    const tokenData = await tokenResponse.json();
    cachedAccessToken = tokenData.access_token;
    // Token valide pour 1 heure
    tokenExpirationTime = Date.now() + (3600 * 1000);
    
    console.log('Token SoundCloud obtenu avec succès');
    return cachedAccessToken;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token SoundCloud:', error);
    return null;
  }
};

const makeAuthenticatedRequest = async (url: string, retryCount = 0): Promise<any> => {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('Impossible d\'obtenir un token d\'accès SoundCloud');
  }

  try {
    await waitForRateLimit();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429 && retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 5000; // Backoff exponentiel
        console.log(`Rate limited, retrying in ${waitTime}ms (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return makeAuthenticatedRequest(url, retryCount + 1);
      }
      
      throw new Error(`Erreur API SoundCloud: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('rate_limit') && retryCount < 2) {
      const waitTime = (retryCount + 1) * 10000;
      console.log(`Network rate limit, retrying in ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return makeAuthenticatedRequest(url, retryCount + 1);
    }
    throw error;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, artistUrl, type, limit = 10 } = await req.json();
    
    console.log(`SoundCloud API request - Type: ${type}, Query: ${query}`);

    if (type === 'search-artists') {
      try {
        const searchUrl = `https://api.soundcloud.com/users?q=${encodeURIComponent(query)}&limit=20`;
        const data = await makeAuthenticatedRequest(searchUrl);
        
        const artists = Array.isArray(data) ? data : [];
        console.log(`Trouvé ${artists.length} artistes SoundCloud`);
        
        return new Response(
          JSON.stringify({ artists }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur recherche artistes SoundCloud:', error);
        return new Response(
          JSON.stringify({ 
            artists: [],
            warning: 'Recherche SoundCloud temporairement indisponible - Rate limit atteint'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (type === 'artist-info') {
      try {
        const username = artistUrl.split('/').pop();
        const userUrl = `https://api.soundcloud.com/users/${username}`;
        const artist = await makeAuthenticatedRequest(userUrl);
        
        console.log('Infos artiste SoundCloud récupérées:', artist.username);
        return new Response(
          JSON.stringify({ artist }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur infos artiste SoundCloud:', error);
        return new Response(
          JSON.stringify({ 
            artist: null,
            warning: 'Informations artiste temporairement indisponibles'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (type === 'artist-releases') {
      try {
        let tracks: SoundCloudTrack[] = [];
        let userId = null;

        // Essayer de résoudre l'artiste d'abord si on a une URL
        if (artistUrl) {
          try {
            const resolveUrl = `https://api.soundcloud.com/resolve?url=${artistUrl}`;
            const userData = await makeAuthenticatedRequest(resolveUrl);
            userId = userData.id;
            console.log('ID utilisateur résolu:', userId);
          } catch (error) {
            console.log('Erreur de résolution (tentative de fallback):', error.message);
          }
        }

        // Si on a un ID utilisateur, récupérer ses tracks
        if (userId) {
          const tracksUrl = `https://api.soundcloud.com/users/${userId}/tracks?limit=${limit}`;
          tracks = await makeAuthenticatedRequest(tracksUrl);
        } else if (query) {
          // Sinon, essayer la recherche par nom (avec limitation)
          const searchUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`;
          const searchResults = await makeAuthenticatedRequest(searchUrl);
          
          // Filtrer pour l'artiste spécifique
          tracks = searchResults.filter((track: SoundCloudTrack) => 
            track.user?.username?.toLowerCase().includes(query.toLowerCase()) ||
            query.toLowerCase().includes(track.user?.username?.toLowerCase())
          );
        }
        
        // Filtrer pour les sorties récentes (30 derniers jours)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentReleases = tracks
          .filter((track: SoundCloudTrack) => {
            if (!track.created_at) return false;
            return new Date(track.created_at) >= thirtyDaysAgo;
          })
          .map((track: SoundCloudTrack) => ({
            id: track.id,
            title: track.title,
            created_at: track.created_at,
            permalink_url: track.permalink_url,
            artwork_url: track.artwork_url,
            playback_count: track.playback_count || 0,
            likes_count: track.likes_count || 0,
            release_date: track.created_at,
          }));

        console.log(`Trouvé ${recentReleases.length} sorties récentes SoundCloud`);

        return new Response(
          JSON.stringify({ 
            releases: recentReleases,
            rateLimitInfo: `${requestCount}/${MAX_REQUESTS_PER_WINDOW} requests in current window`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur sorties SoundCloud:', error);
        const isRateLimit = error.message.includes('rate_limit') || error.message.includes('429');
        
        return new Response(
          JSON.stringify({ 
            releases: [],
            error: isRateLimit ? 'rate_limit_exceeded' : 'api_error',
            message: isRateLimit ? 'Limite de taux SoundCloud atteinte, réessayez plus tard' : 'Erreur API SoundCloud'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (type === 'artist-tracks') {
      try {
        const username = artistUrl.split('/').pop();
        const tracksUrl = `https://api.soundcloud.com/users/${username}/tracks?limit=${limit}`;
        const tracks = await makeAuthenticatedRequest(tracksUrl);
        
        console.log(`Trouvé ${tracks.length} tracks pour ${username}`);
        return new Response(
          JSON.stringify({ tracks }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur récupération tracks artiste:', error);
        return new Response(
          JSON.stringify({ 
            tracks: [],
            warning: 'Tracks temporairement indisponibles'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (type === 'playback-stats') {
      try {
        let tracks: SoundCloudTrack[] = [];
        let userId = null;
        
        if (artistUrl) {
          try {
            const resolveUrl = `https://api.soundcloud.com/resolve?url=${artistUrl}`;
            const userData = await makeAuthenticatedRequest(resolveUrl);
            userId = userData.id;
          } catch (error) {
            console.log('Erreur résolution pour stats:', error.message);
          }
        }

        if (userId) {
          const tracksUrl = `https://api.soundcloud.com/users/${userId}/tracks?limit=50`;
          tracks = await makeAuthenticatedRequest(tracksUrl);
        }
        
        const totalPlays = tracks.reduce((sum: number, track: SoundCloudTrack) => sum + (track.playback_count || 0), 0);
        const totalLikes = tracks.reduce((sum: number, track: SoundCloudTrack) => sum + (track.likes_count || 0), 0);
        const trackCount = tracks.length;

        console.log(`Stats SoundCloud: ${totalPlays} lectures totales, ${totalLikes} likes totaux, ${trackCount} tracks`);

        return new Response(
          JSON.stringify({ 
            totalPlays, 
            totalLikes, 
            trackCount,
            tracks: tracks.slice(0, 10)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur stats SoundCloud:', error);
        return new Response(
          JSON.stringify({ 
            totalPlays: 0, 
            totalLikes: 0, 
            trackCount: 0,
            tracks: [],
            warning: 'Stats temporairement indisponibles'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Type de requête invalide' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur fonction SoundCloud:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Échec de récupération des données SoundCloud',
        message: 'Le service SoundCloud est temporairement indisponible à cause des limitations de taux. Réessayez dans quelques minutes.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
