
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

const testClientIdValidity = async (clientId: string): Promise<boolean> => {
  try {
    // Test with a simple resolve call to check if the client ID works
    const testUrl = `https://api-v2.soundcloud.com/resolve?url=https://soundcloud.com/soundcloud&client_id=${clientId}`;
    const response = await fetch(testUrl);
    console.log(`Client ID test response status: ${response.status}`);
    
    if (response.status === 403) {
      console.log('403 error - Client ID might be invalid or rate limited');
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error testing client ID:', error);
    return false;
  }
};

const tryAlternativeSearch = async (query: string, clientId: string) => {
  // Try different API endpoints if the main one fails
  const alternatives = [
    `https://api.soundcloud.com/users?q=${encodeURIComponent(query)}&client_id=${clientId}`,
    `https://api-v2.soundcloud.com/search?q=${encodeURIComponent(query)}&variant_ids=&facet=model&user_id=&client_id=${clientId}&limit=20&offset=0`,
  ];

  for (const url of alternatives) {
    try {
      console.log(`Trying alternative URL: ${url}`);
      const response = await fetch(url);
      console.log(`Alternative response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Alternative search successful, found ${data.collection?.length || data.length || 0} results`);
        return data;
      }
    } catch (error) {
      console.log(`Alternative URL failed: ${error.message}`);
    }
  }
  
  return null;
};

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

    console.log(`SoundCloud API request - Type: ${type}, Query: ${query}, Client ID configured: ${clientId ? 'Yes' : 'No'}`);

    // Test client ID validity first
    const isClientIdValid = await testClientIdValidity(clientId);
    if (!isClientIdValid) {
      console.error('Client ID appears to be invalid or rate limited');
      return new Response(
        JSON.stringify({ 
          error: 'SoundCloud API authentication failed',
          message: 'The SOUNDCLOUD_CLIENT_ID appears to be invalid or has exceeded rate limits. Please verify your API key.',
          status: 403
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (type === 'search-artists') {
      const searchUrl = `https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=20`;
      
      console.log('Searching SoundCloud artists for:', query);
      console.log('Request URL:', searchUrl);
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SoundCloud API error: ${response.status} - ${errorText}`);
        
        // Try alternative search methods
        console.log('Trying alternative search methods...');
        const alternativeData = await tryAlternativeSearch(query, clientId);
        
        if (alternativeData) {
          const artists = alternativeData.collection || alternativeData || [];
          console.log(`Alternative search found ${artists.length} artists`);
          return new Response(
            JSON.stringify({ artists }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (response.status === 401 || response.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              message: 'Invalid SOUNDCLOUD_CLIENT_ID. Please verify your API key is correct and has proper permissions.',
              status: response.status,
              details: errorText
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Return empty array instead of throwing error to not break other platform searches
        console.log('Returning empty results to avoid breaking other platforms');
        return new Response(
          JSON.stringify({ artists: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        const errorText = await response.text();
        console.error(`Artist info error: ${response.status} - ${errorText}`);
        
        if (response.status === 401 || response.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              message: 'Invalid SOUNDCLOUD_CLIENT_ID.',
              status: response.status
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        return new Response(
          JSON.stringify({ artist: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        const errorText = await response.text();
        console.error(`Tracks error: ${response.status} - ${errorText}`);
        
        if (response.status === 401 || response.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'SoundCloud API authentication failed',
              status: response.status
            }),
            { 
              status: response.status, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        return new Response(
          JSON.stringify({ tracks: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tracks: SoundCloudTrack[] = await response.json();
      console.log(`Found ${tracks.length} SoundCloud tracks`);

      return new Response(
        JSON.stringify({ tracks }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-releases') {
      console.log('Getting SoundCloud recent releases for user:', query);
      
      // Try to resolve the artist first to get their ID
      let userId = null;
      let tracks = [];
      
      if (artistUrl) {
        try {
          const resolveResponse = await fetch(`https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${clientId}`);
          if (resolveResponse.ok) {
            const userData = await resolveResponse.json();
            userId = userData.id;
            console.log('Resolved artist ID:', userId);
          }
        } catch (error) {
          console.log('Could not resolve artist URL:', error.message);
        }
      }

      if (userId) {
        const tracksUrl = `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${clientId}&limit=${limit}&linked_partitioning=1`;
        
        const response = await fetch(tracksUrl);
        if (response.ok) {
          const data = await response.json();
          tracks = data.collection || [];
          console.log(`Found ${tracks.length} tracks for user ${userId}`);
        } else {
          const errorText = await response.text();
          console.error(`Releases error: ${response.status} - ${errorText}`);
        }
      }

      // If we couldn't get tracks by user ID, try searching for the artist
      if (tracks.length === 0) {
        console.log('Trying search-based approach for releases...');
        try {
          const searchResponse = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${limit}`);
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const searchTracks = searchData.collection || [];
            // Filter tracks that match the artist name
            tracks = searchTracks.filter((track: any) => 
              track.user?.username?.toLowerCase().includes(query.toLowerCase()) ||
              query.toLowerCase().includes(track.user?.username?.toLowerCase())
            );
            console.log(`Found ${tracks.length} matching tracks via search`);
          }
        } catch (searchError) {
          console.log('Search-based approach also failed:', searchError.message);
        }
      }
      
      // Filter for recent releases (last 30 days) and format
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentReleases = tracks
        .filter((track: any) => new Date(track.created_at) >= thirtyDaysAgo)
        .map((track: any) => ({
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
        JSON.stringify({ releases: recentReleases }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'playback-stats') {
      // Similar logic as artist-releases but for stats
      console.log('Getting SoundCloud playback stats for user:', query);
      
      let userId = null;
      let tracks = [];
      
      if (artistUrl) {
        try {
          const resolveResponse = await fetch(`https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${clientId}`);
          if (resolveResponse.ok) {
            const userData = await resolveResponse.json();
            userId = userData.id;
          }
        } catch (error) {
          console.log('Could not resolve artist URL for stats:', error.message);
        }
      }

      if (userId) {
        const tracksUrl = `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${clientId}&limit=50&linked_partitioning=1`;
        
        const response = await fetch(tracksUrl);
        if (response.ok) {
          const data = await response.json();
          tracks = data.collection || [];
        }
      }
      
      // Calculate total plays and likes
      const totalPlays = tracks.reduce((sum: number, track: any) => sum + (track.playback_count || 0), 0);
      const totalLikes = tracks.reduce((sum: number, track: any) => sum + (track.likes_count || 0), 0);
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
        details: 'Please check if SOUNDCLOUD_CLIENT_ID is properly configured and valid'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
