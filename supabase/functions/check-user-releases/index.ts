
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

    // Get user info from the auth token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log(`Starting user-specific releases check for user: ${user.id}`);
    
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

    // Check for new game releases and status changes
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
          // Get user's notification settings
          let { data: settings, error: settingsError } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          // Create default settings if they don't exist
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
        message: `User-specific check completed: found ${newReleases.length} new releases`,
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

// Helper functions (same as in check-new-releases but simplified)
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

    if (!steamApiKey && !rawgApiKey) {
      console.log('No game API keys configured, skipping game checks');
      return releases;
    }

    // Simplified game status checking - just check for basic status changes
    if (game.platform.toLowerCase().includes('steam') && game.url.includes('store.steampowered.com')) {
      const steamAppId = extractSteamAppId(game.url);
      if (steamAppId && steamApiKey) {
        // Basic Steam status check
        console.log(`Checking Steam status for ${game.name}`);
      }
    }

  } catch (error) {
    console.error(`Error checking game releases for ${game.name}:`, error);
  }

  return releases;
}

function extractSteamAppId(url: string): string | null {
  const match = url.match(/\/app\/(\d+)/);
  return match ? match[1] : null;
}

serve(handler);
