
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Release {
  type: 'artist' | 'game';
  title: string;
  description?: string;
  platform_url?: string;
  image_url?: string;
}

interface NotificationRequest {
  releases?: Release[];
  release?: Release;
  userId: string;
  userSettings: any;
  isDigest?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: NotificationRequest = await req.json();
    const { releases, release, userId, userSettings, isDigest } = requestData;

    console.log(`Processing notification for user: ${userId}`);

    // Gérer les deux formats : single release ou digest
    const releasesToProcess = releases || (release ? [release] : []);
    
    if (releasesToProcess.length === 0) {
      console.log('No releases to process');
      return new Response(JSON.stringify({ success: false, message: 'No releases provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Créer le client Supabase avec la clé de service pour accéder aux données auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer l'email de l'utilisateur depuis la table auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError) {
      console.error('Error fetching user data:', userError)
      throw new Error(`Unable to fetch user data: ${userError.message}`)
    }

    if (!userData?.user?.email) {
      console.error('No email found for user:', userId)
      throw new Error('User email not found')
    }

    const userEmail = userData.user.email
    console.log(`Sending notification to ${userEmail} for ${releasesToProcess.length} releases`);

    // Construire le contenu de l'email
    let emailSubject: string;
    let emailContent: string;

    if (isDigest && releasesToProcess.length > 1) {
      // Email digest pour plusieurs sorties
      emailSubject = `🎵 ${releasesToProcess.length} nouvelles sorties détectées !`;
      
      const releasesList = releasesToProcess.map(rel => {
        const typeIcon = rel.type === 'artist' ? '🎵' : '🎮';
        return `
          <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #FF0751;">
            <h3 style="margin: 0 0 10px 0; color: #1e293b;">${typeIcon} ${rel.title}</h3>
            ${rel.description ? `<p style="color: #475569; margin: 5px 0;">${rel.description}</p>` : ''}
            ${rel.platform_url ? `<a href="${rel.platform_url}" style="color: #FF0751; text-decoration: none;">🔗 Voir sur la plateforme</a>` : ''}
          </div>
        `;
      }).join('');

      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #FF0751 0%, #FF3971 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center; font-size: 24px;">
              🎵 Nouvelles Sorties Détectées !
            </h1>
            <p style="color: white; text-align: center; margin: 10px 0 0 0; opacity: 0.9;">
              ${releasesToProcess.length} nouvelles sorties vous attendent
            </p>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ${releasesList}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
              <p style="margin: 5px 0;">✨ Cette notification a été générée automatiquement</p>
              <p style="margin: 5px 0;">📧 Elle sera supprimée dans 7 jours</p>
              <p style="margin: 5px 0;">⚙️ Modifiez vos préférences dans votre profil</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Email pour une seule sortie
      const singleRelease = releasesToProcess[0];
      const typeIcon = singleRelease.type === 'artist' ? '🎵' : '🎮';
      const typeLabel = singleRelease.type === 'artist' ? 'Nouvel Album/Single' : 'Nouveau Jeu/Mise à jour';

      emailSubject = `${typeIcon} ${singleRelease.title}`;
      emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #FF0751 0%, #FF3971 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center; font-size: 24px;">
              ${typeIcon} Nouvelle Sortie Détectée !
            </h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              ${singleRelease.image_url ? `<img src="${singleRelease.image_url}" alt="Cover" style="max-width: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">` : ''}
            </div>
            
            <h2 style="color: #1e293b; margin: 20px 0 10px 0; text-align: center;">${singleRelease.title}</h2>
            <p style="color: #FF0751; font-weight: 600; margin: 10px 0; text-align: center; background: #FF0751/10; padding: 8px 16px; border-radius: 6px; display: inline-block; width: 100%; box-sizing: border-box;">${typeLabel}</p>
            
            ${singleRelease.description ? `<p style="color: #475569; line-height: 1.6; text-align: center; margin: 15px 0;">${singleRelease.description}</p>` : ''}
            
            ${singleRelease.platform_url ? `
              <div style="text-align: center; margin-top: 25px;">
                <a href="${singleRelease.platform_url}" 
                   style="background: linear-gradient(135deg, #FF0751 0%, #FF3971 100%); 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block;
                          font-weight: 600;
                          font-size: 16px;
                          box-shadow: 0 4px 12px rgba(255, 7, 81, 0.3);
                          transition: all 0.3s ease;">
                  🔗 Voir sur la plateforme
                </a>
              </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
              <p style="margin: 5px 0;">✨ Cette notification a été générée automatiquement</p>
              <p style="margin: 5px 0;">📧 Elle sera supprimée dans 7 jours</p>
              <p style="margin: 5px 0;">⚙️ Modifiez vos préférences dans votre profil</p>
            </div>
          </div>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Artist & Game Tracker <notifications@resend.dev>",
      to: [userEmail],
      subject: emailSubject,
      html: emailContent,
    });

    console.log("Notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: `Email sent to ${userEmail}`,
      userId: userId,
      releasesCount: releasesToProcess.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-release-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
