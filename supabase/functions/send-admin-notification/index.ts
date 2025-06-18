
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userEmail: string;
  username: string;
  adminEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, username, adminEmail }: NotificationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Dashboard <onboarding@resend.dev>",
      to: [adminEmail],
      subject: "Nouvelle demande d'accès au dashboard",
      html: `
        <h1>Nouvelle demande d'accès</h1>
        <p>Un nouvel utilisateur souhaite accéder au dashboard :</p>
        <ul>
          <li><strong>Email :</strong> ${userEmail}</li>
          <li><strong>Nom d'utilisateur :</strong> ${username || 'Non renseigné'}</li>
        </ul>
        <p>Connectez-vous au dashboard pour approuver ou rejeter cette demande.</p>
        <p>Cordialement,<br>Le système Dashboard</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
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
