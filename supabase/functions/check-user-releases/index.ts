
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
    let requestBody = {};
    
    // Parse request body safely
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim() !== '') {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      requestBody = {};
    }

    const { artistId, userId, forceCheck = false } = requestBody;
    console.log(`=== CHECK USER RELEASES: Artist ${artistId || 'ALL'}, User ${userId || 'UNKNOWN'} ===`);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let artists = [];
    
    // Récupérer les artistes selon les paramètres
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
      // Récupérer tous les artistes avec limite
      const { data: allArtists, error: allArtistsError } = await supabaseClient
        .from('artists')
        .select('*')
        .limit(20); // Réduire la limite pour éviter les timeouts

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
    const processedArtists = [];

    for (const artist of artists) {
      try {
        console.log(`Processing: ${artist.name} (${artist.platform})`);
        let newReleases = [];

        // Vérification Spotify avec gestion d'erreur robuste
        if (artist.spotify_id) {
          try {
            console.log('Checking Spotify for:', artist.name);
            
            const { data: spotifyData, error: spotifyError } = await supabaseClient.functions.invoke('get-spotify-artist-info', {
              body: {
                query: artist.spotify_id,
                type: 'artist'
              }
            });

            if (!spotifyError && spotifyData?.releases && Array.isArray(spotifyData.releases)) {
              const twoWeeksAgo = new Date();
              twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

              const recentReleases = spotifyData.releases.filter((release) => {
                if (!release.release_date) return false;
                const releaseDate = new Date(release.release_date);
                return releaseDate > twoWeeksAgo;
              });

              console.log(`Found ${recentReleases.length} recent Spotify releases for ${artist.name}`);

              for (const release of recentReleases) {
                const uniqueHash = `spotify_${artist.id}_${release.id}`;
                
                // Vérifier si la sortie existe déjà
                const { data: existing } = await supabaseClient
                  .from('new_releases')
                  .select('id')
                  .eq('unique_hash', uniqueHash)
                  .maybeSingle();

                if (!existing) {
                  newReleases.push({
                    type: 'artist',
                    source_item_id: artist.id,
                    title: release.name,
                    description: `Nouvelle sortie ${release.album_type || 'single'}: ${release.name}`,
                    image_url: release.images?.[0]?.url || null,
                    platform_url: release.external_urls?.spotify || null,
                    detected_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    user_id: artist.user_id,
                    unique_hash: uniqueHash
                  });
                  console.log(`New Spotify release detected: ${release.name}`);
                }
              }
            }
          } catch (spotifyError) {
            console.error(`Spotify error for ${artist.name}:`, spotifyError);
            // Continue malgré l'erreur
          }
        }

        // Vérification SoundCloud avec gestion robuste
        const soundcloudUrl = artist.multiple_urls?.find((url) => 
          url.platform?.toLowerCase().includes('soundcloud')
        )?.url;

        if (soundcloudUrl) {
          try {
            console.log('Checking SoundCloud for:', artist.name);
            
            // Délai pour éviter le rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const { data: soundcloudData, error: soundcloudError } = await supabaseClient.functions.invoke('get-soundcloud-info', {
              body: {
                query: artist.name,
                artistUrl: soundcloudUrl,
                type: 'artist-releases',
                limit: 5
              }
            });

            if (!soundcloudError && soundcloudData?.releases && Array.isArray(soundcloudData.releases)) {
              const twoWeeksAgo = new Date();
              twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

              const recentReleases = soundcloudData.releases.filter((release) => {
                if (!release.created_at) return false;
                const releaseDate = new Date(release.created_at);
                return releaseDate > twoWeeksAgo;
              });

              console.log(`Found ${recentReleases.length} recent SoundCloud releases for ${artist.name}`);

              for (const release of recentReleases) {
                const uniqueHash = `soundcloud_${artist.id}_${release.id}`;
                
                const { data: existing } = await supabaseClient
                  .from('new_releases')
                  .select('id')
                  .eq('unique_hash', uniqueHash)
                  .maybeSingle();

                if (!existing) {
                  newReleases.push({
                    type: 'artist',
                    source_item_id: artist.id,
                    title: release.title,
                    description: `Nouvelle sortie SoundCloud: ${release.title}`,
                    image_url: release.artwork_url || null,
                    platform_url: release.permalink_url || null,
                    detected_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    user_id: artist.user_id,
                    unique_hash: uniqueHash
                  });
                  console.log(`New SoundCloud release detected: ${release.title}`);
                }
              }
            }
          } catch (soundcloudError) {
            console.error(`SoundCloud error for ${artist.name}:`, soundcloudError);
            // Continue malgré l'erreur
          }
        }

        // Insérer les nouvelles sorties si trouvées
        if (newReleases.length > 0) {
          const { error: insertError } = await supabaseClient
            .from('new_releases')
            .insert(newReleases);

          if (insertError) {
            console.error('Insert error:', insertError);
          } else {
            totalNewReleases += newReleases.length;
            console.log(`Inserted ${newReleases.length} new releases for ${artist.name}`);

            // Envoyer les notifications par email
            try {
              await supabaseClient.functions.invoke('send-release-notification', {
                body: {
                  userId: artist.user_id,
                  releases: newReleases,
                  userSettings: {},
                  isDigest: newReleases.length > 1
                }
              });
              console.log(`Notification sent for ${artist.name}`);
            } catch (notifError) {
              console.error('Notification error:', notifError);
            }
          }
        }

        processedArtists.push(artist.name);
        
        // Délai entre chaque artiste pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (artistError) {
        console.error(`Error processing ${artist.name}:`, artistError);
        continue;
      }
    }

    console.log(`=== COMPLETED: ${totalNewReleases} new releases found for ${processedArtists.length} artists ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleases: totalNewReleases,
        processedArtists: processedArtists.length,
        artistsProcessed: processedArtists,
        message: `Processed ${processedArtists.length} artists, found ${totalNewReleases} new releases`
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
