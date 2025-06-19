
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

// Cache pour l'access token OAuth
let cachedAccessToken: string | null = null;
let tokenExpirationTime: number = 0;

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
      console.error('Erreur OAuth SoundCloud:', await tokenResponse.text());
      return null;
    }

    const tokenData = await tokenResponse.json();
    cachedAccessToken = tokenData.access_token;
    // Définir l'expiration à 1 heure par sécurité (les tokens durent généralement plus longtemps)
    tokenExpirationTime = Date.now() + (3600 * 1000);
    
    console.log('Token SoundCloud obtenu avec succès');
    return cachedAccessToken;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token SoundCloud:', error);
    return null;
  }
};

const makeAuthenticatedRequest = async (url: string): Promise<any> => {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('Impossible d\'obtenir un token d\'accès SoundCloud');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur API SoundCloud: ${response.status} ${response.statusText}`);
  }

  return await response.json();
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
            warning: 'Recherche SoundCloud temporairement indisponible'
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
          JSON.stringify({ artist: null }),
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
            console.log('Erreur de résolution:', error.message);
          }
        }

        // Si on a un ID utilisateur, récupérer ses tracks
        if (userId) {
          const tracksUrl = `https://api.soundcloud.com/users/${userId}/tracks?limit=${limit}`;
          tracks = await makeAuthenticatedRequest(tracksUrl);
        } else if (query) {
          // Sinon, essayer la recherche par nom
          const searchUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=${limit}`;
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
          JSON.stringify({ releases: recentReleases }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Erreur sorties SoundCloud:', error);
        return new Response(
          JSON.stringify({ releases: [] }),
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
          JSON.stringify({ tracks: [] }),
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
            tracks: []
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
        message: error.message || 'Le service SoundCloud est temporairement indisponible.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
