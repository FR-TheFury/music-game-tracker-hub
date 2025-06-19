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

// Système de cache et rate limiting ultra-conservateur
let cachedAccessToken: string | null = null;
let tokenExpirationTime: number = 0;
let lastRequestTime: number = 0;
let requestCount: number = 0;
let dailyRequestCount: number = 0;
let lastResetTime: number = Date.now();
let isRateLimited: boolean = false;
let rateLimitResetTime: number = 0;

const RATE_LIMIT_WINDOW = 300000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 5; // Très conservateur
const MIN_REQUEST_INTERVAL = 10000; // 10 secondes entre les requêtes
const RATE_LIMIT_BACKOFF = 1800000; // 30 minutes de pause si rate limited
const MAX_DAILY_REQUESTS = 50; // Limite quotidienne

const waitForRateLimit = async () => {
  const now = Date.now();
  
  // Reset quotidien
  if (now - lastResetTime > 24 * 60 * 60 * 1000) {
    dailyRequestCount = 0;
    lastResetTime = now;
    console.log('Daily request count reset');
  }
  
  // Vérifier la limite quotidienne
  if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
    console.log('Daily limit reached, entering long cooldown');
    isRateLimited = true;
    rateLimitResetTime = lastResetTime + 24 * 60 * 60 * 1000;
    throw new Error('daily_limit_reached');
  }
  
  // Vérifier si on est en période de rate limit
  if (isRateLimited && now < rateLimitResetTime) {
    const waitTime = rateLimitResetTime - now;
    console.log(`Still rate limited, waiting ${Math.round(waitTime/60000)}m more`);
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
    console.log('Request limit reached, entering cooldown');
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
  dailyRequestCount++;
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
        'User-Agent': 'Artist-Tracker/1.0',
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
    tokenExpirationTime = Date.now() + (3600 * 1000); // 1 heure
    
    console.log('SoundCloud token obtained successfully');
    return cachedAccessToken;
  } catch (error) {
    console.error('Token error:', error);
    if (error.message.includes('rate_limit') || error.message.includes('daily_limit')) {
      throw error;
    }
    return null;
  }
};

const makeAuthenticatedRequest = async (url: string, retryCount = 0): Promise<any> => {
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
        'User-Agent': 'Artist-Tracker/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('API rate limited, entering extended cooldown');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_BACKOFF;
        throw new Error('rate_limit_exceeded');
      }
      
      if (response.status === 403) {
        console.log('Access forbidden, may be rate limited');
        isRateLimited = true;
        rateLimitResetTime = Date.now() + RATE_LIMIT_BACKOFF;
        throw new Error('access_forbidden');
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('rate_limit') || error.message.includes('access_forbidden') || retryCount >= 1) {
      throw error;
    }
    
    // Un seul retry avec délai plus long
    const waitTime = 15000; // 15 secondes
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
    
    console.log(`SoundCloud request - Type: ${type}, Query: ${query}, Daily: ${dailyRequestCount}/${MAX_DAILY_REQUESTS}`);

    // Vérifier immédiatement si on est rate limited
    if (isRateLimited) {
      const waitTime = Math.round((rateLimitResetTime - Date.now()) / 60000);
      return new Response(
        JSON.stringify({ 
          error: 'rate_limit_exceeded',
          message: `SoundCloud API rate limited. Retry in ${waitTime} minutes.`,
          retryAfter: waitTime * 60
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 
        }
      );
    }

    if (type === 'search-artists') {
      try {
        const searchUrl = `https://api.soundcloud.com/users?q=${encodeURIComponent(query)}&limit=10`;
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

    if (type === 'artist-releases') {
      try {
        let tracks: SoundCloudTrack[] = [];
        let userId = null;

        // Essayer de résoudre l'URL d'abord
        if (artistUrl) {
          try {
            const resolveUrl = `https://api.soundcloud.com/resolve?url=${encodeURIComponent(artistUrl)}`;
            const userData = await makeAuthenticatedRequest(resolveUrl);
            userId = userData.id;
            console.log('User ID resolved:', userId);
          } catch (error) {
            console.log('Resolution failed, trying search fallback:', error.message);
          }
        }

        if (userId) {
          // Récupérer les tracks de l'utilisateur
          const tracksUrl = `https://api.soundcloud.com/users/${userId}/tracks?limit=${Math.min(limit, 20)}`;
          tracks = await makeAuthenticatedRequest(tracksUrl);
        } else if (query) {
          // Fallback sur la recherche
          const searchUrl = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 15)}`;
          const searchResults = await makeAuthenticatedRequest(searchUrl);
          
          // Filtrer pour garder seulement les tracks de l'artiste recherché
          tracks = searchResults.filter((track: SoundCloudTrack) => 
            track.user?.username?.toLowerCase().includes(query.toLowerCase())
          );
        }
        
        // Filtrer les sorties récentes (30 jours au lieu de 7)
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
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        console.log(`Found ${recentReleases.length} recent SoundCloud releases`);

        return new Response(
          JSON.stringify({ 
            releases: recentReleases,
            status: 'success',
            dailyUsage: `${dailyRequestCount}/${MAX_DAILY_REQUESTS}`
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
        message: 'SoundCloud service is experiencing issues. Please try again later.',
        dailyUsage: `${dailyRequestCount}/${MAX_DAILY_REQUESTS}`
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
