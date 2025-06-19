
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Artist {
  id: string;
  name: string;
  platform: string;
  url: string;
  user_id: string;
  spotify_id?: string;
  last_updated?: string;
}

interface Game {
  id: string;
  name: string;
  platform: string;
  url: string;
  user_id: string;
  release_status?: string;
  expected_release_date?: string;
  last_status_check?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header to identify the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log(`Starting user-specific releases check for user: ${user.id}`);
    
    // ÉTAPE 1: Nettoyer les notifications expirées pour cet utilisateur
    console.log(`Cleaning up expired notifications for user ${user.id}...`);
    const { data: expiredNotifications, error: selectError } = await supabaseClient
      .from('new_releases')
      .select('id, title, detected_at')
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString());

    if (selectError) {
      console.error('Error selecting expired notifications:', selectError);
    } else if (expiredNotifications && expiredNotifications.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('new_releases')
        .delete()
        .eq('user_id', user.id)
        .lt('expires_at', new Date().toISOString());

      if (deleteError) {
        console.error('Error deleting expired notifications:', deleteError);
      } else {
        console.log(`Successfully cleaned up ${expiredNotifications.length} expired notifications for user ${user.id}`);
      }
    } else {
      console.log(`No expired notifications to clean for user ${user.id}`);
    }

    // Fetch only this user's artists and games
    const { data: artists, error: artistsError } = await supabaseClient
      .from('artists')
      .select('*')
      .eq('user_id', user.id);

    const { data: games, error: gamesError } = await supabaseClient
      .from('games')
      .select('*')
      .eq('user_id', user.id);

    if (artistsError || gamesError) {
      throw new Error(`Failed to fetch user data: ${artistsError?.message || gamesError?.message}`);
    }

    console.log(`Found ${artists?.length || 0} artists and ${games?.length || 0} games for user ${user.id}`);

    const newReleases = [];

    // Check for new artist releases using Spotify API
    for (const artist of artists || []) {
      if (artist.spotify_id) {
        try {
          const spotifyReleases = await checkSpotifyReleases(artist);
          newReleases.push(...spotifyReleases);
        } catch (error) {
          console.error(`Error checking Spotify releases for ${artist.name}:`, error);
        }
      }
    }

    // Check for new game releases and status changes - ONLY REAL API DATA
    for (const game of games || []) {
      try {
        const gameReleases = await checkGameReleases(game, supabaseClient);
        newReleases.push(...gameReleases);
      } catch (error) {
        console.error(`Error checking game releases for ${game.name}:`, error);
      }
    }

    console.log(`Found ${newReleases.length} new releases for user ${user.id}`);

    // Insert new releases
    if (newReleases.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(newReleases);

      if (insertError) {
        throw insertError;
      }

      console.log(`Successfully inserted ${newReleases.length} new releases for user ${user.id}`);

      // Send email notifications if enabled for this user
      for (const release of newReleases) {
        try {
          let { data: settings, error: settingsError } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (settingsError || !settings) {
            console.log(`Creating default notification settings for user ${user.id}`);
            
            const { data: newSettings, error: createError } = await supabaseClient
              .from('notification_settings')
              .insert({
                user_id: user.id,
                email_notifications_enabled: true,
                notification_frequency: 'immediate',
                artist_notifications_enabled: true,
                game_notifications_enabled: true,
              })
              .select()
              .single();

            if (createError) {
              console.error('Failed to create default notification settings:', createError);
              continue;
            }

            settings = newSettings;
          }

          if (settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
            const shouldSendNotification = 
              (release.type === 'artist' && settings.artist_notifications_enabled) ||
              (release.type === 'game' && settings.game_notifications_enabled);

            if (shouldSendNotification) {
              console.log(`Sending email notification to user ${user.id} for release: ${release.title}`);
              
              const { error: emailError } = await supabaseClient.functions.invoke('send-release-notification', {
                body: { 
                  release, 
                  userId: user.id,
                  userSettings: settings 
                }
              });

              if (emailError) {
                console.error('Failed to send email notification:', emailError);
              } else {
                console.log(`Email notification request sent for user ${user.id}`);
              }
            }
          }
        } catch (emailError) {
          console.error('Failed to process email notification:', emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleasesFound: newReleases.length,
        cleanedExpiredNotifications: expiredNotifications?.length || 0,
        message: `User-specific check completed: found ${newReleases.length} new releases, cleaned ${expiredNotifications?.length || 0} expired notifications`,
        processedArtists: artists?.length || 0,
        processedGames: games?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in user-specific check-releases function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

// Helper functions
async function checkSpotifyReleases(artist: Artist) {
  const releases = [];
  
  try {
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.log('Spotify credentials not configured, skipping Spotify checks');
      return releases;
    }

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

    const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artist.spotify_id}/albums?include_groups=album,single&market=US&limit=20`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!albumsResponse.ok) {
      throw new Error(`Spotify API error: ${albumsResponse.status}`);
    }

    const albumsData = await albumsResponse.json();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    for (const album of albumsData.items || []) {
      const releaseDate = new Date(album.release_date);
      
      if (releaseDate >= thirtyDaysAgo) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: existing } = await supabaseClient
          .from('new_releases')
          .select('id')
          .eq('source_item_id', artist.id)
          .eq('type', 'artist')
          .eq('user_id', artist.user_id)
          .ilike('title', `%${album.name}%`)
          .maybeSingle();

        if (!existing) {
          releases.push({
            type: 'artist' as const,
            source_item_id: artist.id,
            title: `🎵 ${artist.name} - ${album.name}`,
            description: `Nouveau ${album.album_type === 'single' ? 'single' : 'album'} sorti le ${releaseDate.toLocaleDateString('fr-FR')} sur Spotify`,
            image_url: album.images?.[0]?.url,
            platform_url: album.external_urls?.spotify,
            user_id: artist.user_id,
          });
        }
      }
    }

  } catch (error) {
    console.error(`Error checking Spotify for artist ${artist.name}:`, error);
  }

  return releases;
}

async function checkGameReleases(game: Game, supabaseClient: any) {
  const releases = [];
  
  try {
    const steamApiKey = Deno.env.get('STEAM_WEB_API_KEY');
    const rawgApiKey = Deno.env.get('RAWG_API_KEY');

    console.log(`Checking game releases for: ${game.name}`);

    // Only check Steam if we have the API key and it's a Steam game
    if (game.platform.toLowerCase().includes('steam') && steamApiKey) {
      console.log(`Checking Steam API for ${game.name}`);
      
      const steamAppId = extractSteamAppId(game.url);
      if (steamAppId) {
        try {
          const steamData = await checkSteamGameStatus(game, steamAppId, steamApiKey, supabaseClient);
          if (steamData.hasUpdate) {
            releases.push({
              type: 'game' as const,
              source_item_id: game.id,
              title: `🎮 ${game.name} - ${steamData.updateType}`,
              description: steamData.description,
              image_url: steamData.image_url,
              platform_url: game.url,
              user_id: game.user_id,
            });
          }
        } catch (steamError) {
          console.error(`Steam API error for ${game.name}:`, steamError);
        }
      }
    }

    // Only check RAWG if we have the API key
    if (rawgApiKey) {
      console.log(`Checking RAWG API for ${game.name}`);
      try {
        const rawgData = await checkRAWGGameStatus(game, rawgApiKey, supabaseClient);
        if (rawgData.hasUpdate) {
          const { data: existing } = await supabaseClient
            .from('new_releases')
            .select('id')
            .eq('source_item_id', game.id)
            .eq('type', 'game')
            .eq('user_id', game.user_id)
            .ilike('title', `%${rawgData.updateType}%`)
            .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            releases.push({
              type: 'game' as const,
              source_item_id: game.id,
              title: `🎮 ${game.name} - ${rawgData.updateType}`,
              description: rawgData.description,
              image_url: rawgData.image_url,
              platform_url: game.url,
              user_id: game.user_id,
            });
          }
        }
      } catch (rawgError) {
        console.error(`RAWG API error for ${game.name}:`, rawgError);
      }
    }

  } catch (error) {
    console.error(`Error checking game releases for ${game.name}:`, error);
  }

  console.log(`Generated ${releases.length} game release(s) for ${game.name}`);
  return releases;
}

function extractSteamAppId(url: string): string | null {
  const match = url.match(/\/app\/(\d+)/);
  return match ? match[1] : null;
}

async function checkSteamGameStatus(game: Game, appId: string, apiKey: string, supabaseClient: any) {
  try {
    console.log(`Calling Steam API for app ${appId} (${game.name})`);
    
    // Get app details from Steam API
    const appDetailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    
    if (!appDetailsResponse.ok) {
      throw new Error(`Steam API error: ${appDetailsResponse.status}`);
    }

    const appDetailsData = await appDetailsResponse.json();
    const appData = appDetailsData[appId];

    if (!appData?.success) {
      throw new Error(`No Steam data found for app ${appId}`);
    }

    const gameData = appData.data;
    console.log(`Steam data for ${game.name}:`, {
      coming_soon: gameData.coming_soon,
      release_date: gameData.release_date?.date,
      is_released: !gameData.coming_soon
    });
    
    // AMÉLIORATION: Vérification stricte du statut de sortie
    const currentStatus = gameData.coming_soon ? 'coming_soon' : 'released';
    const previousStatus = game.release_status || 'unknown';
    
    // Vérification stricte : le jeu doit être marqué comme non coming_soon ET avoir une date de sortie valide
    const isActuallyReleased = !gameData.coming_soon && 
                               gameData.release_date && 
                               gameData.release_date.date && 
                               gameData.release_date.date !== 'Coming soon' &&
                               gameData.release_date.date !== 'TBD';
    
    console.log(`Release status check for ${game.name}:`, {
      previousStatus,
      currentStatus,
      isActuallyReleased,
      releaseDate: gameData.release_date?.date
    });
    
    // Mettre à jour le statut du jeu dans la base de données
    await supabaseClient
      .from('games')
      .update({ 
        release_status: isActuallyReleased ? 'released' : 'coming_soon',
        last_status_check: new Date().toISOString()
      })
      .eq('id', game.id);
    
    // Ne signaler une sortie que si le jeu est réellement sorti ET que le statut a changé
    if (previousStatus !== 'released' && isActuallyReleased) {
      console.log(`CONFIRMED RELEASE detected for ${game.name}: ${previousStatus} -> released with date: ${gameData.release_date.date}`);
      return {
        hasUpdate: true,
        updateType: 'Sortie confirmée',
        description: `${game.name} est maintenant disponible sur Steam ! Date de sortie : ${gameData.release_date.date}`,
        image_url: gameData.header_image,
      };
    }

    // Check for price changes or promotions
    if (gameData.price_overview && isActuallyReleased) {
      const currentPrice = gameData.price_overview.final_formatted;
      const currentDiscount = gameData.price_overview.discount_percent;
      
      // If there's a significant discount (>= 20%)
      if (currentDiscount >= 20) {
        const { data: existing } = await supabaseClient
          .from('new_releases')
          .select('id')
          .eq('source_item_id', game.id)
          .eq('type', 'game')
          .eq('user_id', game.user_id)
          .ilike('title', '%Promotion%')
          .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          console.log(`Promotion detected for ${game.name}: ${currentDiscount}% off`);
          return {
            hasUpdate: true,
            updateType: 'Promotion',
            description: `${game.name} est en promotion à ${currentDiscount}% de réduction ! Prix : ${currentPrice}`,
            image_url: gameData.header_image,
          };
        }
      }
    }

    console.log(`No significant updates found for ${game.name}`);
    return { hasUpdate: false };

  } catch (error) {
    console.error(`Error checking Steam status for ${game.name}:`, error);
    throw error;
  }
}

async function checkRAWGGameStatus(game: Game, apiKey: string, supabaseClient: any) {
  try {
    console.log(`Calling RAWG API for game: ${game.name}`);
    
    // Search for the game on RAWG
    const searchResponse = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(game.name)}&page_size=5`);
    
    if (!searchResponse.ok) {
      throw new Error(`RAWG API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const gameMatch = searchData.results?.find((g: any) => 
      g.name.toLowerCase().includes(game.name.toLowerCase()) ||
      game.name.toLowerCase().includes(g.name.toLowerCase())
    );

    if (!gameMatch) {
      throw new Error(`No RAWG match found for game: ${game.name}`);
    }

    console.log(`RAWG data for ${game.name}:`, {
      released: gameMatch.released,
      tba: gameMatch.tba,
      name: gameMatch.name
    });

    // AMÉLIORATION: Vérification stricte du statut de sortie
    const previousStatus = game.release_status || 'unknown';
    
    // Un jeu est considéré comme sorti si :
    // 1. Il a une date de sortie (released !== null)
    // 2. Cette date n'est pas dans le futur
    // 3. Il n'est pas marqué comme TBA (to be announced)
    const isActuallyReleased = gameMatch.released && 
                               !gameMatch.tba && 
                               new Date(gameMatch.released) <= new Date();
    
    const currentStatus = isActuallyReleased ? 'released' : 'coming_soon';
    
    console.log(`RAWG release status check for ${game.name}:`, {
      previousStatus,
      currentStatus,
      isActuallyReleased,
      releaseDate: gameMatch.released,
      tba: gameMatch.tba
    });
    
    // Mettre à jour le statut du jeu dans la base de données
    await supabaseClient
      .from('games')
      .update({ 
        release_status: currentStatus,
        last_status_check: new Date().toISOString()
      })
      .eq('id', game.id);
    
    // Ne signaler une sortie que si le jeu est réellement sorti ET que le statut a changé
    if (previousStatus !== 'released' && isActuallyReleased) {
      console.log(`CONFIRMED RELEASE detected for ${game.name}: ${previousStatus} -> released on ${gameMatch.released}`);
      const releaseDateStr = new Date(gameMatch.released).toLocaleDateString('fr-FR');
      
      return {
        hasUpdate: true,
        updateType: 'Sortie confirmée',
        description: `${game.name} est sorti le ${releaseDateStr}`,
        image_url: gameMatch.background_image,
      };
    }

    // Check for recent DLC or additions (only for released games)
    if (isActuallyReleased) {
      const additionsResponse = await fetch(`https://api.rawg.io/api/games/${gameMatch.id}/additions?key=${apiKey}`);
      
      if (additionsResponse.ok) {
        const additionsData = await additionsResponse.json();
        const recentAddition = additionsData.results?.find((addition: any) => {
          if (!addition.released) return false;
          const releaseDate = new Date(addition.released);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return releaseDate >= thirtyDaysAgo && releaseDate <= new Date();
        });

        if (recentAddition) {
          console.log(`Recent DLC found for ${game.name}: ${recentAddition.name}`);
          return {
            hasUpdate: true,
            updateType: 'Nouveau DLC/Extension',
            description: `Nouveau contenu disponible: ${recentAddition.name}`,
            image_url: recentAddition.background_image || gameMatch.background_image,
          };
        }
      }
    }

    console.log(`No significant updates found for ${game.name}`);
    return { hasUpdate: false };

  } catch (error) {
    console.error(`Error checking RAWG status for ${game.name}:`, error);
    throw error;
  }
}

serve(handler);
