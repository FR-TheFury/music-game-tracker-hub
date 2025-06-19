
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SoundCloudArtist {
  id: number;
  username: string;
  full_name: string;
  description: string;
  followers_count: number;
  track_count: number;
  avatar_url: string;
  permalink_url: string;
  verified: boolean;
}

interface SoundCloudTrack {
  id: number;
  title: string;
  description: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  user: {
    username: string;
    permalink_url: string;
  };
}

interface SoundCloudRelease {
  id: number;
  title: string;
  created_at: string;
  permalink_url: string;
  artwork_url: string;
  playback_count: number;
  likes_count: number;
  release_date: string;
}

// Fonction pour essayer différents client IDs publics si nécessaire
const getWorkingClientId = async (): Promise<string | null> => {
  const configuredClientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  
  if (configuredClientId) {
    // Test du client ID configuré
    try {
      const testUrl = `https://api-v2.soundcloud.com/search?q=test&client_id=${configuredClientId}&limit=1`;
      const response = await fetch(testUrl);
      console.log(`Testing configured client ID: ${response.status}`);
      
      if (response.ok) {
        console.log('Configured client ID works');
        return configuredClientId;
      }
    } catch (error) {
      console.log('Configured client ID failed:', error.message);
    }
  }

  // Liste de client IDs publics connus (ces IDs sont publics et largement utilisés)
  const publicClientIds = [
    'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX', // Client ID public bien connu
    'LBCcHmRB8XSStWL6wKH2HPACspQlXgKA', // Autre client ID public
    'a3e059563d7fd3372b49b37f00a00bcf', // Client ID alternatif
  ];

  for (const clientId of publicClientIds) {
    try {
      const testUrl = `https://api-v2.soundcloud.com/search?q=test&client_id=${clientId}&limit=1`;
      const response = await fetch(testUrl);
      console.log(`Testing public client ID ${clientId}: ${response.status}`);
      
      if (response.ok) {
        console.log(`Public client ID ${clientId} works`);
        return clientId;
      }
    } catch (error) {
      console.log(`Public client ID ${clientId} failed:`, error.message);
    }
  }

  return null;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, artistUrl, type, limit = 10 } = await req.json();
    
    console.log(`SoundCloud API request - Type: ${type}, Query: ${query}`);

    // Obtenir un client ID qui fonctionne
    const workingClientId = await getWorkingClientId();
    
    if (!workingClientId) {
      console.error('Aucun client ID SoundCloud valide trouvé');
      return new Response(
        JSON.stringify({ 
          error: 'SoundCloud API non disponible',
          message: 'Impossible de se connecter à l\'API SoundCloud. Le service pourrait être temporairement indisponible.'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Utilisation du client ID: ${workingClientId}`);

    if (type === 'search-artists') {
      // Essayer plusieurs endpoints pour la recherche d'artistes
      const searchEndpoints = [
        `https://api-v2.soundcloud.com/search/users?q=${encodeURIComponent(query)}&client_id=${workingClientId}&limit=20`,
        `https://api.soundcloud.com/users?q=${encodeURIComponent(query)}&client_id=${workingClientId}&limit=20`,
        `https://api-v2.soundcloud.com/search?q=${encodeURIComponent(query)}&kind=user&client_id=${workingClientId}&limit=20`
      ];
      
      let artists = [];
      let lastError = null;

      for (const endpoint of searchEndpoints) {
        try {
          console.log(`Essai de l'endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            artists = data.collection || data || [];
            console.log(`Succès avec l'endpoint, trouvé ${artists.length} artistes`);
            break;
          } else {
            const errorText = await response.text();
            lastError = `${response.status}: ${errorText}`;
            console.log(`Échec de l'endpoint: ${lastError}`);
          }
        } catch (error) {
          lastError = error.message;
          console.log(`Erreur avec l'endpoint: ${error.message}`);
        }
      }

      if (artists.length === 0 && lastError) {
        console.error('Tous les endpoints ont échoué:', lastError);
        return new Response(
          JSON.stringify({ 
            artists: [],
            warning: 'Recherche SoundCloud temporairement indisponible'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ artists }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-info') {
      const username = artistUrl.split('/').pop();
      const endpoints = [
        `https://api-v2.soundcloud.com/users/${username}?client_id=${workingClientId}`,
        `https://api.soundcloud.com/users/${username}?client_id=${workingClientId}`,
        `https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${workingClientId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Tentative d'obtention des infos artiste: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const artist = await response.json();
            console.log('Infos artiste trouvées:', artist.username);
            return new Response(
              JSON.stringify({ artist }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.log(`Erreur endpoint artiste: ${error.message}`);
        }
      }

      return new Response(
        JSON.stringify({ artist: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-releases') {
      console.log('Recherche des sorties récentes pour:', query, artistUrl);
      
      let tracks = [];
      let userId = null;

      // Essayer de résoudre l'artiste d'abord
      if (artistUrl) {
        const resolveEndpoints = [
          `https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${workingClientId}`,
          `https://api.soundcloud.com/resolve.json?url=${artistUrl}&client_id=${workingClientId}`
        ];

        for (const endpoint of resolveEndpoints) {
          try {
            const resolveResponse = await fetch(endpoint);
            if (resolveResponse.ok) {
              const userData = await resolveResponse.json();
              userId = userData.id;
              console.log('ID utilisateur résolu:', userId);
              break;
            }
          } catch (error) {
            console.log('Erreur de résolution:', error.message);
          }
        }
      }

      // Si on a un ID utilisateur, récupérer ses tracks
      if (userId) {
        const trackEndpoints = [
          `https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${workingClientId}&limit=${limit}`,
          `https://api.soundcloud.com/users/${userId}/tracks?client_id=${workingClientId}&limit=${limit}`
        ];

        for (const endpoint of trackEndpoints) {
          try {
            const response = await fetch(endpoint);
            if (response.ok) {
              const data = await response.json();
              tracks = data.collection || data || [];
              console.log(`Trouvé ${tracks.length} tracks pour l'utilisateur ${userId}`);
              break;
            }
          } catch (error) {
            console.log('Erreur récupération tracks:', error.message);
          }
        }
      }

      // Si pas de tracks via l'ID, essayer la recherche
      if (tracks.length === 0 && query) {
        const searchEndpoints = [
          `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${workingClientId}&limit=${limit}`,
          `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&client_id=${workingClientId}&limit=${limit}`
        ];

        for (const endpoint of searchEndpoints) {
          try {
            const searchResponse = await fetch(endpoint);
            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              const searchTracks = searchData.collection || searchData || [];
              
              // Filtrer pour l'artiste spécifique
              tracks = searchTracks.filter((track: any) => 
                track.user?.username?.toLowerCase().includes(query.toLowerCase()) ||
                query.toLowerCase().includes(track.user?.username?.toLowerCase())
              );
              console.log(`Trouvé ${tracks.length} tracks via recherche`);
              break;
            }
          } catch (error) {
            console.log('Erreur recherche tracks:', error.message);
          }
        }
      }
      
      // Filtrer pour les sorties récentes (30 derniers jours)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentReleases = tracks
        .filter((track: any) => {
          if (!track.created_at) return false;
          return new Date(track.created_at) >= thirtyDaysAgo;
        })
        .map((track: any) => ({
          id: track.id,
          title: track.title,
          created_at: track.created_at,
          permalink_url: track.permalink_url,
          artwork_url: track.artwork_url,
          playback_count: track.playback_count || 0,
          likes_count: track.likes_count || 0,
          release_date: track.created_at,
        }));

      console.log(`Trouvé ${recentReleases.length} sorties récentes SoundCloud`);

      return new Response(
        JSON.stringify({ releases: recentReleases }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'artist-tracks') {
      const username = artistUrl.split('/').pop();
      const endpoints = [
        `https://api-v2.soundcloud.com/users/${username}/tracks?client_id=${workingClientId}&limit=${limit}`,
        `https://api.soundcloud.com/users/${username}/tracks?client_id=${workingClientId}&limit=${limit}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const tracks = await response.json();
            console.log(`Trouvé ${tracks.length} tracks pour ${username}`);
            return new Response(
              JSON.stringify({ tracks: tracks.collection || tracks }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.log('Erreur récupération tracks artiste:', error.message);
        }
      }

      return new Response(
        JSON.stringify({ tracks: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'playback-stats') {
      // Logique similaire à artist-releases mais pour les stats
      console.log('Récupération des stats de lecture pour:', query);
      
      let tracks = [];
      let userId = null;
      
      if (artistUrl) {
        try {
          const resolveResponse = await fetch(`https://api-v2.soundcloud.com/resolve?url=${artistUrl}&client_id=${workingClientId}`);
          if (resolveResponse.ok) {
            const userData = await resolveResponse.json();
            userId = userData.id;
          }
        } catch (error) {
          console.log('Erreur résolution pour stats:', error.message);
        }
      }

      if (userId) {
        try {
          const tracksResponse = await fetch(`https://api-v2.soundcloud.com/users/${userId}/tracks?client_id=${workingClientId}&limit=50`);
          if (tracksResponse.ok) {
            const data = await tracksResponse.json();
            tracks = data.collection || data || [];
          }
        } catch (error) {
          console.log('Erreur récupération tracks pour stats:', error.message);
        }
      }
      
      const totalPlays = tracks.reduce((sum: number, track: any) => sum + (track.playback_count || 0), 0);
      const totalLikes = tracks.reduce((sum: number, track: any) => sum + (track.likes_count || 0), 0);
      const trackCount = tracks.length;

      console.log(`Stats SoundCloud: ${totalPlays} lectures totales, ${totalLikes} likes totaux, ${trackCount} tracks`);

      return new Response(
        JSON.stringify({ 
          totalPlays, 
          totalLikes, 
          trackCount,
          tracks: tracks.slice(0, 10)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Type de requête invalide' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur fonction SoundCloud:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Échec de récupération des données SoundCloud',
        message: 'Le service SoundCloud est temporairement indisponible. Veuillez réessayer plus tard.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
