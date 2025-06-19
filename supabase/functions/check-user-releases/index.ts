
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
    const { artistId, userId, forceCheck = false } = await req.json();
    console.log(`=== CHECK USER RELEASES: Artist ${artistId}, User ${userId} ===`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Récupérer les infos de l'artiste
    const { data: artist, error: artistError } = await supabaseClient
      .from('artists')
      .select('*')
      .eq('id', artistId)
      .single();

    if (artistError || !artist) {
      console.error('Artist not found:', artistId);
      throw new Error('Artist not found');
    }

    console.log(`Checking releases for: ${artist.name} (${artist.platform})`);

    let newReleases = [];

    // 2. Vérifier Spotify si disponible
    if (artist.spotify_id) {
      try {
        console.log('Checking Spotify releases...');
        const { data: spotifyData, error: spotifyError } = await supabaseClient.functions.invoke('get-spotify-artist-info', {
          body: {
            query: artist.spotify_id,
            type: 'artist'
          }
        });

        if (!spotifyError && spotifyData?.releases) {
          const recentReleases = spotifyData.releases.filter((release: any) => {
            if (!release.release_date) return false;
            const releaseDate = new Date(release.release_date);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return releaseDate > oneWeekAgo;
          });

          for (const release of recentReleases) {
            // Créer un hash unique pour éviter les doublons
            const releaseHash = `spotify_${artist.id}_${release.id}`;
            
            // Vérifier si cette sortie existe déjà
            const { data: existing } = await supabaseClient
              .from('new_releases')
              .select('id')
              .eq('source_item_id', artist.id)
              .eq('platform_url', release.external_urls?.spotify)
              .single();

            if (!existing) {
              const newRelease = {
                type: 'artist',
                source_item_id: artist.id,
                title: release.name,
                description: `Nouvelle sortie ${release.album_type}: ${release.name}`,
                image_url: release.images?.[0]?.url,
                platform_url: release.external_urls?.spotify,
                detected_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
                user_id: userId,
                unique_hash: releaseHash
              };

              newReleases.push(newRelease);
              console.log(`New Spotify release found: ${release.name}`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking Spotify:', error);
      }
    }

    // 3. Vérifier SoundCloud si disponible
    const soundcloudUrl = artist.multiple_urls?.find((url: any) => 
      url.platform?.toLowerCase().includes('soundcloud')
    )?.url;

    if (soundcloudUrl) {
      try {
        console.log('Checking SoundCloud releases...');
        const { data: soundcloudData, error: soundcloudError } = await supabaseClient.functions.invoke('get-soundcloud-info', {
          body: {
            query: artist.name,
            artistUrl: soundcloudUrl,
            type: 'artist-releases',
            limit: 10
          }
        });

        if (!soundcloudError && soundcloudData?.releases) {
          const recentReleases = soundcloudData.releases.filter((release: any) => {
            const releaseDate = new Date(release.created_at);
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return releaseDate > oneWeekAgo;
          });

          for (const release of recentReleases) {
            const releaseHash = `soundcloud_${artist.id}_${release.id}`;
            
            const { data: existing } = await supabaseClient
              .from('new_releases')
              .select('id')
              .eq('source_item_id', artist.id)
              .eq('platform_url', release.permalink_url)
              .single();

            if (!existing) {
              const newRelease = {
                type: 'artist',
                source_item_id: artist.id,
                title: release.title,
                description: `Nouvelle sortie SoundCloud: ${release.title}`,
                image_url: release.artwork_url,
                platform_url: release.permalink_url,
                detected_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                user_id: userId,
                unique_hash: releaseHash
              };

              newReleases.push(newRelease);
              console.log(`New SoundCloud release found: ${release.title}`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking SoundCloud:', error);
      }
    }

    // 4. Insérer les nouvelles sorties
    if (newReleases.length > 0) {
      console.log(`Inserting ${newReleases.length} new releases...`);
      
      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(newReleases);

      if (insertError) {
        console.error('Error inserting new releases:', insertError);
        throw insertError;
      }

      // 5. Envoyer les notifications
      for (const release of newReleases) {
        try {
          await supabaseClient.functions.invoke('send-release-notification', {
            body: {
              userId: userId,
              artistName: artist.name,
              releaseTitle: release.title,
              releaseUrl: release.platform_url,
              releaseImage: release.image_url
            }
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
        }
      }
    }

    console.log(`=== COMPLETED: Found ${newReleases.length} new releases for ${artist.name} ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleases: newReleases.length,
        artistName: artist.name 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-user-releases function:', error);
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
