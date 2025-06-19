
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody = {};
    
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim() !== '') {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }

    const { gameId, userId } = requestBody;
    console.log(`=== CHECK GAME RELEASES: Game ${gameId || 'ALL'}, User ${userId || 'UNKNOWN'} ===`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let games = [];
    
    if (gameId) {
      const { data: game, error: gameError } = await supabaseClient
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        console.error('Game not found:', gameId);
        return new Response(
          JSON.stringify({ 
            error: 'Game not found',
            success: false 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      games = [game];
    } else if (userId) {
      const { data: userGames, error: gamesError } = await supabaseClient
        .from('games')
        .select('*')
        .eq('user_id', userId);

      if (gamesError) {
        console.error('Error fetching user games:', gamesError);
        throw new Error('Error fetching user games');
      }
      games = userGames || [];
    } else {
      const { data: allGames, error: allGamesError } = await supabaseClient
        .from('games')
        .select('*')
        .limit(20);

      if (allGamesError) {
        console.error('Error fetching all games:', allGamesError);
        throw new Error('Error fetching games');
      }
      games = allGames || [];
    }

    if (games.length === 0) {
      console.log('No games found to check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No games to check',
          newReleases: 0,
          processedGames: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let totalNewReleases = 0;
    const processedGames = [];

    for (const game of games) {
      try {
        console.log(`Processing game: ${game.name} (${game.platform})`);
        let gameReleases = [];

        // Vérifier les sorties via RAWG API si disponible
        if (game.rawg_url || game.name) {
          try {
            console.log('Checking RAWG for game releases:', game.name);
            
            const rawgApiKey = Deno.env.get('RAWG_API_KEY');
            if (rawgApiKey) {
              // Rechercher le jeu sur RAWG
              const searchUrl = `https://api.rawg.io/api/games?key=${rawgApiKey}&search=${encodeURIComponent(game.name)}&page_size=5`;
              const searchResponse = await fetch(searchUrl);
              
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const foundGame = searchData.results?.[0];
                
                if (foundGame) {
                  // Vérifier si le jeu a une date de sortie récente ou confirmée
                  const releaseDate = foundGame.released;
                  const tbaDate = foundGame.tba;
                  
                  // Si le jeu était "à venir" et maintenant a une date de sortie
                  if (releaseDate && (game.release_status === 'upcoming' || !game.release_date)) {
                    const uniqueHash = `rawg_release_${game.id}_${releaseDate}`;
                    
                    const { data: existing } = await supabaseClient
                      .from('new_releases')
                      .select('id')
                      .eq('unique_hash', uniqueHash)
                      .maybeSingle();

                    if (!existing) {
                      gameReleases.push({
                        type: 'game',
                        source_item_id: game.id,
                        title: `${game.name} - Date de sortie confirmée !`,
                        description: `${game.name} est maintenant disponible depuis le ${new Date(releaseDate).toLocaleDateString('fr-FR')}`,
                        image_url: foundGame.background_image || game.image_url,
                        platform_url: game.url || `https://rawg.io/games/${foundGame.slug}`,
                        detected_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        user_id: game.user_id,
                        unique_hash: uniqueHash
                      });

                      // Mettre à jour le jeu avec les nouvelles infos
                      await supabaseClient
                        .from('games')
                        .update({ 
                          release_date: releaseDate,
                          release_status: 'released',
                          last_status_check: new Date().toISOString()
                        })
                        .eq('id', game.id);

                      console.log(`Release confirmed for: ${game.name} (${releaseDate})`);
                    }
                  }
                  
                  // Vérifier les changements de statut (early access, bêta, etc.)
                  if (foundGame.released && foundGame.released !== game.release_date) {
                    const uniqueHash = `rawg_status_${game.id}_${foundGame.released}`;
                    
                    const { data: existing } = await supabaseClient
                      .from('new_releases')
                      .select('id')
                      .eq('unique_hash', uniqueHash)
                      .maybeSingle();

                    if (!existing) {
                      gameReleases.push({
                        type: 'game',
                        source_item_id: game.id,
                        title: `${game.name} - Nouvelle information de sortie`,
                        description: `Nouvelle date de sortie confirmée pour ${game.name}`,
                        image_url: foundGame.background_image || game.image_url,
                        platform_url: game.url || `https://rawg.io/games/${foundGame.slug}`,
                        detected_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        user_id: game.user_id,
                        unique_hash: uniqueHash
                      });
                      console.log(`Status update for: ${game.name}`);
                    }
                  }
                }
              }
              
              // Délai pour respecter les limites RAWG
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (rawgError) {
            console.error(`RAWG error for ${game.name}:`, rawgError);
          }
        }

        // Vérifier via Steam si c'est un jeu Steam
        if (game.platform.toLowerCase().includes('steam') && game.url) {
          try {
            console.log('Checking Steam for:', game.name);
            
            // Extraire l'ID Steam de l'URL
            const steamIdMatch = game.url.match(/\/app\/(\d+)/);
            if (steamIdMatch) {
              const steamId = steamIdMatch[1];
              const steamApiKey = Deno.env.get('STEAM_WEB_API_KEY');
              
              if (steamApiKey) {
                const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${steamId}`;
                const steamResponse = await fetch(steamUrl);
                
                if (steamResponse.ok) {
                  const steamData = await steamResponse.json();
                  const appData = steamData[steamId];
                  
                  if (appData?.success && appData.data) {
                    const gameData = appData.data;
                    
                    // Vérifier si le jeu est maintenant disponible
                    if (!gameData.release_date?.coming_soon && game.release_status === 'upcoming') {
                      const uniqueHash = `steam_released_${game.id}_${Date.now()}`;
                      
                      const { data: existing } = await supabaseClient
                        .from('new_releases')
                        .select('id')
                        .eq('unique_hash', uniqueHash)
                        .maybeSingle();

                      if (!existing) {
                        gameReleases.push({
                          type: 'game',
                          source_item_id: game.id,
                          title: `${game.name} - Maintenant disponible sur Steam !`,
                          description: `${game.name} est maintenant disponible sur Steam`,
                          image_url: gameData.header_image || game.image_url,
                          platform_url: game.url,
                          detected_at: new Date().toISOString(),
                          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                          user_id: game.user_id,
                          unique_hash: uniqueHash
                        });

                        // Mettre à jour le statut du jeu
                        await supabaseClient
                          .from('games')
                          .update({ 
                            release_status: 'released',
                            release_date: gameData.release_date?.date || 'Available now',
                            last_status_check: new Date().toISOString()
                          })
                          .eq('id', game.id);

                        console.log(`Steam release confirmed for: ${game.name}`);
                      }
                    }
                  }
                }
                
                // Délai pour respecter les limites Steam
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
            }
          } catch (steamError) {
            console.error(`Steam error for ${game.name}:`, steamError);
          }
        }

        // Insérer les nouvelles sorties
        if (gameReleases.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('new_releases')
            .insert(gameReleases);

          if (insertError) {
            console.error('Insert error:', insertError);
          } else {
            totalNewReleases += gameReleases.length;
            console.log(`Inserted ${gameReleases.length} new releases for ${game.name}`);

            // Envoyer les notifications
            try {
              await supabaseClient.functions.invoke('send-release-notification', {
                body: {
                  userId: game.user_id,
                  releases: gameReleases,
                  userSettings: {},
                  isDigest: gameReleases.length > 1
                }
              });
              console.log(`Notification sent for ${game.name}`);
            } catch (notifError) {
              console.error('Notification error:', notifError);
            }
          }
        }

        // Mettre à jour la dernière vérification
        await supabaseClient
          .from('games')
          .update({ last_status_check: new Date().toISOString() })
          .eq('id', game.id);

        processedGames.push(game.name);
        
        // Délai entre chaque jeu
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (gameError) {
        console.error(`Error processing ${game.name}:`, gameError);
        continue;
      }
    }

    console.log(`=== COMPLETED: ${totalNewReleases} new releases found for ${processedGames.length} games ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleases: totalNewReleases,
        processedGames: processedGames.length,
        gamesProcessed: processedGames,
        message: `Processed ${processedGames.length} games, found ${totalNewReleases} new releases`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-game-updates function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);
