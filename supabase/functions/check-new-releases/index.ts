
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
    console.log('=== CHECK NEW RELEASES STARTED ===');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Récupérer tous les artistes avec leurs utilisateurs
    console.log('Fetching all artists...');
    const { data: artists, error: artistsError } = await supabaseClient
      .from('artists')
      .select(`
        id,
        name,
        platform,
        url,
        spotify_id,
        user_id,
        multiple_urls,
        profile_image_url
      `);

    if (artistsError) {
      console.error('Error fetching artists:', artistsError);
      throw artistsError;
    }

    console.log(`Found ${artists?.length || 0} artists to check`);

    if (!artists || artists.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No artists to check',
          processed: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    let processedCount = 0;
    let newReleasesCount = 0;

    // 2. Vérifier chaque artiste
    for (const artist of artists) {
      try {
        console.log(`Checking releases for artist: ${artist.name} (${artist.platform})`);
        
        // Appeler la fonction check-user-releases pour cet artiste spécifique
        const { data: result, error: checkError } = await supabaseClient.functions.invoke('check-user-releases', {
          body: { 
            artistId: artist.id,
            userId: artist.user_id,
            forceCheck: true
          }
        });

        if (checkError) {
          console.error(`Error checking releases for ${artist.name}:`, checkError);
          continue;
        }

        if (result?.newReleases > 0) {
          newReleasesCount += result.newReleases;
          console.log(`Found ${result.newReleases} new releases for ${artist.name}`);
        }

        processedCount++;
        
        // Petit délai pour éviter de surcharger les APIs
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error processing artist ${artist.name}:`, error);
        continue;
      }
    }

    console.log(`=== CHECK COMPLETED: ${processedCount} artists processed, ${newReleasesCount} new releases found ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        newReleases: newReleasesCount,
        message: `Processed ${processedCount} artists, found ${newReleasesCount} new releases`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-new-releases function:', error);
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
