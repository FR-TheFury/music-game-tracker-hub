
import { Artist } from '@/types/artist';

// Helper function to safely parse multipleUrls from Json type
export const parseMultipleUrls = (urls: any): Array<{ platform: string; url: string }> => {
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
export const parsePlatformStats = (stats: any): Array<{ platform: string; followers?: number; popularity?: number }> => {
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

// Helper function to format artist data from database
export const formatArtistFromDatabase = (artist: any): Artist => ({
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
  totalPlays: artist.total_plays || 0,
  lifetimePlays: artist.lifetime_plays || 0,
});

// Helper function to format artist data for database insertion
export const formatArtistForDatabase = (artistData: Omit<Artist, 'id' | 'addedAt'>, userId: string) => ({
  user_id: userId,
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
  total_plays: artistData.totalPlays || 0,
  lifetime_plays: artistData.lifetimePlays || 0,
});
