
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, platform, searchType } = await req.json()
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let results = []

    if (platform === 'rawg' && searchType === 'name') {
      const rawgApiKey = Deno.env.get('RAWG_API_KEY')
      if (!rawgApiKey) {
        throw new Error('RAWG API key not found')
      }

      const response = await fetch(
        `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(query)}&page_size=5`
      )
      
      if (response.ok) {
        const data = await response.json()
        results = data.results?.map((game: any) => ({
          name: game.name,
          platform: 'Multiplateforme',
          url: `https://rawg.io/games/${game.slug}`,
          imageUrl: game.background_image,
          releaseDate: game.released,
          description: game.description_raw?.substring(0, 150) + '...',
          genres: game.genres?.map((g: any) => g.name),
          rating: game.rating,
        })) || []
      }
    } else if (platform === 'steam' && searchType === 'url') {
      // Extraire l'ID Steam de l'URL
      const appIdMatch = query.match(/\/app\/(\d+)/)
      if (appIdMatch) {
        const appId = appIdMatch[1]
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data[appId]?.success && data[appId]?.data) {
            const gameData = data[appId].data
            results = [{
              name: gameData.name,
              platform: 'Steam',
              url: query,
              imageUrl: gameData.header_image,
              price: gameData.price_overview ? gameData.price_overview.final_formatted : 'Gratuit',
              discount: gameData.price_overview?.discount_percent > 0 ? `${gameData.price_overview.discount_percent}%` : undefined,
              releaseDate: gameData.release_date?.date,
              description: gameData.short_description,
              genres: gameData.genres?.map((g: any) => g.description),
              developer: gameData.developers?.[0],
              publisher: gameData.publishers?.[0],
            }]
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in search-games function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
