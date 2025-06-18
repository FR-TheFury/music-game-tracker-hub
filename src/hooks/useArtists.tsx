import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface Artist {
  id: string;
  name: string;
  platform: string;
  url: string;
  imageUrl?: string;
  lastRelease?: string;
  addedAt: string;
  // Propriétés existantes
  spotifyId?: string;
  deezerId?: number;
  bio?: string;
  genres?: string[];
  popularity?: number;
  followersCount?: number;
  multipleUrls?: Array<{ platform: string; url: string }>;
  profileImageUrl?: string;
  // Nouvelles propriétés pour les statistiques cumulées
  totalFollowers?: number;
  averagePopularity?: number;
  platformStats?: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
  }>;
}

interface ArtistRelease {
  id: string;
  spotifyId: string;
  name: string;
  releaseType: string;
  releaseDate?: string;
  imageUrl?: string;
  externalUrls?: any;
  totalTracks?: number;
  popularity?: number;
  createdAt: string;
}

// Helper function to safely parse multipleUrls from Json type
const parseMultipleUrls = (urls: any): Array<{ platform: string; url: string }> => {
  if (!urls) return [];
  if (Array.isArray(urls)) {
    return urls.filter(url => 
      url && 
      typeof url === 'object' && 
      typeof url.platform === 'string' && 
      typeof url.url === 'string'
    );
  }
  return [];
};

// Helper function to safely parse platform stats
const parsePlatformStats = (stats: any): Array<{ platform: string; followers?: number; popularity?: number }> => {
  if (!stats) return [];
  if (Array.isArray(stats)) {
    return stats.filter(stat => 
      stat && 
      typeof stat === 'object' && 
      typeof stat.platform === 'string'
    );
  }
  return [];
};

export const useArtists = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchArtists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedArtists = data.map(artist => ({
        id: artist.id,
        name: artist.name,
        platform: artist.platform,
        url: artist.url,
        imageUrl: artist.image_url,
        lastRelease: artist.last_release,
        addedAt: artist.created_at,
        spotifyId: artist.spotify_id,
        deezerId: artist.deezer_id,
        bio: artist.bio,
        genres: artist.genres,
        popularity: artist.popularity,
        followersCount: artist.followers_count,
        multipleUrls: parseMultipleUrls(artist.multiple_urls),
        profileImageUrl: artist.profile_image_url,
        totalFollowers: artist.total_followers || 0,
        averagePopularity: artist.average_popularity || 0,
        platformStats: parsePlatformStats(artist.platform_stats),
      }));

      setArtists(formattedArtists);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les artistes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, [user]);

  const addArtist = async (artistData: Omit<Artist, 'id' | 'addedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('artists')
        .insert([
          {
            user_id: user.id,
            name: artistData.name,
            platform: artistData.platform,
            url: artistData.url,
            image_url: artistData.imageUrl,
            last_release: artistData.lastRelease,
            spotify_id: artistData.spotifyId,
            deezer_id: artistData.deezerId,
            bio: artistData.bio,
            genres: artistData.genres,
            popularity: artistData.popularity,
            followers_count: artistData.followersCount,
            multiple_urls: artistData.multipleUrls || [],
            profile_image_url: artistData.profileImageUrl,
            total_followers: artistData.totalFollowers || 0,
            average_popularity: artistData.averagePopularity || 0,
            platform_stats: artistData.platformStats || [],
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newArtist: Artist = {
        id: data.id,
        name: data.name,
        platform: data.platform,
        url: data.url,
        imageUrl: data.image_url,
        lastRelease: data.last_release,
        addedAt: data.created_at,
        spotifyId: data.spotify_id,
        deezerId: data.deezer_id,
        bio: data.bio,
        genres: data.genres,
        popularity: data.popularity,
        followersCount: data.followers_count,
        multipleUrls: parseMultipleUrls(data.multiple_urls),
        profileImageUrl: data.profile_image_url,
        totalFollowers: data.total_followers || 0,
        averagePopularity: data.average_popularity || 0,
        platformStats: parsePlatformStats(data.platform_stats),
      };

      setArtists(prev => [newArtist, ...prev]);
      
      toast({
        title: "Artiste ajouté !",
        description: `${artistData.name} a été ajouté à votre dashboard.`,
      });
    } catch (error) {
      console.error('Error adding artist:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'artiste",
        variant: "destructive",
      });
    }
  };

  const removeArtist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setArtists(prev => prev.filter(artist => artist.id !== id));
      
      toast({
        title: "Artiste supprimé",
        description: "L'artiste a été retiré de votre dashboard.",
      });
    } catch (error) {
      console.error('Error removing artist:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'artiste",
        variant: "destructive",
      });
    }
  };

  const getArtistReleases = async (artistId: string): Promise<ArtistRelease[]> => {
    try {
      const { data, error } = await supabase
        .from('artist_releases')
        .select('*')
        .eq('artist_id', artistId)
        .order('release_date', { ascending: false });

      if (error) throw error;

      return data.map(release => ({
        id: release.id,
        spotifyId: release.spotify_id,
        name: release.name,
        releaseType: release.release_type,
        releaseDate: release.release_date,
        imageUrl: release.image_url,
        externalUrls: release.external_urls,
        totalTracks: release.total_tracks,
        popularity: release.popularity,
        createdAt: release.created_at,
      }));
    } catch (error) {
      console.error('Error fetching artist releases:', error);
      return [];
    }
  };

  return {
    artists,
    loading,
    addArtist,
    removeArtist,
    getArtistReleases,
  };
};
