
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

    const typeIcon = release.type === 'artist' ? '🎵' : '🎮';
    const typeLabel = release.type === 'artist' ? 'Nouvel Album/Single' : 'Nouveau Jeu/Mise à jour';

    const emailResponse = await resend.emails.send({
      from: "Mon Dashboard <notifications@resend.dev>",
      to: [userEmail],
      subject: `${typeIcon} ${release.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">
              ${typeIcon} Nouvelle Sortie Détectée !
            </h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0;">${release.title}</h2>
              <p style="color: #64748b; font-weight: 600; margin: 10px 0;">${typeLabel}</p>
              
              ${release.description ? `<p style="color: #475569; line-height: 1.6;">${release.description}</p>` : ''}
              
              ${release.platform_url ? `
                <div style="margin-top: 20px;">
                  <a href="${release.platform_url}" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 12px 24px; 
                            text-decoration: none; 
                            border-radius: 6px; 
                            display: inline-block;
                            font-weight: 600;">
                    Voir sur la plateforme →
                  </a>
                </div>
              ` : ''}
            </div>
            
            <div style="margin-top: 20px; text-align: center; color: #64748b; font-size: 14px;">
              <p>Cette notification sera automatiquement supprimée dans 7 jours.</p>
              <p>Vous pouvez modifier vos préférences de notification dans votre dashboard.</p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Release notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-release-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
