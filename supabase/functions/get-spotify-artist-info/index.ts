
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

interface SpotifyArtistInfo {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyTopTrack {
  popularity: number;
  album: {
    release_date: string;
  };
}

interface SpotifyAlbum {
  release_date: string;
  name: string;
  album_type: string;
  images: Array<{
    url: string;
  }>;
  external_urls: {
    spotify: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req);
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL Spotify manquante' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extraire l'ID Spotify de l'URL
    const spotifyIdMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
    if (!spotifyIdMatch) {
      return new Response(
        JSON.stringify({ error: 'URL Spotify invalide' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const artistId = spotifyIdMatch[1];
    console.log('Processing Spotify artist ID:', artistId);

    // Récupérer le token d'accès Spotify
    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Identifiants Spotify manquants');
    }

    // Obtenir un token d'accès
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      throw new Error('Échec de l\'authentification Spotify');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Récupérer les informations de l'artiste
    const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!artistResponse.ok) {
      throw new Error('Artiste Spotify non trouvé');
    }

    const artistData: SpotifyArtistInfo = await artistResponse.json();

    // Récupérer les top tracks pour calculer une estimation des streams
    const topTracksResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let estimatedStreams = 0;
    let lastReleaseDate = '';
    
    if (topTracksResponse.ok) {
      const topTracksData = await topTracksResponse.json();
      const tracks = topTracksData.tracks || [];
      
      // Estimer les streams basé sur la popularité (approximation)
      // Plus la popularité est élevée, plus l'estimation est haute
      estimatedStreams = tracks.reduce((total: number, track: SpotifyTopTrack) => {
        // Estimation basée sur la popularité : popularité^2 * 10000
        return total + Math.pow(track.popularity, 2) * 10000;
      }, 0);

      // Trouver la date de sortie la plus récente
      const releaseDates = tracks
        .map((track: SpotifyTopTrack) => track.album.release_date)
        .filter(date => date)
        .sort()
        .reverse();
      
      if (releaseDates.length > 0) {
        lastReleaseDate = releaseDates[0];
      }
    }

    // Récupérer les albums pour avoir plus d'informations sur les sorties récentes
    const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&market=US&limit=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    let lastRelease = '';
    if (albumsResponse.ok) {
      const albumsData = await albumsResponse.json();
      const albums = albumsData.items || [];
      
      if (albums.length > 0) {
        const latestAlbum: SpotifyAlbum = albums[0];
        lastRelease = `${latestAlbum.name} (${latestAlbum.release_date})`;
        
        // Mettre à jour la date de dernière sortie si elle est plus récente
        if (!lastReleaseDate || latestAlbum.release_date > lastReleaseDate) {
          lastReleaseDate = latestAlbum.release_date;
        }
      }
    }

    const result = {
      success: true,
      data: {
        spotifyId: artistData.id,
        name: artistData.name,
        genres: artistData.genres,
        popularity: artistData.popularity,
        followers: artistData.followers.total,
        profileImageUrl: artistData.images?.[0]?.url || null,
        bio: `Artiste Spotify avec ${artistData.followers.total.toLocaleString()} followers`,
        lastRelease: lastRelease,
        estimatedStreams: estimatedStreams,
        lastReleaseDate: lastReleaseDate,
        externalUrls: artistData.external_urls,
        platform: 'Spotify'
      }
    };

    console.log('Spotify data retrieved successfully:', {
      name: result.data.name,
      followers: result.data.followers,
      estimatedStreams: result.data.estimatedStreams,
      popularity: result.data.popularity
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur lors de la récupération des données Spotify:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur inconnue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
