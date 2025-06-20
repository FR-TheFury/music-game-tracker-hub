
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
    console.log('=== UPDATE ARTIST STATS STARTED ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestBody = {};
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim() !== '') {
        requestBody = JSON.parse(bodyText);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      requestBody = {};
    }

    const { artistId, userId, batchSize = 10 } = requestBody;

    // Récupérer les artistes à mettre à jour
    let query = supabaseClient
      .from('artists')
      .select('*')
      .or('last_stats_update.is.null,last_stats_update.lt.' + new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(batchSize);

    if (artistId) {
      query = supabaseClient.from('artists').select('*').eq('id', artistId);
    } else if (userId) {
      query = supabaseClient.from('artists').select('*').eq('user_id', userId).limit(batchSize);
    }

    const { data: artists, error: artistsError } = await query;

    if (artistsError) {
      console.error('Error fetching artists:', artistsError);
      throw new Error('Error fetching artists');
    }

    if (!artists || artists.length === 0) {
      console.log('No artists to update');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No artists to update',
          updatedArtists: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let updatedCount = 0;
    const updatePromises = [];

    for (const artist of artists) {
      const updatePromise = updateArtistStats(supabaseClient, artist);
      updatePromises.push(updatePromise);
      
      // Délai entre chaque mise à jour pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const results = await Promise.allSettled(updatePromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        updatedCount++;
        console.log(`Updated stats for ${artists[index].name}`);
      } else {
        console.error(`Failed to update ${artists[index].name}:`, result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    });

    console.log(`=== UPDATE COMPLETED: ${updatedCount}/${artists.length} artists updated ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedArtists: updatedCount,
        totalProcessed: artists.length,
        message: `Updated ${updatedCount} out of ${artists.length} artists`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in update-artist-stats function:', error);
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

async function updateArtistStats(supabaseClient: any, artist: any): Promise<boolean> {
  try {
    console.log(`Updating stats for: ${artist.name} (${artist.platform})`);
    
    const updates: any = {
      last_stats_update: new Date().toISOString()
    };

    // Mise à jour Spotify
    if (artist.spotify_id) {
      try {
        console.log('Updating Spotify stats for:', artist.name);
        
        const { data: spotifyData, error: spotifyError } = await supabaseClient.functions.invoke('get-spotify-artist-info', {
          body: {
            query: artist.spotify_id,
            type: 'artist'
          }
        });

        if (!spotifyError && spotifyData?.artist) {
          const spotifyArtist = spotifyData.artist;
          updates.followers_count = spotifyArtist.followers?.total || artist.followers_count;
          updates.popularity = spotifyArtist.popularity || artist.popularity;
          updates.profile_image_url = spotifyArtist.images?.[0]?.url || artist.profile_image_url;
          updates.genres = spotifyArtist.genres || artist.genres;
          
          console.log(`Spotify stats updated: ${spotifyArtist.followers?.total} followers, ${spotifyArtist.popularity} popularity`);
        }
      } catch (spotifyError) {
        console.error(`Spotify error for ${artist.name}:`, spotifyError);
      }
    }

    // Mise à jour SoundCloud
    const soundcloudUrl = artist.multiple_urls?.find((url: any) => 
      url.platform?.toLowerCase().includes('soundcloud')
    )?.url;

    if (soundcloudUrl) {
      try {
        console.log('Updating SoundCloud stats for:', artist.name);
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
        
        const { data: soundcloudData, error: soundcloudError } = await supabaseClient.functions.invoke('get-soundcloud-info', {
          body: {
            artistUrl: soundcloudUrl,
            type: 'artist-info'
          }
        });

        if (!soundcloudError && soundcloudData?.artist) {
          const soundcloudArtist = soundcloudData.artist;
          // Mettre à jour avec les stats SoundCloud si plus élevées
          if (soundcloudArtist.followers_count > (updates.followers_count || 0)) {
            updates.followers_count = soundcloudArtist.followers_count;
          }
          updates.total_plays = soundcloudArtist.track_count || artist.total_plays;
          
          console.log(`SoundCloud stats updated: ${soundcloudArtist.followers_count} followers`);
        }
      } catch (soundcloudError) {
        console.error(`SoundCloud error for ${artist.name}:`, soundcloudError);
      }
    }

    // Mise à jour Deezer
    if (artist.deezer_id) {
      try {
        console.log('Updating Deezer stats for:', artist.name);
        
        const { data: deezerData, error: deezerError } = await supabaseClient.functions.invoke('get-deezer-artist-info', {
          body: {
            artistId: artist.deezer_id.toString()
          }
        });

        if (!deezerError && deezerData) {
          // Mettre à jour avec les stats Deezer si plus élevées
          if (deezerData.nb_fan > (updates.followers_count || 0)) {
            updates.followers_count = deezerData.nb_fan;
          }
          
          console.log(`Deezer stats updated: ${deezerData.nb_fan} fans`);
        }
      } catch (deezerError) {
        console.error(`Deezer error for ${artist.name}:`, deezerError);
      }
    }

    // Mise à jour YouTube
    const youtubeUrl = artist.multiple_urls?.find((url: any) => 
      url.platform?.toLowerCase().includes('youtube')
    )?.url;

    if (youtubeUrl) {
      try {
        console.log('Updating YouTube stats for:', artist.name);
        
        const channelId = extractYouTubeChannelId(youtubeUrl);
        if (channelId) {
          const { data: youtubeData, error: youtubeError } = await supabaseClient.functions.invoke('get-youtube-info', {
            body: {
              channelId: channelId,
              type: 'artist'
            }
          });

          if (!youtubeError && youtubeData?.statistics) {
            const subscriberCount = parseInt(youtubeData.statistics.subscriberCount) || 0;
            if (subscriberCount > (updates.followers_count || 0)) {
              updates.followers_count = subscriberCount;
            }
            
            console.log(`YouTube stats updated: ${subscriberCount} subscribers`);
          }
        }
      } catch (youtubeError) {
        console.error(`YouTube error for ${artist.name}:`, youtubeError);
      }
    }

    // Sauvegarder les mises à jour dans la base de données
    const { error: updateError } = await supabaseClient
      .from('artists')
      .update(updates)
      .eq('id', artist.id);

    if (updateError) {
      console.error('Error updating artist:', updateError);
      return false;
    }

    console.log(`Successfully updated stats for ${artist.name}`);
    return true;

  } catch (error) {
    console.error(`Error updating artist ${artist.name}:`, error);
    return false;
  }
}

function extractYouTubeChannelId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    if (pathname.includes('/channel/')) {
      return pathname.split('/channel/')[1];
    } else if (pathname.includes('/c/') || pathname.includes('/user/')) {
      // Pour les URLs avec /c/ ou /user/, on retourne l'URL complète
      // L'API YouTube pourra la gérer
      return url;
    }
    
    return null;
  } catch {
    return null;
  }
}

serve(handler);
