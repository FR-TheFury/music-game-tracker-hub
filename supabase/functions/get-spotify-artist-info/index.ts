
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, type = 'search' } = await req.json()
    
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID')
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured')
    }

    // Get Spotify access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    let result = null

    if (type === 'search') {
      // Search artists
      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const searchData = await searchResponse.json()
      result = searchData.artists?.items || []
    } else if (type === 'artist') {
      // Get artist details
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${query}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const artistData = await artistResponse.json()
      
      // Get artist albums
      const albumsResponse = await fetch(
        `https://api.spotify.com/v1/artists/${query}/albums?include_groups=album,single&market=FR&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      const albumsData = await albumsResponse.json()
      
      result = {
        artist: artistData,
        releases: albumsData.items || []
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Spotify API error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
