
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { artistName, artistId } = await req.json()

    if (artistName) {
      // Search for artists by name
      const searchUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=10`
      const searchResponse = await fetch(searchUrl)
      const searchData = await searchResponse.json()

      console.log('Deezer search results:', searchData)

      return new Response(
        JSON.stringify(searchData.data || []),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    if (artistId) {
      // Get detailed artist information
      const artistUrl = `https://api.deezer.com/artist/${artistId}`
      const artistResponse = await fetch(artistUrl)
      const artistData = await artistResponse.json()

      console.log('Deezer artist details:', artistData)

      // Get artist's albums for recent releases
      const albumsUrl = `https://api.deezer.com/artist/${artistId}/albums?limit=20`
      const albumsResponse = await fetch(albumsUrl)
      const albumsData = await albumsResponse.json()

      const result = {
        ...artistData,
        albums: albumsData.data || []
      }

      return new Response(
        JSON.stringify(result),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Missing artistName or artistId parameter' }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Deezer API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch from Deezer API' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
