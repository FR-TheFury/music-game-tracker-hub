
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

// Système de cache et rate limiting amélioré
let cachedAccessToken: string | null = null;
let tokenExpirationTime: number = 0;
let lastRequestTime: number = 0;
let requestCount: number = 0;
let isRateLimited: boolean = false;
let rateLimitResetTime: number = 0;

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // Limite très conservatrice
const MIN_REQUEST_INTERVAL = 3000; // 3 secondes entre les requêtes
const RATE_LIMIT_BACKOFF = 300000; // 5 minutes de pause si rate limited

const waitForRateLimit = async () => {
  const now = Date.now();
  
  // Vérifier si on est en période de rate limit
  if (isRateLimited && now < rateLimitResetTime) {
    const waitTime = rateLimitResetTime - now;
    console.log(`Still rate limited, waiting ${Math.round(waitTime/1000)}s more`);
    throw new Error('rate_limit_active');
  } else if (isRateLimited && now >= rateLimitResetTime) {
    console.log('Rate limit period expired, resetting');
    isRateLimited = false;
    requestCount = 0;
  }
  
  // Reset counter si on a dépassé la fenêtre
  if (now - lastRequestTime > RATE_LIMIT_WINDOW) {
    requestCount = 0;
  }
  
  // Vérifier si on approche de la limite
  if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
    console.log('Approaching request limit, entering cooldown');
    isRateLimited = true;
    rateLimitResetTime = now + RATE_LIMIT_BACKOFF;
    throw new Error('rate_limit_preemptive');
  }
  
  // Attendre l'intervalle minimum
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  requestCount++;
  lastRequestTime = Date.now();
};

const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && Date.now() < tokenExpirationTime) {
    return cachedAccessToken;
  }

  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  const clientSecret = Deno.env.get('SOUNDCLOUD_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('SoundCloud credentials missing');
    return null;
  }

  try {
    await waitForRateLimit();
    
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
      console.error('OAuth error:', errorText);
      
      if (tokenResponse.status === 429) {
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_BACKOFF;
        throw new Error('rate_limit_exceeded');
      }
      
      return null;
    }

    const tokenData = await tokenResponse.json();
    cachedAccessToken = tokenData.access_token;
    tokenExpirationTime = Date.now() + (3600 * 1000);
    
    console.log('SoundCloud token obtained successfully');
    return cachedAccessToken;
  } catch (error) {
    console.error('Token error:', error);
    if (error.message.includes('rate_limit')) {
      throw error;
    }
    return null;
  }
};

const makeAuthenticatedRequest = async (url: string, retryCount = 0): Promise<any> => {
  // Vérifier le rate limiting avant même d'essayer
  if (isRateLimited) {
    throw new Error('rate_limit_active');
  }

  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('No access token available');
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
      if (response.status === 429) {
        console.log('API rate limited, entering cooldown');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_BACKOFF;
        throw new Error('rate_limit_exceeded');
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('rate_limit') || retryCount >= 2) {
      throw error;
    }
    
    // Retry avec backoff exponentiel pour les autres erreurs
    const waitTime = Math.pow(2, retryCount) * 2000;
    console.log(`Retrying in ${waitTime}ms (attempt ${retryCount + 1})`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return makeAuthenticatedRequest(url, retryCount + 1);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, artistUrl, type, limit = 10 } = await req.json();
    
    console.log(`SoundCloud request - Type: ${type}, Query: ${query}`);

    // Vérifier immédiatement si on est rate limited
    if (isRateLimited) {
      const waitTime = Math.round((rateLimitResetTime - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: 'rate_limit_exceeded',
          message: `SoundCloud API rate limited. Retry in ${waitTime} seconds.`,
          retryAfter: waitTime
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    if (type === 'search-artists') {
      try {
        const searchUrl = `https://api.soundcloud.com/users?q=${encodeURIComponent(query)}&limit=20`;
        const data = await makeAuthenticatedRequest(searchUrl);
        
        const artists = Array.isArray(data) ? data : [];
        console.log(`Found ${artists.length} SoundCloud artists`);
        
        return new Response(
          JSON.stringify({ artists }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Search error:', error);
        return new Response(
          JSON.stringify({ 
            artists: [],
            error: error.message.includes('rate_limit') ? 'rate_limit_exceeded' : 'search_error',
            message: 'SoundCloud search temporarily unavailable'
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
        
        console.log('Artist info retrieved:', artist.username);
        return new Response(
          JSON.stringify({ artist }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Artist info error:', error);
        return new Response(
          JSON.stringify({ 
            artist: null,
            error: error.message.includes('rate_limit') ? 'rate_limit_exceeded' : 'api_error',
            message: 'Artist info temporarily unavailable'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (type === 'artist-releases') {
      try {
        let tracks: SoundCloudTrack[] = [];
        let userId = null;

        if (artistUrl) {
          try {
            const resolveUrl = `https://api.soundcloud.com/resolve?url=${artistUrl}`;
            const userData = await makeAuthenticatedRequest(resolveUrl);
            userId = userData.id;
            console.log('User ID resolved:', userId);
          } catch (error) {
            console.log('Resolution error (trying fallback):', error.message);
          }
        }

        if (userId) {
          const tracksUrl = `https://api.soundcloud.com/users/${userId}/tracks?limit=${limit}`;
          tracks = await makeAuthenticatedRequest(tracksUrl);
        } else if (query) {
          const searchUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 20)}`;
          const searchResults = await makeAuthenticatedRequest(searchUrl);
          
          tracks = searchResults.filter((track: SoundCloudTrack) => 
            track.user?.username?.toLowerCase().includes(query.toLowerCase())
          );
        }
        
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

        console.log(`Found ${recentReleases.length} recent SoundCloud releases`);

        return new Response(
          JSON.stringify({ 
            releases: recentReleases,
            status: 'success'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Releases error:', error);
        return new Response(
          JSON.stringify({ 
            releases: [],
            error: error.message.includes('rate_limit') ? 'rate_limit_exceeded' : 'api_error',
            message: error.message.includes('rate_limit') ? 
              'SoundCloud rate limit reached. Please try again later.' : 
              'Error fetching SoundCloud releases'
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
        
        console.log(`Retrieved ${tracks.length} tracks`);
        return new Response(
          JSON.stringify({ tracks }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Tracks error:', error);
        return new Response(
          JSON.stringify({ 
            tracks: [],
            error: error.message.includes('rate_limit') ? 'rate_limit_exceeded' : 'api_error'
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
            console.log('Stats resolution error:', error.message);
          }
        }

        if (userId) {
          const tracksUrl = `https://api.soundcloud.com/users/${userId}/tracks?limit=50`;
          tracks = await makeAuthenticatedRequest(tracksUrl);
        }
        
        const totalPlays = tracks.reduce((sum: number, track: SoundCloudTrack) => sum + (track.playbook_count || 0), 0);
        const totalLikes = tracks.reduce((sum: number, track: SoundCloudTrack) => sum + (track.likes_count || 0), 0);
        const trackCount = tracks.length;

        console.log(`Stats: ${totalPlays} plays, ${totalLikes} likes, ${trackCount} tracks`);

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
        console.error('Stats error:', error);
        return new Response(
          JSON.stringify({ 
            totalPlays: 0, 
            totalLikes: 0, 
            trackCount: 0,
            tracks: [],
            error: error.message.includes('rate_limit') ? 'rate_limit_exceeded' : 'api_error'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Service temporarily unavailable',
        message: 'SoundCloud service is experiencing issues. Please try again later.'
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
