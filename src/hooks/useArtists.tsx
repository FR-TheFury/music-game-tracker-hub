
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
  // Nouvelles propriétés
  spotifyId?: string;
  bio?: string;
  genres?: string[];
  popularity?: number;
  followersCount?: number;
  multipleUrls?: Array<{ platform: string; url: string }>;
  profileImageUrl?: string;
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
        bio: artist.bio,
        genres: artist.genres,
        popularity: artist.popularity,
        followersCount: artist.followers_count,
        multipleUrls: artist.multiple_urls,
        profileImageUrl: artist.profile_image_url,
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
            bio: artistData.bio,
            genres: artistData.genres,
            popularity: artistData.popularity,
            followers_count: artistData.followersCount,
            multiple_urls: artistData.multipleUrls,
            profile_image_url: artistData.profileImageUrl,
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
        bio: data.bio,
        genres: data.genres,
        popularity: data.popularity,
        followersCount: data.followers_count,
        multipleUrls: data.multiple_urls,
        profileImageUrl: data.profile_image_url,
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
