
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
  release: Release;
  userEmail: string;
  userSettings: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { release, userEmail, userSettings }: NotificationRequest = await req.json();

    console.log(`Sending release notification to ${userEmail} for: ${release.title}`);

    const typeIcon = release.type === 'artist' ? '🎵' : '🎮';
    const typeLabel = release.type === 'artist' ? 'Nouvel Album/Single' : 'Nouveau Jeu/Mise à jour';

    const emailResponse = await resend.emails.send({
      from: "Artist & Game Tracker <notifications@resend.dev>",
      to: [userEmail],
      subject: `${typeIcon} ${release.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #FF0751 0%, #FF3971 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center; font-size: 24px;">
              ${typeIcon} Nouvelle Sortie Détectée !
            </h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              ${release.image_url ? `<img src="${release.image_url}" alt="Cover" style="max-width: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">` : ''}
            </div>
            
            <h2 style="color: #1e293b; margin: 20px 0 10px 0; text-align: center;">${release.title}</h2>
            <p style="color: #FF0751; font-weight: 600; margin: 10px 0; text-align: center; background: #FF0751/10; padding: 8px 16px; border-radius: 6px; display: inline-block; width: 100%; box-sizing: border-box;">${typeLabel}</p>
            
            ${release.description ? `<p style="color: #475569; line-height: 1.6; text-align: center; margin: 15px 0;">${release.description}</p>` : ''}
            
            ${release.platform_url ? `
              <div style="text-align: center; margin-top: 25px;">
                <a href="${release.platform_url}" 
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
      `,
    });

    console.log("Release notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: `Email sent to ${userEmail}` 
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
