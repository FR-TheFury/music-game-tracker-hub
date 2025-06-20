
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

    let totalNewReleases = 0;
    let totalProcessed = 0;
    let totalUpdatedStats = 0;

    // 1. Vérifier les sorties d'artistes
    console.log('Checking artist releases...');
    try {
      const { data: artistResult, error: artistError } = await supabaseClient.functions.invoke('check-user-releases', {
        body: { forceCheck: true }
      });

      if (!artistError && artistResult) {
        totalNewReleases += artistResult.newReleases || 0;
        totalProcessed += artistResult.processedArtists || 0;
        console.log(`Artist check completed: ${artistResult.newReleases || 0} new releases, ${artistResult.processedArtists || 0} processed`);
      } else {
        console.error('Artist check error:', artistError);
      }
    } catch (artistCheckError) {
      console.error('Artist check failed:', artistCheckError);
    }

    // Délai entre les vérifications pour éviter la surcharge
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Mettre à jour les statistiques des artistes
    console.log('Updating artist statistics...');
    try {
      const { data: statsResult, error: statsError } = await supabaseClient.functions.invoke('update-artist-stats', {
        body: { batchSize: 15 } // Traiter 15 artistes à la fois
      });

      if (!statsError && statsResult) {
        totalUpdatedStats = statsResult.updatedArtists || 0;
        console.log(`Artist stats update completed: ${statsResult.updatedArtists || 0} artists updated`);
      } else {
        console.error('Artist stats update error:', statsError);
      }
    } catch (statsUpdateError) {
      console.error('Artist stats update failed:', statsUpdateError);
    }

    // Délai entre les vérifications pour éviter la surcharge
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Vérifier les mises à jour de jeux
    console.log('Checking game updates...');
    try {
      const { data: gameResult, error: gameError } = await supabaseClient.functions.invoke('check-game-updates', {
        body: { forceCheck: true }
      });

      if (!gameError && gameResult) {
        totalNewReleases += gameResult.newUpdates || 0;
        totalProcessed += gameResult.processedGames || 0;
        console.log(`Game check completed: ${gameResult.newUpdates || 0} new updates, ${gameResult.processedGames || 0} processed`);
      } else {
        console.error('Game check error:', gameError);
      }
    } catch (gameCheckError) {
      console.error('Game check failed:', gameCheckError);
    }

    console.log(`=== CHECK COMPLETED: ${totalProcessed} items processed, ${totalNewReleases} new notifications, ${totalUpdatedStats} stats updated ===`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: totalProcessed,
        newReleases: totalNewReleases,
        updatedStats: totalUpdatedStats,
        message: `Global check completed: ${totalProcessed} items processed, ${totalNewReleases} new notifications, ${totalUpdatedStats} artist stats updated`
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
