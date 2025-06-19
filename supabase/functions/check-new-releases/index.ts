
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
    console.log('Starting GLOBAL automated new releases check...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ÉTAPE 1: Nettoyer les notifications expirées AVANT de chercher de nouvelles sorties
    console.log('Cleaning up expired notifications...');
    const { data: expiredNotifications, error: selectError } = await supabaseClient
      .from('new_releases')
      .select('id, title, detected_at')
      .lt('expires_at', new Date().toISOString());

    if (selectError) {
      console.error('Error selecting expired notifications:', selectError);
    } else if (expiredNotifications && expiredNotifications.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('new_releases')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (deleteError) {
        console.error('Error deleting expired notifications:', deleteError);
      } else {
        console.log(`Successfully cleaned up ${expiredNotifications.length} expired notifications`);
        expiredNotifications.forEach(notification => {
          console.log(`Deleted notification: "${notification.title}" (detected: ${notification.detected_at})`);
        });
      }
    } else {
      console.log('No expired notifications to clean');
    }

    // ÉTAPE 2: Chercher de nouvelles sorties
    const { data: artists, error: artistsError } = await supabaseClient
      .from('artists')
      .select('*');

    const { data: games, error: gamesError } = await supabaseClient
      .from('games')
      .select('*');

    if (artistsError || gamesError) {
      throw new Error(`Failed to fetch data: ${artistsError?.message || gamesError?.message}`);
    }

    console.log(`Found ${artists?.length || 0} artists and ${games?.length || 0} games to check globally`);

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

    console.log(`Found ${newReleases.length} new releases to process globally`);

    // insert new releases and email notifications
    if (newReleases.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(newReleases);

      if (insertError) {
        throw insertError;
      }

      console.log(`Successfully inserted ${newReleases.length} new releases globally`);

      // Send email notifications for users with notifications enabled
      const processedUsers = new Set();
      
      for (const release of newReleases) {
        try {
          if (processedUsers.has(release.user_id)) {
            continue;
          }
          
          console.log(`Processing notifications for user: ${release.user_id}`);
          
          let { data: settings, error: settingsError } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', release.user_id)
            .maybeSingle();

          if (settingsError && settingsError.code === 'PGRST116') {
            console.log(`No notification settings found for user ${release.user_id}, creating default settings`);
            
            const { data: newSettings, error: createError } = await supabaseClient
              .from('notification_settings')
              .insert({
                user_id: release.user_id,
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

            console.log(`Created default notification settings for user ${release.user_id}:`, newSettings);
            settings = newSettings;
          } else if (settingsError) {
            console.error('Error fetching notification settings:', settingsError);
            continue;
          }

          if (settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
            const userReleases = newReleases.filter(r => r.user_id === release.user_id);
            
            for (const userRelease of userReleases) {
              const shouldSendNotification = 
                (userRelease.type === 'artist' && settings.artist_notifications_enabled) ||
                (userRelease.type === 'game' && settings.game_notifications_enabled);

              if (shouldSendNotification) {
                console.log(`Sending email notification to user ${release.user_id} for release: ${userRelease.title}`);
                
                const { error: emailError } = await supabaseClient.functions.invoke('send-release-notification', {
                  body: { 
                    release: userRelease, 
                    userId: release.user_id,
                    userSettings: settings 
                  }
                });

                if (emailError) {
                  console.error('Failed to send email notification:', emailError);
                } else {
                  console.log(`Email notification request sent successfully for user ${release.user_id}`);
                }
              } else {
                console.log(`Notifications disabled for ${userRelease.type} for user ${release.user_id}`);
              }
            }
          } else {
            console.log(`Email notifications disabled or not immediate for user ${release.user_id}`);
          }
          
          processedUsers.add(release.user_id);
          
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
        message: `Global automated check completed: found ${newReleases.length} new releases, cleaned ${expiredNotifications?.length || 0} expired notifications`,
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
    console.error('Error in GLOBAL automated check-new-releases function:', error);
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
          const steamData = await checkSteamStatus(game, steamAppId, steamApiKey, supabaseClient);
          if (steamData.release) {
            releases.push(steamData.release);
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
        const rawgData = await checkRAWGStatus(game, rawgApiKey, supabaseClient);
        if (rawgData.release) {
          releases.push(rawgData.release);
        }
      } catch (rawgError) {
        console.error(`RAWG API error for ${game.name}:`, rawgError);
      }
    }

    // Update game status in database if needed
    if (releases.length > 0) {
      const updateData: any = {
        last_status_check: new Date().toISOString()
      };

      await supabaseClient
        .from('games')
        .update(updateData)
        .eq('id', game.id);
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

async function checkSteamStatus(game: Game, appId: string, apiKey: string, supabaseClient: any) {
  let release = null;

  try {
    const appDetailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    
    if (!appDetailsResponse.ok) {
      throw new Error(`Steam API error: ${appDetailsResponse.status}`);
    }

    const appDetailsData = await appDetailsResponse.json();
    const appData = appDetailsData[appId];

    if (!appData?.success) {
      console.log(`No Steam data found for app ${appId}`);
      return { release };
    }

    const gameData = appData.data;
    const previousStatus = game.release_status || 'unknown';
    
    // Check for release status changes
    const currentStatus = gameData.coming_soon === false ? 'released' : 'coming_soon';
    
    if (previousStatus !== currentStatus && currentStatus === 'released') {
      release = {
        type: 'game' as const,
        source_item_id: game.id,
        title: `🎉 ${game.name} est maintenant disponible !`,
        description: `Le jeu que vous attendiez est enfin sorti sur Steam !`,
        image_url: gameData.header_image,
        platform_url: game.url,
        user_id: game.user_id,
      };
    }

    // Check for price changes or promotions
    if (gameData.price_overview && !release) {
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
          release = {
            type: 'game' as const,
            source_item_id: game.id,
            title: `💰 ${game.name} - Promotion`,
            description: `${game.name} est en promotion à ${currentDiscount}% de réduction ! Prix : ${gameData.price_overview.final_formatted}`,
            image_url: gameData.header_image,
            platform_url: game.url,
            user_id: game.user_id,
          };
        }
      }
    }

  } catch (error) {
    console.error(`Error checking Steam status for ${game.name}:`, error);
  }

  return { release };
}

async function checkRAWGStatus(game: Game, apiKey: string, supabaseClient: any) {
  let release = null;

  try {
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
      console.log(`No RAWG match found for game: ${game.name}`);
      return { release };
    }

    const previousStatus = game.release_status || 'unknown';
    
    // Check for release status changes
    const currentStatus = gameMatch.released && gameMatch.released !== '' ? 'released' : 'coming_soon';
    
    if (previousStatus !== currentStatus && currentStatus === 'released') {
      const releaseDateStr = gameMatch.released ? new Date(gameMatch.released).toLocaleDateString('fr-FR') : 'récemment';
      
      release = {
        type: 'game' as const,
        source_item_id: game.id,
        title: `🎉 ${game.name} est maintenant disponible !`,
        description: `Le jeu est sorti le ${releaseDateStr}`,
        image_url: gameMatch.background_image,
        platform_url: game.url,
        user_id: game.user_id,
      };
    }

    // Check for recent DLC or additions if no release
    if (!release) {
      const additionsResponse = await fetch(`https://api.rawg.io/api/games/${gameMatch.id}/additions?key=${apiKey}`);
      
      if (additionsResponse.ok) {
        const additionsData = await additionsResponse.json();
        const recentAddition = additionsData.results?.find((addition: any) => {
          if (!addition.released) return false;
          const releaseDate = new Date(addition.released);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return releaseDate >= thirtyDaysAgo;
        });

        if (recentAddition) {
          const { data: existing } = await supabaseClient
            .from('new_releases')
            .select('id')
            .eq('source_item_id', game.id)
            .eq('type', 'game')
            .eq('user_id', game.user_id)
            .ilike('title', `%${recentAddition.name}%`)
            .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            console.log(`Recent DLC found for ${game.name}: ${recentAddition.name}`);
            release = {
              type: 'game' as const,
              source_item_id: game.id,
              title: `🎮 ${game.name} - ${recentAddition.name}`,
              description: `Nouveau contenu disponible: ${recentAddition.name}`,
              image_url: recentAddition.background_image || gameMatch.background_image,
              platform_url: game.url,
              user_id: game.user_id,
            };
          }
        }
      }
    }

  } catch (error) {
    console.error(`Error checking RAWG status for ${game.name}:`, error);
  }

  return { release };
}

serve(handler);
