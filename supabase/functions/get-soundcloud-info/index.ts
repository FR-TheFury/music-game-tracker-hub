
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
        JSON.stringify({ error: 'SoundCloud API not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`SoundCloud API request - Type: ${type}`);

    if (type === 'search-artists') {
      const searchUrl = `https://api.soundcloud.com/search/users?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=20`;
      
      console.log('Searching SoundCloud artists for:', query);
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`SoundCloud API error: ${response.status}`);
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
      const userUrl = `https://api.soundcloud.com/users/${username}?client_id=${clientId}`;
      
      console.log('Getting SoundCloud artist info for:', username);
      
      const response = await fetch(userUrl);
      if (!response.ok) {
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
      const tracksUrl = `https://api.soundcloud.com/users/${username}/tracks?client_id=${clientId}&limit=${limit}`;
      
      console.log('Getting SoundCloud tracks for:', username);
      
      const response = await fetch(tracksUrl);
      if (!response.ok) {
        throw new Error(`SoundCloud API error: ${response.status}`);
      }

      const tracks: SoundCloudTrack[] = await response.json();

      console.log(`Found ${tracks.length} SoundCloud tracks`);

      return new Response(
        JSON.stringify({ tracks }),
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
      JSON.stringify({ error: 'Failed to fetch SoundCloud data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
