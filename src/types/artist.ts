export interface Artist {
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
  totalPlays?: number;
  lifetimePlays?: number;
}

export interface ArtistRelease {
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
