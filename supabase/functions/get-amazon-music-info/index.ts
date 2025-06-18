
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
    const { artistName, artistId, type } = await req.json();

    if (type === 'search' && artistName) {
      // Recherche d'artistes Amazon Music
      // Note: Amazon Music n'a pas d'API publique officielle
      // Ceci est un exemple de structure - vous devrez implémenter
      // une solution alternative
      
      console.log('Searching Amazon Music for:', artistName);
      
      // Exemple de données mockées pour la démonstration
      const mockResults = [
        {
          id: `amazon-${artistName.toLowerCase().replace(/\s+/g, '-')}`,
          name: artistName,
          imageUrl: 'https://via.placeholder.com/300x300',
          artistUrl: `https://music.amazon.com/artists/example`,
          bio: `${artistName} on Amazon Music`,
          followers: Math.floor(Math.random() * 1000000)
        }
      ];

      return new Response(
        JSON.stringify(mockResults),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (type === 'artist' && artistId) {
      // Détails d'un artiste spécifique
      console.log('Getting Amazon Music artist details for:', artistId);
      
      const mockArtistDetails = {
        id: artistId,
        name: 'Artist Name',
        imageUrl: 'https://via.placeholder.com/300x300',
        artistUrl: `https://music.amazon.com/artists/${artistId}`,
        bio: 'Artist biography on Amazon Music',
        followers: Math.floor(Math.random() * 1000000),
        albums: []
      };

      return new Response(
        JSON.stringify(mockArtistDetails),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request parameters' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    console.error('Amazon Music API error:', error);
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
