
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
  // Statistiques cumulées et nouvelles propriétés
  totalFollowers?: number;
  averagePopularity?: number;
  platformStats?: Array<{
    platform: string;
    followers?: number;
    popularity?: number;
  }>;
  totalPlays?: number;
  lifetimePlays?: number;
  // Nouvelles propriétés ajoutées
  totalStreams?: number;
  monthlyListeners?: number;
  lastUpdated?: string;
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
