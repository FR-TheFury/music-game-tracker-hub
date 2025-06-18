
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
      throw new Error('Failed to fetch artists or games');
    }

    const newReleases = [];

    // Check for new artist releases (simplified example - in real implementation, use Spotify API)
    for (const artist of artists || []) {
      // This is a placeholder - you would integrate with Spotify API here
      // For now, we'll create a sample release for demonstration
      if (Math.random() < 0.1) { // 10% chance of new release for demo
        const release = {
          type: 'artist' as const,
          source_item_id: artist.id,
          title: `Nouvelle sortie de ${artist.name}`,
          description: `Nouveau single ou album détecté sur ${artist.platform}`,
          platform_url: artist.url,
          user_id: artist.user_id,
        };

        // Check if this release already exists
        const { data: existing } = await supabaseClient
          .from('new_releases')
          .select('id')
          .eq('source_item_id', artist.id)
          .eq('type', 'artist')
          .eq('user_id', artist.user_id)
          .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

        if (!existing || existing.length === 0) {
          newReleases.push(release);
        }
      }
    }

    // Check for new game releases (simplified example - in real implementation, use Steam API)
    for (const game of games || []) {
      // This is a placeholder - you would integrate with Steam/Epic APIs here
      if (Math.random() < 0.05) { // 5% chance of new release for demo
        const release = {
          type: 'game' as const,
          source_item_id: game.id,
          title: `Mise à jour de ${game.name}`,
          description: `Nouvelle version ou DLC détecté sur ${game.platform}`,
          platform_url: game.url,
          user_id: game.user_id,
        };

        // Check if this release already exists
        const { data: existing } = await supabaseClient
          .from('new_releases')
          .select('id')
          .eq('source_item_id', game.id)
          .eq('type', 'game')
          .eq('user_id', game.user_id)
          .gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

        if (!existing || existing.length === 0) {
          newReleases.push(release);
        }
      }
    }

    // Insert new releases
    if (newReleases.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('new_releases')
        .insert(newReleases);

      if (insertError) {
        throw insertError;
      }

      // Send email notifications for users with immediate notifications enabled
      for (const release of newReleases) {
        // Get user notification settings
        const { data: settings } = await supabaseClient
          .from('notification_settings')
          .select('*')
          .eq('user_id', release.user_id)
          .single();

        if (settings?.email_notifications_enabled && settings?.notification_frequency === 'immediate') {
          // Call the email notification function
          try {
            await supabaseClient.functions.invoke('send-release-notification', {
              body: { release, userSettings: settings }
            });
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        newReleasesFound: newReleases.length,
        message: `Checked releases, found ${newReleases.length} new releases` 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in check-new-releases function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
};

serve(handler);
