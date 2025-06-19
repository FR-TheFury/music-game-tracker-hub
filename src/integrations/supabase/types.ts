export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      artist_releases: {
        Row: {
          artist_id: string
          created_at: string | null
          external_urls: Json | null
          id: string
          image_url: string | null
          name: string
          popularity: number | null
          release_date: string | null
          release_type: string
          spotify_id: string
          total_tracks: number | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          external_urls?: Json | null
          id?: string
          image_url?: string | null
          name: string
          popularity?: number | null
          release_date?: string | null
          release_type: string
          spotify_id: string
          total_tracks?: number | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          external_urls?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          popularity?: number | null
          release_date?: string | null
          release_type?: string
          spotify_id?: string
          total_tracks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          average_popularity: number | null
          bio: string | null
          created_at: string | null
          deezer_id: number | null
          followers_count: number | null
          genres: string[] | null
          id: string
          image_url: string | null
          last_release: string | null
          last_updated: string | null
          lifetime_plays: number | null
          monthly_listeners: number | null
          multiple_urls: Json | null
          name: string
          platform: string
          platform_stats: Json | null
          popularity: number | null
          profile_image_url: string | null
          spotify_id: string | null
          total_followers: number | null
          total_plays: number | null
          total_streams: number | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          average_popularity?: number | null
          bio?: string | null
          created_at?: string | null
          deezer_id?: number | null
          followers_count?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          last_release?: string | null
          last_updated?: string | null
          lifetime_plays?: number | null
          monthly_listeners?: number | null
          multiple_urls?: Json | null
          name: string
          platform: string
          platform_stats?: Json | null
          popularity?: number | null
          profile_image_url?: string | null
          spotify_id?: string | null
          total_followers?: number | null
          total_plays?: number | null
          total_streams?: number | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          average_popularity?: number | null
          bio?: string | null
          created_at?: string | null
          deezer_id?: number | null
          followers_count?: number | null
          genres?: string[] | null
          id?: string
          image_url?: string | null
          last_release?: string | null
          last_updated?: string | null
          lifetime_plays?: number | null
          monthly_listeners?: number | null
          multiple_urls?: Json | null
          name?: string
          platform?: string
          platform_stats?: Json | null
          popularity?: number | null
          profile_image_url?: string | null
          spotify_id?: string | null
          total_followers?: number | null
          total_plays?: number | null
          total_streams?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      email_sent_log: {
        Row: {
          email_type: string
          id: string
          release_hash: string
          release_title: string | null
          sent_at: string
          user_id: string
        }
        Insert: {
          email_type?: string
          id?: string
          release_hash: string
          release_title?: string | null
          sent_at?: string
          user_id: string
        }
        Update: {
          email_type?: string
          id?: string
          release_hash?: string
          release_title?: string | null
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string | null
          discount: string | null
          expected_release_date: string | null
          id: string
          image_url: string | null
          last_status_check: string | null
          name: string
          platform: string
          price: string | null
          rawg_url: string | null
          release_date: string | null
          release_status: string | null
          shop_url: string | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount?: string | null
          expected_release_date?: string | null
          id?: string
          image_url?: string | null
          last_status_check?: string | null
          name: string
          platform: string
          price?: string | null
          rawg_url?: string | null
          release_date?: string | null
          release_status?: string | null
          shop_url?: string | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount?: string | null
          expected_release_date?: string | null
          id?: string
          image_url?: string | null
          last_status_check?: string | null
          name?: string
          platform?: string
          price?: string | null
          rawg_url?: string | null
          release_date?: string | null
          release_status?: string | null
          shop_url?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      new_releases: {
        Row: {
          description: string | null
          detected_at: string
          expires_at: string
          id: string
          image_url: string | null
          platform_url: string | null
          source_item_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          unique_hash: string | null
          user_id: string
        }
        Insert: {
          description?: string | null
          detected_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          platform_url?: string | null
          source_item_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          unique_hash?: string | null
          user_id: string
        }
        Update: {
          description?: string | null
          detected_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          platform_url?: string | null
          source_item_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          unique_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          artist_notifications_enabled: boolean
          created_at: string
          email_notifications_enabled: boolean
          game_notifications_enabled: boolean
          id: string
          notification_frequency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_notifications_enabled?: boolean
          created_at?: string
          email_notifications_enabled?: boolean
          game_notifications_enabled?: boolean
          id?: string
          notification_frequency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_notifications_enabled?: boolean
          created_at?: string
          email_notifications_enabled?: boolean
          game_notifications_enabled?: boolean
          id?: string
          notification_frequency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_validations: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_email: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_email: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_email?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_artist_aggregated_stats: {
        Args: { artist_id: string }
        Returns: undefined
      }
      cleanup_artist_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_releases: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_email_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_all_users_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          username: string
          user_email: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
          approved_at: string
          approved_by: string
        }[]
      }
      get_user_artists: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          name: string
          platform: string
          url: string
          image_url: string
          spotify_id: string
          followers_count: number
          popularity: number
          created_at: string
        }[]
      }
      get_user_games: {
        Args: { target_user_id: string }
        Returns: {
          id: string
          name: string
          platform: string
          url: string
          image_url: string
          price: string
          discount: string
          release_date: string
          created_at: string
        }[]
      }
      get_user_profile_data: {
        Args: { target_user_id: string }
        Returns: {
          user_id: string
          username: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
          approved_at: string
          approved_by: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      search_users_by_username: {
        Args: { search_term: string }
        Returns: {
          user_id: string
          username: string
          role: Database["public"]["Enums"]["user_role"]
          created_at: string
        }[]
      }
    }
    Enums: {
      notification_type: "artist" | "game"
      user_role: "admin" | "editor" | "viewer" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      notification_type: ["artist", "game"],
      user_role: ["admin", "editor", "viewer", "pending"],
    },
  },
} as const
