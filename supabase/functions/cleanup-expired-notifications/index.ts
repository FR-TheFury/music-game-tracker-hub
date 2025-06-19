
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting automatic cleanup of expired notifications...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Supprimer toutes les notifications expirées (plus de 7 jours)
    const { data: expiredNotifications, error: selectError } = await supabase
      .from('new_releases')
      .select('id, title, detected_at')
      .lt('expires_at', new Date().toISOString())

    if (selectError) {
      console.error('Error selecting expired notifications:', selectError)
      throw selectError
    }

    console.log(`Found ${expiredNotifications?.length || 0} expired notifications to clean`)

    if (expiredNotifications && expiredNotifications.length > 0) {
      // Supprimer les notifications expirées
      const { error: deleteError } = await supabase
        .from('new_releases')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (deleteError) {
        console.error('Error deleting expired notifications:', deleteError)
        throw deleteError
      }

      console.log(`Successfully cleaned up ${expiredNotifications.length} expired notifications`)
      
      // Log des notifications supprimées pour debug
      expiredNotifications.forEach(notification => {
        console.log(`Deleted notification: "${notification.title}" (detected: ${notification.detected_at})`)
      })
    }

    // Statistiques de nettoyage
    const { count: remainingNotifications, error: countError } = await supabase
      .from('new_releases')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting remaining notifications:', countError)
    } else {
      console.log(`Remaining active notifications in database: ${remainingNotifications || 0}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        cleanedNotifications: expiredNotifications?.length || 0,
        remainingNotifications: remainingNotifications || 0,
        timestamp: new Date().toISOString(),
        message: `Cleanup completed: removed ${expiredNotifications?.length || 0} expired notifications`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})
