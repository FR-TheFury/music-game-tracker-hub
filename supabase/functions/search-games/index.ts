
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query, platform, searchType } = await req.json()
    console.log('Received request:', { query, platform, searchType })
    
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

      console.log('Searching RAWG for:', query)
      const response = await fetch(
        `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(query)}&page_size=5`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log('RAWG API response status:', response.status)
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
        console.log('RAWG results count:', results.length)
      } else {
        console.error('RAWG API error:', response.status, await response.text())
      }
    } else if (platform === 'steam' && searchType === 'name') {
      console.log('Searching Steam by name for:', query)
      
      try {
        // Utiliser l'API Steam pour rechercher des jeux par nom
        const steamSearchUrl = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(query)}`
        console.log('Calling Steam search API:', steamSearchUrl)
        
        const searchResponse = await fetch(steamSearchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; GameSearchBot/1.0)'
          }
        })
        
        console.log('Steam search API response status:', searchResponse.status)
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          console.log('Steam search results count:', searchData.length)
          
          // Prendre les 5 premiers résultats
          const topResults = searchData.slice(0, 5)
          
          // Pour chaque résultat, récupérer les détails du jeu
          const gamePromises = topResults.map(async (searchResult: any) => {
            try {
              const appId = searchResult.appid
              console.log('Fetching Steam details for app ID:', appId)
              
              const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=french`
              const detailsResponse = await fetch(detailsUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; GameSearchBot/1.0)'
                }
              })
              
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json()
                
                if (detailsData[appId]?.success && detailsData[appId]?.data) {
                  const gameData = detailsData[appId].data
                  
                  // Formater le prix correctement
                  let price = 'Gratuit'
                  let discount = undefined
                  
                  if (gameData.is_free) {
                    price = 'Gratuit'
                  } else if (gameData.price_overview) {
                    price = gameData.price_overview.final_formatted || 'Prix non disponible'
                    if (gameData.price_overview.discount_percent > 0) {
                      discount = `${gameData.price_overview.discount_percent}%`
                    }
                  } else {
                    price = 'Prix non disponible'
                  }
                  
                  // Générer automatiquement un lien RAWG basé sur le nom du jeu
                  const rawgSlug = gameData.name.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '') // Supprimer les caractères spéciaux
                    .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
                    .replace(/-+/g, '-') // Éviter les tirets multiples
                    .replace(/^-|-$/g, '') // Supprimer les tirets en début/fin
                  
                  const rawgUrl = `https://rawg.io/games/${rawgSlug}`
                  console.log('Generated RAWG URL for', gameData.name, ':', rawgUrl)
                  
                  return {
                    name: gameData.name,
                    platform: 'Steam',
                    url: `https://store.steampowered.com/app/${appId}`,
                    imageUrl: gameData.header_image,
                    price: price,
                    discount: discount,
                    releaseDate: gameData.release_date?.date,
                    description: gameData.short_description,
                    genres: gameData.genres?.map((g: any) => g.description),
                    developer: gameData.developers?.[0],
                    publisher: gameData.publishers?.[0],
                    rawgUrl: rawgUrl, // Lien RAWG généré automatiquement
                    shopUrl: `https://store.steampowered.com/app/${appId}`, // Lien boutique Steam
                  }
                }
              }
              
              return null
            } catch (error) {
              console.error(`Error fetching details for app ${searchResult.appid}:`, error)
              return null
            }
          })
          
          const gameResults = await Promise.all(gamePromises)
          results = gameResults.filter(game => game !== null)
          
          console.log('Steam games processed successfully, count:', results.length)
        } else {
          const errorText = await searchResponse.text()
          console.error('Steam search API HTTP error:', searchResponse.status, errorText)
        }
      } catch (steamError) {
        console.error('Error calling Steam search API:', steamError)
      }
    } else if (platform === 'steam' && searchType === 'url') {
      console.log('Processing Steam URL:', query)
      
      // Améliorer l'extraction de l'ID Steam
      const appIdMatch = query.match(/\/app\/(\d+)/) || query.match(/store\.steampowered\.com.*?(\d+)/)
      console.log('App ID match result:', appIdMatch)
      
      if (appIdMatch) {
        const appId = appIdMatch[1]
        console.log('Extracted Steam App ID:', appId)
        
        try {
          const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=french`
          console.log('Calling Steam API:', steamUrl)
          
          const response = await fetch(steamUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; GameSearchBot/1.0)'
            }
          })
          
          console.log('Steam API response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log('Steam API data keys:', Object.keys(data))
            
            if (data[appId]?.success && data[appId]?.data) {
              const gameData = data[appId].data
              console.log('Steam game found:', gameData.name)
              
              // Formater le prix correctement
              let price = 'Gratuit'
              let discount = undefined
              
              if (gameData.is_free) {
                price = 'Gratuit'
              } else if (gameData.price_overview) {
                price = gameData.price_overview.final_formatted || 'Prix non disponible'
                if (gameData.price_overview.discount_percent > 0) {
                  discount = `${gameData.price_overview.discount_percent}%`
                }
              } else {
                price = 'Prix non disponible'
              }
              
              // Générer automatiquement un lien RAWG basé sur le nom du jeu
              const rawgSlug = gameData.name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '') // Supprimer les caractères spéciaux
                .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
                .replace(/-+/g, '-') // Éviter les tirets multiples
                .replace(/^-|-$/g, '') // Supprimer les tirets en début/fin
              
              const rawgUrl = `https://rawg.io/games/${rawgSlug}`
              console.log('Generated RAWG URL for', gameData.name, ':', rawgUrl)
              
              results = [{
                name: gameData.name,
                platform: 'Steam',
                url: query,
                imageUrl: gameData.header_image,
                price: price,
                discount: discount,
                releaseDate: gameData.release_date?.date,
                description: gameData.short_description,
                genres: gameData.genres?.map((g: any) => g.description),
                developer: gameData.developers?.[0],
                publisher: gameData.publishers?.[0],
                rawgUrl: rawgUrl, // Lien RAWG généré automatiquement
                shopUrl: query, // Lien boutique Steam original
              }]
              console.log('Steam game processed successfully')
            } else {
              console.log('Steam API returned no data or unsuccessful response for app:', appId)
              console.log('Full Steam response:', JSON.stringify(data, null, 2))
            }
          } else {
            const errorText = await response.text()
            console.error('Steam API HTTP error:', response.status, errorText)
          }
        } catch (steamError) {
          console.error('Error calling Steam API:', steamError)
        }
      } else {
        console.error('Could not extract Steam App ID from URL:', query)
      }
    }

    console.log('Final results count:', results.length)
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
