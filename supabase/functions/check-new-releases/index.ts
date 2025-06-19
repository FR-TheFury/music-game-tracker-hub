
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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting automated new releases check...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all artists and games from all users
    const { data: artists, error: artistsError } = await supabaseClient
      .from('artists')
      .select('*');

    const { data: games, error: gamesError } = await supabaseClient
      .from('games')
      .select('*');

    if (artistsError || gamesError) {
      throw new Error(`Failed to fetch data: ${artistsError?.message || gamesError?.message}`);
    }

    console.log(`Found ${artists?.length || 0} artists and ${games?.length || 0} games to check`);

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

    // Check for new game releases using Steam and RAWG APIs
    for (const game of games || []) {
      try {
        const gameReleases = await checkGameReleases(game);
        newReleases.push(...gameReleases);
      } catch (error) {
        console.error(`Error checking game releases for ${game.name}:`, error);
      }
    }

    console.log(`Found ${newReleases.length} new releases to process`);

    // Insert new releases
    if (newReleases.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(newReleases);

      if (insertError) {
        throw insertError;
      }

      console.log(`Successfully inserted ${newReleases.length} new releases`);

      // Send email notifications for users with notifications enabled
      for (const release of newReleases) {
        try {
          // Get user's notification settings
          const { data: settings } = await supabaseClient
            .from('notification_settings')
            .select('*')
            .eq('user_id', release.user_id)
            .single();

          // Get user's email from auth.users
          const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(release.user_id);
          
          if (user && settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
            console.log(`Sending email notification to ${user.email} for release: ${release.title}`);
            
            // Call the email sending function
            const { error: emailError } = await supabaseClient.functions.invoke('send-release-notification', {
              body: { 
                release, 
                userEmail: user.email,
                userSettings: settings 
              }
            });

            if (emailError) {
              console.error('Failed to send email notification:', emailError);
            } else {
              console.log(`Email sent successfully to ${user.email}`);
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
        message: `Automated check completed: found ${newReleases.length} new releases`,
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
    console.error('Error in automated check-new-releases function:', error);
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
    // Get Spotify access token
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

    // Get artist's latest albums (last 30 days)
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
      
      // Check if the release is from the last 30 days
      if (releaseDate >= thirtyDaysAgo) {
        // Check if we already have this release
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

async function checkGameReleases(game: Game) {
  const releases = [];
  
  try {
    const steamApiKey = Deno.env.get('STEAM_WEB_API_KEY');
    const rawgApiKey = Deno.env.get('RAWG_API_KEY');

    if (!steamApiKey && !rawgApiKey) {
      console.log('No game API keys configured, skipping game checks');
      return releases;
    }

    // Extract Steam App ID from URL if it's a Steam game
    if (game.platform.toLowerCase().includes('steam') && game.url.includes('store.steampowered.com')) {
      const steamAppId = extractSteamAppId(game.url);
      if (steamAppId && steamApiKey) {
        const steamReleases = await checkSteamUpdates(game, steamAppId, steamApiKey);
        releases.push(...steamReleases);
      }
    }

    // Use RAWG API for general game information and updates
    if (rawgApiKey) {
      const rawgReleases = await checkRAWGUpdates(game, rawgApiKey);
      releases.push(...rawgReleases);
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

async function checkSteamUpdates(game: Game, appId: string, apiKey: string) {
  const releases = [];
  
  try {
    // Get app details from Steam API
    const appDetailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`);
    
    if (!appDetailsResponse.ok) {
      throw new Error(`Steam API error: ${appDetailsResponse.status}`);
    }

    const appDetailsData = await appDetailsResponse.json();
    const appData = appDetailsData[appId];

    if (!appData?.success) {
      console.log(`No Steam data found for app ${appId}`);
      return releases;
    }

    const gameData = appData.data;
    
    // Check for recent updates (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Get Steam news for the app to check for updates
    const newsResponse = await fetch(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=10&maxlength=300&format=json`);
    
    if (newsResponse.ok) {
      const newsData = await newsResponse.json();
      
      for (const newsItem of newsData.appnews?.newsitems || []) {
        const newsDate = new Date(newsItem.date * 1000);
        
        if (newsDate >= thirtyDaysAgo && 
            (newsItem.title.toLowerCase().includes('update') || 
             newsItem.title.toLowerCase().includes('patch') ||
             newsItem.title.toLowerCase().includes('hotfix'))) {
          
          // Check if we already have this update
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          const { data: existing } = await supabaseClient
            .from('new_releases')
            .select('id')
            .eq('source_item_id', game.id)
            .eq('type', 'game')
            .eq('user_id', game.user_id)
            .ilike('title', `%${newsItem.title}%`)
            .maybeSingle();

          if (!existing) {
            releases.push({
              type: 'game' as const,
              source_item_id: game.id,
              title: `🎮 ${game.name} - ${newsItem.title}`,
              description: `Mise à jour détectée le ${newsDate.toLocaleDateString('fr-FR')} sur Steam`,
              image_url: gameData.header_image,
              platform_url: newsItem.url || game.url,
              user_id: game.user_id,
            });
          }
        }
      }
    }

  } catch (error) {
    console.error(`Error checking Steam updates for ${game.name}:`, error);
  }

  return releases;
}

async function checkRAWGUpdates(game: Game, apiKey: string) {
  const releases = [];
  
  try {
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
      console.log(`No RAWG match found for game: ${game.name}`);
      return releases;
    }

    // Get detailed game information
    const gameDetailsResponse = await fetch(`https://api.rawg.io/api/games/${gameMatch.id}?key=${apiKey}`);
    
    if (!gameDetailsResponse.ok) {
      return releases;
    }

    const gameDetails = await gameDetailsResponse.json();
    
    // Check for recent DLC or additions
    const additionsResponse = await fetch(`https://api.rawg.io/api/games/${gameMatch.id}/additions?key=${apiKey}`);
    
    if (additionsResponse.ok) {
      const additionsData = await additionsResponse.json();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      for (const addition of additionsData.results || []) {
        const releaseDate = addition.released ? new Date(addition.released) : null;
        
        if (releaseDate && releaseDate >= thirtyDaysAgo) {
          // Check if we already have this DLC/addition
          const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          const { data: existing } = await supabaseClient
            .from('new_releases')
            .select('id')
            .eq('source_item_id', game.id)
            .eq('type', 'game')
            .eq('user_id', game.user_id)
            .ilike('title', `%${addition.name}%`)
            .maybeSingle();

          if (!existing) {
            releases.push({
              type: 'game' as const,
              source_item_id: game.id,
              title: `🎮 ${game.name} - ${addition.name}`,
              description: `Nouveau DLC/Extension sorti le ${releaseDate.toLocaleDateString('fr-FR')}`,
              image_url: addition.background_image || gameDetails.background_image,
              platform_url: game.url,
              user_id: game.user_id,
            });
          }
        }
      }
    }

  } catch (error) {
    console.error(`Error checking RAWG updates for ${game.name}:`, error);
  }

  return releases;
}

serve(handler);
