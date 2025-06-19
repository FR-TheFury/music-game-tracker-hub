
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
    let requestBody;
    const bodyText = await req.text();
    
    if (!bodyText || bodyText.trim() === '') {
      console.log('Empty request body received');
      requestBody = {};
    } else {
      try {
        requestBody = JSON.parse(bodyText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Invalid JSON in request body',
            success: false 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    const { artistId, userId, forceCheck = false } = requestBody;
    console.log(`=== CHECK USER RELEASES: Artist ${artistId || 'ALL'}, User ${userId || 'UNKNOWN'} ===`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let artists = [];
    
    if (artistId) {
      const { data: artist, error: artistError } = await supabaseClient
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .single();

      if (artistError || !artist) {
        console.error('Artist not found:', artistId);
        return new Response(
          JSON.stringify({ 
            error: 'Artist not found',
            success: false 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      artists = [artist];
    } else if (userId) {
      const { data: userArtists, error: artistsError } = await supabaseClient
        .from('artists')
        .select('*')
        .eq('user_id', userId);

      if (artistsError) {
        console.error('Error fetching user artists:', artistsError);
        throw new Error('Error fetching user artists');
      }
      artists = userArtists || [];
    } else {
      // Si aucun paramètre spécifique, récupérer tous les artistes
      const { data: allArtists, error: allArtistsError } = await supabaseClient
        .from('artists')
        .select('*')
        .limit(50); // Limiter pour éviter les timeouts

      if (allArtistsError) {
        console.error('Error fetching all artists:', allArtistsError);
        throw new Error('Error fetching artists');
      }
      artists = allArtists || [];
    }

    if (artists.length === 0) {
      console.log('No artists found to check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No artists to check',
          newReleases: 0,
          processedArtists: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let totalNewReleases = 0;

    for (const artist of artists) {
      try {
        console.log(`Processing: ${artist.name} (${artist.platform})`);
        let newReleases = [];

        // Vérification Spotify
        if (artist.spotify_id) {
          try {
            console.log('Checking Spotify for:', artist.name);
            const { data: spotifyData, error: spotifyError } = await supabaseClient.functions.invoke('get-spotify-artist-info', {
              body: {
                query: artist.spotify_id,
                type: 'artist'
              }
            });

            if (!spotifyError && spotifyData?.releases) {
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

              const recentReleases = spotifyData.releases.filter((release: any) => {
                if (!release.release_date) return false;
                const releaseDate = new Date(release.release_date);
                return releaseDate > oneWeekAgo;
              });

              for (const release of recentReleases) {
                const { data: existing } = await supabaseClient
                  .from('new_releases')
                  .select('id')
                  .eq('source_item_id', artist.id)
                  .eq('platform_url', release.external_urls?.spotify)
                  .maybeSingle();

                if (!existing) {
                  newReleases.push({
                    type: 'artist',
                    source_item_id: artist.id,
                    title: release.name,
                    description: `Nouvelle sortie ${release.album_type}: ${release.name}`,
                    image_url: release.images?.[0]?.url,
                    platform_url: release.external_urls?.spotify,
                    detected_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    user_id: artist.user_id,
                    unique_hash: `spotify_${artist.id}_${release.id}`
                  });
                  console.log(`New Spotify release: ${release.name}`);
                }
              }
            }
          } catch (spotifyError) {
            console.error(`Spotify error for ${artist.name}:`, spotifyError);
          }
        }

        // Vérification SoundCloud (avec gestion robuste du rate limiting)
        const soundcloudUrl = artist.multiple_urls?.find((url: any) => 
          url.platform?.toLowerCase().includes('soundcloud')
        )?.url;

        if (soundcloudUrl) {
          try {
            console.log('Checking SoundCloud for:', artist.name);
            const { data: soundcloudData, error: soundcloudError } = await supabaseClient.functions.invoke('get-soundcloud-info', {
              body: {
                query: artist.name,
                artistUrl: soundcloudUrl,
                type: 'artist-releases',
                limit: 10
              }
            });

            if (!soundcloudError && soundcloudData?.releases) {
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

              const recentReleases = soundcloudData.releases.filter((release: any) => {
                const releaseDate = new Date(release.created_at);
                return releaseDate > oneWeekAgo;
              });

              for (const release of recentReleases) {
                const { data: existing } = await supabaseClient
                  .from('new_releases')
                  .select('id')
                  .eq('source_item_id', artist.id)
                  .eq('platform_url', release.permalink_url)
                  .maybeSingle();

                if (!existing) {
                  newReleases.push({
                    type: 'artist',
                    source_item_id: artist.id,
                    title: release.title,
                    description: `Nouvelle sortie SoundCloud: ${release.title}`,
                    image_url: release.artwork_url,
                    platform_url: release.permalink_url,
                    detected_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    user_id: artist.user_id,
                    unique_hash: `soundcloud_${artist.id}_${release.id}`
                  });
                  console.log(`New SoundCloud release: ${release.title}`);
                }
              }
            }
          } catch (soundcloudError) {
            console.error(`SoundCloud error for ${artist.name}:`, soundcloudError);
            // Continue même en cas d'erreur SoundCloud
          }
        }

        if (newReleases.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('new_releases')
            .insert(newReleases);

          if (insertError) {
            console.error('Insert error:', insertError);
          } else {
            totalNewReleases += newReleases.length;
            console.log(`Inserted ${newReleases.length} new releases for ${artist.name}`);

            // Envoi des notifications
            for (const release of newReleases) {
              try {
                await supabaseClient.functions.invoke('send-release-notification', {
                  body: {
                    userId: artist.user_id,
                    release: {
                      type: release.type,
                      title: release.title,
                      description: release.description,
                      image_url: release.image_url,
                      platform_url: release.platform_url
                    },
                    userSettings: {}
                  }
                });
              } catch (notifError) {
                console.error('Notification error:', notifError);
                // Continue même si la notification échoue
              }
            }
          }
        }

        // Délai pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (artistError) {
        console.error(`Error processing ${artist.name}:`, artistError);
        continue;
      }
    }

    console.log(`=== COMPLETED: ${totalNewReleases} new releases found ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleases: totalNewReleases,
        processedArtists: artists.length,
        message: `Processed ${artists.length} artists, found ${totalNewReleases} new releases`
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
