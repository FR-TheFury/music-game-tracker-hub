
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_KEY = 'AIzaSyDd5qyVmJ-WE4T7J1LUQNtL8E3PNocCXFI';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistName, channelId, type } = await req.json();

    if (type === 'search' && artistName) {
      // Recherche de chaînes YouTube
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(artistName)}&maxResults=10&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!response.ok) {
        console.error('YouTube API error:', data);
        throw new Error(data.error?.message || 'YouTube API error');
      }

      const channels = data.items?.map((item: any) => ({
        id: item.id.channelId,
        name: item.snippet.title,
        thumbnails: Object.values(item.snippet.thumbnails || {}),
        description: item.snippet.description,
        channelUrl: `https://www.youtube.com/channel/${item.id.channelId}`,
        customUrl: item.snippet.customUrl
      })) || [];

      return new Response(
        JSON.stringify(channels),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (type === 'artist' && channelId) {
      // Détails d'une chaîne spécifique
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(channelUrl);
      const data = await response.json();

      if (!response.ok) {
        console.error('YouTube API error:', data);
        throw new Error(data.error?.message || 'YouTube API error');
      }

      const channel = data.items?.[0];
      if (!channel) {
        throw new Error('Channel not found');
      }

      const channelDetails = {
        id: channel.id,
        name: channel.snippet.title,
        thumbnails: Object.values(channel.snippet.thumbnails || {}),
        description: channel.snippet.description,
        channelUrl: `https://www.youtube.com/channel/${channel.id}`,
        customUrl: channel.snippet.customUrl,
        statistics: channel.statistics,
        subscriberCount: channel.statistics?.subscriberCount
      };

      return new Response(
        JSON.stringify(channelDetails),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Nouvelle fonctionnalité : recherche par nom d'artiste pour génération d'URL
    if (type === 'generateUrl' && artistName) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(artistName + ' music')}&maxResults=3&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({ url: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const bestMatch = data.items?.[0];
      if (bestMatch) {
        return new Response(JSON.stringify({
          url: `https://www.youtube.com/channel/${bestMatch.id.channelId}`,
          verified: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request parameters' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );

  } catch (error) {
    console.error('YouTube API error:', error);
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
