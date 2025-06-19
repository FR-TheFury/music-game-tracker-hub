
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

    // Check for new game releases (simulé)
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
  
  // Simuler des mises à jour de jeux (2% de chance pour éviter le spam)
  // Dans un vrai système, on intégrerait Steam API, Epic Games API, etc.
  if (Math.random() < 0.02) {
    const updateTypes = ['Mise à jour majeure', 'DLC', 'Patch', 'Extension'];
    const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
    
    releases.push({
      type: 'game' as const,
      source_item_id: game.id,
      title: `🎮 ${game.name} - ${randomType}`,
      description: `${randomType} disponible sur ${game.platform}`,
      platform_url: game.url,
      user_id: game.user_id,
    });
  }

  return releases;
}

serve(handler);
