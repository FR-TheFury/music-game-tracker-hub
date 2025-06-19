
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
    console.log(`=== CHECK GAME UPDATES: Game ${gameId || 'ALL'}, User ${userId || 'UNKNOWN'} ===`);
    
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
          newUpdates: 0,
          processedGames: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let totalNewUpdates = 0;
    const processedGames = [];

    for (const game of games) {
      try {
        console.log(`Processing game: ${game.name} (${game.platform})`);
        let gameUpdates = [];

        // Vérifier les mises à jour selon la plateforme
        if (game.platform.toLowerCase().includes('steam')) {
          try {
            console.log('Checking Steam updates for:', game.name);
            
            // Simuler une vérification de mise à jour Steam
            // Dans un vrai cas, vous appelleriez l'API Steam
            const lastCheck = game.last_status_check ? new Date(game.last_status_check) : new Date(0);
            const now = new Date();
            const daysSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);

            // Si plus de 7 jours depuis la dernière vérification, considérer comme une mise à jour potentielle
            if (daysSinceLastCheck > 7) {
              const uniqueHash = `steam_${game.id}_${Date.now()}`;
              
              const { data: existing } = await supabaseClient
                .from('new_releases')
                .select('id')
                .eq('unique_hash', uniqueHash)
                .maybeSingle();

              if (!existing) {
                gameUpdates.push({
                  type: 'game',
                  source_item_id: game.id,
                  title: `Mise à jour disponible: ${game.name}`,
                  description: `Une mise à jour pourrait être disponible pour ${game.name}`,
                  image_url: game.image_url || null,
                  platform_url: game.url || null,
                  detected_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  user_id: game.user_id,
                  unique_hash: uniqueHash
                });
                console.log(`Potential update detected for: ${game.name}`);
              }
            }

            // Mettre à jour la dernière vérification
            await supabaseClient
              .from('games')
              .update({ last_status_check: new Date().toISOString() })
              .eq('id', game.id);

          } catch (steamError) {
            console.error(`Steam error for ${game.name}:`, steamError);
          }
        }

        // Vérifier les changements de statut de sortie
        if (game.release_status === 'upcoming' || game.release_status === 'early_access') {
          try {
            // Appeler l'API de recherche de jeux pour vérifier le statut
            const { data: gameSearchData, error: searchError } = await supabaseClient.functions.invoke('search-games', {
              body: {
                query: game.name,
                limit: 1
              }
            });

            if (!searchError && gameSearchData?.games?.length > 0) {
              const updatedGameInfo = gameSearchData.games[0];
              
              // Vérifier si le statut de sortie a changé
              if (updatedGameInfo.release_status !== game.release_status) {
                const uniqueHash = `release_status_${game.id}_${updatedGameInfo.release_status}`;
                
                const { data: existing } = await supabaseClient
                  .from('new_releases')
                  .select('id')
                  .eq('unique_hash', uniqueHash)
                  .maybeSingle();

                if (!existing) {
                  gameUpdates.push({
                    type: 'game',
                    source_item_id: game.id,
                    title: `${game.name} - Changement de statut`,
                    description: `${game.name} est maintenant ${updatedGameInfo.release_status === 'released' ? 'disponible' : updatedGameInfo.release_status}`,
                    image_url: game.image_url || null,
                    platform_url: game.url || null,
                    detected_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    user_id: game.user_id,
                    unique_hash: uniqueHash
                  });

                  // Mettre à jour le statut du jeu
                  await supabaseClient
                    .from('games')
                    .update({ 
                      release_status: updatedGameInfo.release_status,
                      release_date: updatedGameInfo.release_date || game.release_date
                    })
                    .eq('id', game.id);

                  console.log(`Status change detected for: ${game.name} (${game.release_status} -> ${updatedGameInfo.release_status})`);
                }
              }
            }
          } catch (statusError) {
            console.error(`Status check error for ${game.name}:`, statusError);
          }
        }

        // Insérer les nouvelles mises à jour
        if (gameUpdates.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('new_releases')
            .insert(gameUpdates);

          if (insertError) {
            console.error('Insert error:', insertError);
          } else {
            totalNewUpdates += gameUpdates.length;
            console.log(`Inserted ${gameUpdates.length} new updates for ${game.name}`);

            // Envoyer les notifications
            try {
              await supabaseClient.functions.invoke('send-release-notification', {
                body: {
                  userId: game.user_id,
                  releases: gameUpdates,
                  userSettings: {},
                  isDigest: gameUpdates.length > 1
                }
              });
              console.log(`Notification sent for ${game.name}`);
            } catch (notifError) {
              console.error('Notification error:', notifError);
            }
          }
        }

        processedGames.push(game.name);
        
        // Délai entre chaque jeu
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (gameError) {
        console.error(`Error processing ${game.name}:`, gameError);
        continue;
      }
    }

    console.log(`=== COMPLETED: ${totalNewUpdates} new updates found for ${processedGames.length} games ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newUpdates: totalNewUpdates,
        processedGames: processedGames.length,
        gamesProcessed: processedGames,
        message: `Processed ${processedGames.length} games, found ${totalNewUpdates} new updates`
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
