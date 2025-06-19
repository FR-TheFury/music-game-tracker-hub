
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SoundCloudArtist {
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

interface SoundCloudRelease {
  id: number;
  title: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  release_date: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, artistUrl, type, limit = 10 } = await req.json();
    const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');

    if (!clientId) {
      console.error('SoundCloud Client ID not configured');
      return new Response(
        JSON.stringify({ 
          error: 'SoundCloud API not configured',
          message: 'SOUNDCLOUD_CLIENT_ID environment variable is missing. Please configure it in your Supabase project settings.'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`SoundCloud API request - Type: ${type}, Client ID configured: ${clientId ? 'Yes' : 'No'}`);

    if (type === 'search-artists') {
      const searchUrl = `https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=20`;
      
      console.log('Searching SoundCloud artists for:', query);
      console.log('Request URL:', searchUrl);
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SoundCloud API error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              message: 'Invalid SOUNDCLOUD_CLIENT_ID. Please verify your API key is correct.',
              status: 401
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        throw new Error(`SoundCloud API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const artists: SoundCloudArtist[] = data.collection || [];

      console.log(`Found ${artists.length} SoundCloud artists`);

      return new Response(
        JSON.stringify({ artists }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-info') {
      // Extract username from URL
      const username = artistUrl.split('/').pop();
      const userUrl = `https://api-v2.soundcloud.com/users/${username}?client_id=${clientId}`;
      
      console.log('Getting SoundCloud artist info for:', username);
      
      const response = await fetch(userUrl);
      if (!response.ok) {
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              message: 'Invalid SOUNDCLOUD_CLIENT_ID.',
              status: 401
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const artist: SoundCloudArtist = await response.json();

      console.log('Found SoundCloud artist:', artist.username);

      return new Response(
        JSON.stringify({ artist }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-tracks') {
      // Extract username from URL
      const username = artistUrl.split('/').pop();
      const tracksUrl = `https://api-v2.soundcloud.com/users/${username}/tracks?client_id=${clientId}&limit=${limit}`;
      
      console.log('Getting SoundCloud tracks for:', username);
      
      const response = await fetch(tracksUrl);
      if (!response.ok) {
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              status: 401
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const tracks: SoundCloudTrack[] = await response.json();

      console.log(`Found ${tracks.length} SoundCloud tracks`);

      return new Response(
        JSON.stringify({ tracks }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-releases') {
      // Extract username from URL or use direct artist ID
      let userId = query;
      if (artistUrl) {
        const username = artistUrl.split('/').pop();
        // First get user ID
        const userResponse = await fetch(`https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${clientId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userId = userData.id;
        }
      }

      const tracksUrl = `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${clientId}&limit=${limit}&linked_partitioning=1`;
      
      console.log('Getting SoundCloud recent releases for user:', userId);
      
      const response = await fetch(tracksUrl);
      if (!response.ok) {
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              status: 401
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const data = await response.json();
      const tracks: SoundCloudTrack[] = data.collection || [];
      
      // Filter for recent releases (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentReleases = tracks
        .filter(track => new Date(track.created_at) >= thirtyDaysAgo)
        .map(track => ({
          id: track.id,
          title: track.title,
          created_at: track.created_at,
          permalink_url: track.permalink_url,
          artwork_url: track.artwork_url,
          playback_count: track.playback_count,
          likes_count: track.likes_count,
          release_date: track.created_at,
        }));

      console.log(`Found ${recentReleases.length} recent SoundCloud releases`);

      return new Response(
        JSON.stringify({ releases: recentReleases }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'playback-stats') {
      // Extract username or use direct artist ID
      let userId = query;
      if (artistUrl) {
        const username = artistUrl.split('/').pop();
        const userResponse = await fetch(`https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${clientId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userId = userData.id;
        }
      }

      const tracksUrl = `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${clientId}&limit=50&linked_partitioning=1`;
      
      console.log('Getting SoundCloud playback stats for user:', userId);
      
      const response = await fetch(tracksUrl);
      if (!response.ok) {
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              status: 401
            }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const data = await response.json();
      const tracks: SoundCloudTrack[] = data.collection || [];
      
      // Calculate total plays and likes
      const totalPlays = tracks.reduce((sum, track) => sum + (track.playback_count || 0), 0);
      const totalLikes = tracks.reduce((sum, track) => sum + (track.likes_count || 0), 0);
      const trackCount = tracks.length;

      console.log(`SoundCloud stats: ${totalPlays} total plays, ${totalLikes} total likes, ${trackCount} tracks`);

      return new Response(
        JSON.stringify({ 
          totalPlays, 
          totalLikes, 
          trackCount,
          tracks: tracks.slice(0, 10) // Return top 10 tracks for preview
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('SoundCloud function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch SoundCloud data',
        message: error.message,
        details: 'Please check if SOUNDCLOUD_CLIENT_ID is properly configured'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
