
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface SpotifyArtistInfo {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
  total_tracks: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  try {
    const { query, type } = await req.json();
    
    console.log('Received request:', { query, type });
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter missing' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Spotify access token
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials missing');
    }

    // Get access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      throw new Error('Spotify authentication failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (type === 'search') {
      // Search for artists
      const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!searchResponse.ok) {
        throw new Error('Spotify search failed');
      }

      const searchData = await searchResponse.json();
      return new Response(
        JSON.stringify(searchData.artists.items || []),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else if (type === 'artist') {
      // Get artist details and albums
      const artistId = query;
      console.log('Fetching artist details for:', artistId);

      // Get artist info
      const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!artistResponse.ok) {
        throw new Error('Artist not found');
      }

      const artistData: SpotifyArtistInfo = await artistResponse.json();

      // Get artist albums (last 50 to ensure we get recent ones)
      const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=US&limit=50`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      let releases: SpotifyAlbum[] = [];
      if (albumsResponse.ok) {
        const albumsData = await albumsResponse.json();
        releases = albumsData.items || [];
        console.log(`Found ${releases.length} releases for artist ${artistData.name}`);
      }

      const result = {
        artist: artistData,
        releases: releases
      };

      return new Response(
        JSON.stringify(result),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid type parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in get-spotify-artist-info:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
