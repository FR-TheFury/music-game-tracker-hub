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

// Fonction utilitaire pour créer un hash unique pour éviter les doublons
function createReleaseHash(userId: string, sourceItemId: string, type: string, title: string): string {
  const hashInput = `${userId}-${sourceItemId}-${type}-${title.replace(/[^\w\s]/gi, '').toLowerCase()}`;
  return btoa(hashInput).replace(/[+=\/]/g, '');
}

// Fonction utilitaire pour vérifier si un email a déjà été envoyé
async function hasEmailBeenSent(supabaseClient: any, userId: string, releaseHash: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('email_sent_log')
    .select('id')
    .eq('user_id', userId)
    .eq('release_hash', releaseHash)
    .eq('email_type', 'release_notification')
    .maybeSingle();

  if (error) {
    console.error('Error checking email sent log:', error);
    return false;
  }

  return data !== null;
}

// Fonction utilitaire pour vérifier le rate limiting (max 3 emails par heure)
async function checkRateLimit(supabaseClient: any, userId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabaseClient
    .from('email_sent_log')
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', 'release_notification')
    .gte('sent_at', oneHourAgo);

  if (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }

  return (data?.length || 0) < 3;
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

    const allNewReleases = [];

    // Check for new artist releases using Spotify API
    for (const artist of artists || []) {
      if (artist.spotify_id) {
        try {
          const spotifyReleases = await checkSpotifyReleases(artist, supabaseClient);
          allNewReleases.push(...spotifyReleases);
        } catch (error) {
          console.error(`Error checking Spotify releases for ${artist.name}:`, error);
        }
      }
    }

    // Check for new game releases and status changes
    for (const game of games || []) {
      try {
        const gameReleases = await checkGameReleases(game, supabaseClient);
        allNewReleases.push(...gameReleases);
      } catch (error) {
        console.error(`Error checking game releases for ${game.name}:`, error);
      }
    }

    console.log(`Found ${allNewReleases.length} potential new releases globally`);

    // ÉTAPE 3: Filtrer les doublons et insérer les nouvelles releases
    const uniqueReleases = [];
    const releasesToInsert = [];

    for (const release of allNewReleases) {
      const releaseHash = createReleaseHash(release.user_id, release.source_item_id, release.type, release.title);
      
      // Vérifier si cette release existe déjà avec ce hash
      const { data: existingRelease } = await supabaseClient
        .from('new_releases')
        .select('id')
        .eq('unique_hash', releaseHash)
        .maybeSingle();

      if (!existingRelease) {
        const releaseWithHash = {
          ...release,
          unique_hash: releaseHash,
          detected_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        releasesToInsert.push(releaseWithHash);
        uniqueReleases.push(releaseWithHash);
        console.log(`New unique release detected: ${release.title} (hash: ${releaseHash})`);
      } else {
        console.log(`Duplicate release filtered out: ${release.title} (hash: ${releaseHash})`);
      }
    }

    // Insérer les nouvelles releases uniques
    if (releasesToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(releasesToInsert);

      if (insertError) {
        console.error('Error inserting new releases:', insertError);
        throw insertError;
      }

      console.log(`Successfully inserted ${releasesToInsert.length} unique new releases globally`);

      // ÉTAPE 4: Grouper les releases par utilisateur et envoyer UN email par utilisateur
      const releasesByUser = new Map<string, typeof uniqueReleases>();
      
      for (const release of uniqueReleases) {
        if (!releasesByUser.has(release.user_id)) {
          releasesByUser.set(release.user_id, []);
        }
        releasesByUser.get(release.user_id)!.push(release);
      }

      console.log(`Processing notifications for ${releasesByUser.size} unique users`);

      // ÉTAPE 5: Envoyer les notifications avec contrôles anti-spam
      for (const [userId, userReleases] of releasesByUser) {
        try {
          console.log(`Processing notifications for user: ${userId} (${userReleases.length} releases)`);
          
          // Vérifier le rate limiting
          const canSendEmail = await checkRateLimit(supabaseClient, userId);
          if (!canSendEmail) {
            console.log(`Rate limit exceeded for user ${userId}, skipping email notification`);
            continue;
          }

          // Récupérer les paramètres de notification
          let { data: settings, error: settingsError } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (settingsError && settingsError.code === 'PGRST116') {
            console.log(`No notification settings found for user ${userId}, creating default settings`);
            
            const { data: newSettings, error: createError } = await supabaseClient
              .from('notification_settings')
              .insert({
                user_id: userId,
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
          } else if (settingsError) {
            console.error('Error fetching notification settings:', settingsError);
            continue;
          }

          if (settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
            // Filtrer selon les préférences utilisateur
            const filteredReleases = userReleases.filter(release => 
              (release.type === 'artist' && settings.artist_notifications_enabled) ||
              (release.type === 'game' && settings.game_notifications_enabled)
            );

            if (filteredReleases.length > 0) {
              // Créer un hash pour ce groupe de releases
              const groupHash = createReleaseHash(userId, 'batch', 'digest', 
                filteredReleases.map(r => r.title).join('|'));

              // Vérifier si ce digest a déjà été envoyé
              const alreadySent = await hasEmailBeenSent(supabaseClient, userId, groupHash);
              
              if (!alreadySent) {
                console.log(`Sending digest email to user ${userId} for ${filteredReleases.length} releases`);
                
                // Envoyer UN seul email digest avec toutes les releases
                const { error: emailError } = await supabaseClient.functions.invoke('send-release-notification', {
                  body: { 
                    releases: filteredReleases, // Passer toutes les releases en une fois
                    userId: userId,
                    userSettings: settings,
                    isDigest: true,
                    groupHash: groupHash
                  }
                });

                if (emailError) {
                  console.error('Failed to send digest email notification:', emailError);
                } else {
                  console.log(`Digest email sent successfully for user ${userId}`);
                }
              } else {
                console.log(`Digest already sent for user ${userId}, skipping`);
              }
            } else {
              console.log(`No relevant releases for user ${userId} based on preferences`);
            }
          } else {
            console.log(`Email notifications disabled or not immediate for user ${userId}`);
          }
          
        } catch (emailError) {
          console.error(`Failed to process email notifications for user ${userId}:`, emailError);
        }
      }
    } else {
      console.log('No new unique releases found to process');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleasesFound: uniqueReleases.length,
        duplicatesFiltered: allNewReleases.length - uniqueReleases.length,
        cleanedExpiredNotifications: expiredNotifications?.length || 0,
        message: `Global automated check completed: found ${uniqueReleases.length} new unique releases, filtered ${allNewReleases.length - uniqueReleases.length} duplicates, cleaned ${expiredNotifications?.length || 0} expired notifications`,
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

async function checkSpotifyReleases(artist: Artist, supabaseClient: any) {
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
        // Créer le hash pour vérifier les doublons
        const releaseHash = createReleaseHash(artist.user_id, artist.id, 'artist', `${artist.name} - ${album.name}`);
        
        // Vérifier si cette release existe déjà
        const { data: existing } = await supabaseClient
          .from('new_releases')
          .select('id')
          .eq('unique_hash', releaseHash)
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
        const releaseHash = createReleaseHash(game.user_id, game.id, 'game', `${game.name} - Promotion`);
        
        const { data: existing } = await supabaseClient
          .from('new_releases')
          .select('id')
          .eq('unique_hash', releaseHash)
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
          const releaseHash = createReleaseHash(game.user_id, game.id, 'game', `${game.name} - ${recentAddition.name}`);
          
          const { data: existing } = await supabaseClient
            .from('new_releases')
            .select('id')
            .eq('unique_hash', releaseHash)
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
