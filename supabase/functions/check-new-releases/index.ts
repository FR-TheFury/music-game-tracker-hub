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

// Fonction améliorée pour créer un hash unique
function createReleaseHash(userId: string, sourceItemId: string, type: string, title: string, releaseDate?: string): string {
  // Nettoyer le titre de tous les caractères spéciaux et emojis
  const cleanTitle = title.replace(/[^\w\s]/gi, '').toLowerCase().trim();
  // Inclure la date de sortie si disponible pour éviter les doublons de releases avec le même nom
  const dateStr = releaseDate ? new Date(releaseDate).toISOString().split('T')[0] : '';
  const hashInput = `${userId}-${sourceItemId}-${type}-${cleanTitle}-${dateStr}`;
  
  // Utiliser un hash plus robuste
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
    console.log(`Duplicate found by hash: ${title} (${releaseHash})`);
    return true;
  }

  // Vérification de sécurité par similarité de titre
  const { data: similarTitles } = await supabaseClient
    .from('new_releases')
    .select('id, title')
    .eq('user_id', userId)
    .eq('source_item_id', sourceItemId)
    .eq('type', type)
    .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Dernières 24h

  if (similarTitles && similarTitles.length > 0) {
    const cleanNewTitle = title.replace(/[^\w\s]/gi, '').toLowerCase().trim();
    
    for (const existing of similarTitles) {
      const cleanExistingTitle = existing.title.replace(/[^\w\s]/gi, '').toLowerCase().trim();
      
      // Calculer la similitude (simple comparaison)
      if (cleanNewTitle === cleanExistingTitle || 
          cleanNewTitle.includes(cleanExistingTitle) || 
          cleanExistingTitle.includes(cleanNewTitle)) {
        console.log(`Duplicate found by similarity: "${title}" vs "${existing.title}"`);
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
    console.log('=== STARTING GLOBAL AUTOMATED RELEASES CHECK ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ÉTAPE 1: Nettoyer les notifications expirées
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
      }
    }

    // ÉTAPE 2: Récupérer les données avec limite de fréquence
    const { data: artists, error: artistsError } = await supabaseClient
      .from('artists')
      .select('*')
      .or(`last_updated.is.null,last_updated.lt.${new Date(Date.now() - 30 * 60 * 1000).toISOString()}`); // Seulement si pas mis à jour dans les 30 dernières minutes

    const { data: games, error: gamesError } = await supabaseClient
      .from('games')
      .select('*')
      .or(`last_status_check.is.null,last_status_check.lt.${new Date(Date.now() - 30 * 60 * 1000).toISOString()}`); // Seulement si pas vérifié dans les 30 dernières minutes

    if (artistsError || gamesError) {
      throw new Error(`Failed to fetch data: ${artistsError?.message || gamesError?.message}`);
    }

    console.log(`Found ${artists?.length || 0} artists and ${games?.length || 0} games to check`);

    const uniqueNewReleases = [];

    // ÉTAPE 3: Vérifier les artistes avec contrôle de duplicatas
    for (const artist of artists || []) {
      if (artist.spotify_id) {
        try {
          console.log(`Checking Spotify releases for ${artist.name}...`);
          const spotifyReleases = await checkSpotifyReleases(artist, supabaseClient);
          
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
              console.log(`✅ New unique release: ${release.title}`);
            } else {
              console.log(`⚠️ Duplicate filtered: ${release.title}`);
            }
          }
        } catch (error) {
          console.error(`Error checking Spotify releases for ${artist.name}:`, error);
        }
      }
    }

    // ÉTAPE 4: Vérifier les jeux avec contrôle de duplicatas
    for (const game of games || []) {
      try {
        console.log(`Checking game releases for ${game.name}...`);
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
            console.log(`✅ New unique game release: ${release.title}`);
          } else {
            console.log(`⚠️ Duplicate game release filtered: ${release.title}`);
          }
        }
      } catch (error) {
        console.error(`Error checking game releases for ${game.name}:`, error);
      }
    }

    console.log(`=== SUMMARY: Found ${uniqueNewReleases.length} unique new releases ===`);

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
        console.error('Error inserting new releases:', insertError);
        throw insertError;
      }

      console.log(`✅ Successfully inserted ${releasesToInsert.length} unique new releases`);

      // ÉTAPE 6: Envoyer les notifications (groupées par utilisateur)
      const releasesByUser = new Map<string, typeof uniqueNewReleases>();
      
      for (const release of uniqueNewReleases) {
        if (!releasesByUser.has(release.user_id)) {
          releasesByUser.set(release.user_id, []);
        }
        releasesByUser.get(release.user_id)!.push(release);
      }

      for (const [userId, userReleases] of releasesByUser) {
        try {
          // Récupérer les paramètres de notification
          let { data: settings } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!settings) {
            const { data: newSettings } = await supabaseClient
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
            settings = newSettings;
          }

          if (settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
            const filteredReleases = userReleases.filter(release => 
              (release.type === 'artist' && settings.artist_notifications_enabled) ||
              (release.type === 'game' && settings.game_notifications_enabled)
            );

            if (filteredReleases.length > 0) {
              console.log(`Sending digest email to user ${userId} for ${filteredReleases.length} releases`);
              
              const { error: emailError } = await supabaseClient.functions.invoke('send-release-notification', {
                body: { 
                  releases: filteredReleases,
                  userId: userId,
                  userSettings: settings,
                  isDigest: true
                }
              });

              if (emailError) {
                console.error('Failed to send digest email notification:', emailError);
              } else {
                console.log(`✅ Digest email sent successfully for user ${userId}`);
              }
            }
          }
        } catch (emailError) {
          console.error(`Failed to process email notifications for user ${userId}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleasesFound: uniqueNewReleases.length,
        cleanedExpiredNotifications: expiredNotifications?.length || 0,
        message: `Global check completed: ${uniqueNewReleases.length} new unique releases found`,
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
    console.error('Error in global check-new-releases function:', error);
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

    // Mettre à jour le timestamp de dernière vérification
    await supabaseClient
      .from('artists')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', artist.id);

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

    // Steam checks
    if (game.platform.toLowerCase().includes('steam') && steamApiKey) {
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

    // RAWG checks
    if (rawgApiKey) {
      try {
        const rawgData = await checkRAWGStatus(game, rawgApiKey, supabaseClient);
        if (rawgData.release) {
          releases.push(rawgData.release);
        }
      } catch (rawgError) {
        console.error(`RAWG API error for ${game.name}:`, rawgError);
      }
    }

    // Mettre à jour le timestamp de dernière vérification
    await supabaseClient
      .from('games')
      .update({ last_status_check: new Date().toISOString() })
      .eq('id', game.id);

  } catch (error) {
    console.error(`Error checking game releases for ${game.name}:`, error);
  }

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
      return { release };
    }

    const gameData = appData.data;
    const previousStatus = game.release_status || 'unknown';
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

    // Vérifier les promotions (seulement si pas de release)
    if (gameData.price_overview && !release) {
      const currentDiscount = gameData.price_overview.discount_percent;
      
      if (currentDiscount >= 20) {
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
      return { release };
    }

    const previousStatus = game.release_status || 'unknown';
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

  } catch (error) {
    console.error(`Error checking RAWG status for ${game.name}:`, error);
  }

  return { release };
}

serve(handler);
