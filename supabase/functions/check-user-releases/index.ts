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

// Fonction identique à celle de check-new-releases pour éviter les doublons
function createReleaseHash(userId: string, sourceItemId: string, type: string, title: string, releaseDate?: string): string {
  const cleanTitle = title.replace(/[^\w\s]/gi, '').toLowerCase().trim();
  const dateStr = releaseDate ? new Date(releaseDate).toISOString().split('T')[0] : '';
  const hashInput = `${userId}-${sourceItemId}-${type}-${cleanTitle}-${dateStr}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  return btoa(String.fromCharCode(...data)).replace(/[+=\/]/g, '').substring(0, 32);
}

// Fonction améliorée pour vérifier les duplicatas
async function isDuplicateRelease(supabaseClient: any, userId: string, sourceItemId: string, type: string, title: string, releaseDate?: string): Promise<boolean> {
  const releaseHash = createReleaseHash(userId, sourceItemId, type, title, releaseDate);
  
  // Vérifier d'abord par hash
  const { data: hashMatch } = await supabaseClient
    .from('new_releases')
    .select('id')
    .eq('unique_hash', releaseHash)
    .maybeSingle();

  if (hashMatch) {
    console.log(`USER-CHECK: Duplicate found by hash: ${title} (${releaseHash})`);
    return true;
  }

  // Vérification de sécurité par similarité de titre (dernières 24h)
  const { data: similarTitles } = await supabaseClient
    .from('new_releases')
    .select('id, title')
    .eq('user_id', userId)
    .eq('source_item_id', sourceItemId)
    .eq('type', type)
    .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (similarTitles && similarTitles.length > 0) {
    const cleanNewTitle = title.replace(/[^\w\s]/gi, '').toLowerCase().trim();
    
    for (const existing of similarTitles) {
      const cleanExistingTitle = existing.title.replace(/[^\w\s]/gi, '').toLowerCase().trim();
      
      if (cleanNewTitle === cleanExistingTitle || 
          cleanNewTitle.includes(cleanExistingTitle) || 
          cleanExistingTitle.includes(cleanNewTitle)) {
        console.log(`USER-CHECK: Duplicate found by similarity: "${title}" vs "${existing.title}"`);
        return true;
      }
    }
  }

  return false;
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

    console.log(`=== STARTING USER-SPECIFIC RELEASES CHECK for user: ${user.id} ===`);
    
    // ÉTAPE 1: Nettoyer les notifications expirées pour cet utilisateur
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
    }

    // ÉTAPE 2: Récupérer seulement les données de cet utilisateur
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

    const uniqueNewReleases = [];

    // ÉTAPE 3: Vérifier les artistes avec contrôle strict de duplicatas
    for (const artist of artists || []) {
      if (artist.spotify_id) {
        try {
          console.log(`USER-CHECK: Checking Spotify releases for ${artist.name}...`);
          const spotifyReleases = await checkSpotifyReleases(artist);
          
          for (const release of spotifyReleases) {
            const isDuplicate = await isDuplicateRelease(
              supabaseClient, 
              release.user_id, 
              release.source_item_id, 
              release.type, 
              release.title
            );
            
            if (!isDuplicate) {
              uniqueNewReleases.push(release);
              console.log(`✅ USER-CHECK: New unique release: ${release.title}`);
            } else {
              console.log(`⚠️ USER-CHECK: Duplicate filtered: ${release.title}`);
            }
          }
        } catch (error) {
          console.error(`Error checking Spotify releases for ${artist.name}:`, error);
        }
      }
    }

    // ÉTAPE 4: Vérifier les jeux avec contrôle strict de duplicatas  
    for (const game of games || []) {
      try {
        console.log(`USER-CHECK: Checking game releases for ${game.name}...`);
        const gameReleases = await checkGameReleases(game, supabaseClient);
        
        for (const release of gameReleases) {
          const isDuplicate = await isDuplicateRelease(
            supabaseClient, 
            release.user_id, 
            release.source_item_id, 
            release.type, 
            release.title
          );
          
          if (!isDuplicate) {
            uniqueNewReleases.push(release);
            console.log(`✅ USER-CHECK: New unique game release: ${release.title}`);
          } else {
            console.log(`⚠️ USER-CHECK: Duplicate game release filtered: ${release.title}`);
          }
        }
      } catch (error) {
        console.error(`Error checking game releases for ${game.name}:`, error);
      }
    }

    console.log(`=== USER-CHECK SUMMARY: Found ${uniqueNewReleases.length} unique new releases ===`);

    // ÉTAPE 5: Insérer les nouvelles releases uniques
    if (uniqueNewReleases.length > 0) {
      const releasesToInsert = uniqueNewReleases.map(release => ({
        ...release,
        unique_hash: createReleaseHash(release.user_id, release.source_item_id, release.type, release.title),
        detected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }));

      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(releasesToInsert);

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ USER-CHECK: Successfully inserted ${releasesToInsert.length} unique new releases for user ${user.id}`);

      // ÉTAPE 6: Envoyer les notifications email si configuré
      try {
        let { data: settings, error: settingsError } = await supabaseClient
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError || !settings) {
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
          } else {
            settings = newSettings;
          }
        }

        if (settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
          const filteredReleases = uniqueNewReleases.filter(release => 
            (release.type === 'artist' && settings.artist_notifications_enabled) ||
            (release.type === 'game' && settings.game_notifications_enabled)
          );

          if (filteredReleases.length > 0) {
            console.log(`USER-CHECK: Sending email notification to user ${user.id} for ${filteredReleases.length} releases`);
            
            const { error: emailError } = await supabaseClient.functions.invoke('send-release-notification', {
              body: { 
                releases: filteredReleases,
                userId: user.id,
                userSettings: settings,
                isDigest: true
              }
            });

            if (emailError) {
              console.error('Failed to send email notification:', emailError);
            } else {
              console.log(`✅ USER-CHECK: Email notification sent successfully for user ${user.id}`);
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to process email notification:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleasesFound: uniqueNewReleases.length,
        cleanedExpiredNotifications: expiredNotifications?.length || 0,
        message: `User-specific check completed: found ${uniqueNewReleases.length} new releases, cleaned ${expiredNotifications?.length || 0} expired notifications`,
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

    if (rawgApiKey) {
      console.log(`Checking RAWG API for ${game.name}`);
      try {
        const rawgData = await checkRAWGGameStatus(game, rawgApiKey, supabaseClient);
        if (rawgData.hasUpdate) {
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
    
    const currentStatus = gameData.coming_soon ? 'coming_soon' : 'released';
    const previousStatus = game.release_status || 'unknown';
    
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
    
    await supabaseClient
      .from('games')
      .update({ 
        release_status: isActuallyReleased ? 'released' : 'coming_soon',
        last_status_check: new Date().toISOString()
      })
      .eq('id', game.id);
    
    if (previousStatus !== 'released' && isActuallyReleased) {
      console.log(`CONFIRMED RELEASE detected for ${game.name}: ${previousStatus} -> released with date: ${gameData.release_date.date}`);
      return {
        hasUpdate: true,
        updateType: 'Sortie confirmée',
        description: `${game.name} est maintenant disponible sur Steam ! Date de sortie : ${gameData.release_date.date}`,
        image_url: gameData.header_image,
      };
    }

    if (gameData.price_overview && isActuallyReleased) {
      const currentPrice = gameData.price_overview.final_formatted;
      const currentDiscount = gameData.price_overview.discount_percent;
      
      if (currentDiscount >= 20) {
        console.log(`Promotion detected for ${game.name}: ${currentDiscount}% off`);
        return {
          hasUpdate: true,
          updateType: 'Promotion',
          description: `${game.name} est en promotion à ${currentDiscount}% de réduction ! Prix : ${currentPrice}`,
          image_url: gameData.header_image,
        };
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

    const previousStatus = game.release_status || 'unknown';
    
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
    
    await supabaseClient
      .from('games')
      .update({ 
        release_status: currentStatus,
        last_status_check: new Date().toISOString()
      })
      .eq('id', game.id);
    
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
