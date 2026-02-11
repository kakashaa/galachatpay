export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      animated_photo_requests: {
        Row: {
          created_at: string
          description: string | null
          duration_label: string
          gif_url: string
          id: string
          max_level: number
          status: string
          user_name: string
          user_uuid: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_label: string
          gif_url: string
          id?: string
          max_level?: number
          status?: string
          user_name: string
          user_uuid: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_label?: string
          gif_url?: string
          id?: string
          max_level?: number
          status?: string
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      ban_reports: {
        Row: {
          admin_notes: string | null
          ban_type: string
          created_at: string
          description: string
          evidence_type: string
          evidence_url: string
          expires_at: string | null
          id: string
          is_verified: boolean
          reported_user_id: string
          reporter_gala_id: string
          reward_amount: number | null
          reward_paid: boolean
        }
        Insert: {
          admin_notes?: string | null
          ban_type: string
          created_at?: string
          description: string
          evidence_type?: string
          evidence_url: string
          expires_at?: string | null
          id?: string
          is_verified?: boolean
          reported_user_id: string
          reporter_gala_id: string
          reward_amount?: number | null
          reward_paid?: boolean
        }
        Update: {
          admin_notes?: string | null
          ban_type?: string
          created_at?: string
          description?: string
          evidence_type?: string
          evidence_url?: string
          expires_at?: string | null
          id?: string
          is_verified?: boolean
          reported_user_id?: string
          reporter_gala_id?: string
          reward_amount?: number | null
          reward_paid?: boolean
        }
        Relationships: []
      }
      custom_gifts: {
        Row: {
          admin_note: string | null
          charger_level_at_upload: number
          created_at: string
          id: string
          max_duration_allowed: number
          status: string
          thumbnail_url: string | null
          title: string
          user_gala_id: string | null
          user_name: string
          user_uuid: string
          video_duration: number
          video_url: string
        }
        Insert: {
          admin_note?: string | null
          charger_level_at_upload?: number
          created_at?: string
          id?: string
          max_duration_allowed?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          user_gala_id?: string | null
          user_name: string
          user_uuid: string
          video_duration?: number
          video_url: string
        }
        Update: {
          admin_note?: string | null
          charger_level_at_upload?: number
          created_at?: string
          id?: string
          max_duration_allowed?: number
          status?: string
          thumbnail_url?: string | null
          title?: string
          user_gala_id?: string | null
          user_name?: string
          user_uuid?: string
          video_duration?: number
          video_url?: string
        }
        Relationships: []
      }
      entry_gift_claims: {
        Row: {
          charger_level_at_claim: number
          claim_month: string
          claim_type: string
          created_at: string
          friend_uuid: string | null
          gift_id: string
          gift_usage: string
          id: string
          user_uuid: string
        }
        Insert: {
          charger_level_at_claim?: number
          claim_month: string
          claim_type: string
          created_at?: string
          friend_uuid?: string | null
          gift_id: string
          gift_usage: string
          id?: string
          user_uuid: string
        }
        Update: {
          charger_level_at_claim?: number
          claim_month?: string
          claim_type?: string
          created_at?: string
          friend_uuid?: string | null
          gift_id?: string
          gift_usage?: string
          id?: string
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_gift_claims_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "entry_gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_gifts: {
        Row: {
          created_at: string
          display_order: number
          gift_type: string
          id: string
          is_active: boolean
          star_level: number
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          gift_type?: string
          id?: string
          is_active?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          gift_type?: string
          id?: string
          is_active?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      frame_claims: {
        Row: {
          charger_level_at_claim: number
          claim_month: string
          claim_type: string
          created_at: string
          frame_id: string
          friend_uuid: string | null
          id: string
          user_uuid: string
        }
        Insert: {
          charger_level_at_claim?: number
          claim_month: string
          claim_type: string
          created_at?: string
          frame_id: string
          friend_uuid?: string | null
          id?: string
          user_uuid: string
        }
        Update: {
          charger_level_at_claim?: number
          claim_month?: string
          claim_type?: string
          created_at?: string
          frame_id?: string
          friend_uuid?: string | null
          id?: string
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "frame_claims_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "frames"
            referencedColumns: ["id"]
          },
        ]
      }
      frames: {
        Row: {
          created_at: string
          display_order: number
          file_url: string
          id: string
          is_active: boolean
          star_level: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_url: string
          id?: string
          is_active?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_url?: string
          id?: string
          is_active?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      id_changes: {
        Row: {
          created_at: string
          id: string
          level_milestone: number
          new_id: string
          user_uuid: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_milestone: number
          new_id: string
          user_uuid: string
        }
        Update: {
          created_at?: string
          id?: string
          level_milestone?: number
          new_id?: string
          user_uuid?: string
        }
        Relationships: []
      }
      item_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          parent_id: string | null
          user_image: string | null
          user_name: string
          user_uuid: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          parent_id?: string | null
          user_image?: string | null
          user_name: string
          user_uuid: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          parent_id?: string | null
          user_image?: string | null
          user_name?: string
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "item_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      item_likes: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_uuid: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_uuid: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_uuid?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          admin_unblocked_at: string | null
          block_count: number
          blocked_until: string | null
          created_at: string
          failed_attempts: number
          id: string
          is_permanently_blocked: boolean
          target_uuid: string
          updated_at: string
        }
        Insert: {
          admin_unblocked_at?: string | null
          block_count?: number
          blocked_until?: string | null
          created_at?: string
          failed_attempts?: number
          id?: string
          is_permanently_blocked?: boolean
          target_uuid: string
          updated_at?: string
        }
        Update: {
          admin_unblocked_at?: string | null
          block_count?: number
          blocked_until?: string | null
          created_at?: string
          failed_attempts?: number
          id?: string
          is_permanently_blocked?: boolean
          target_uuid?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          target: string
          title: string
          user_uuid: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          target?: string
          title: string
          user_uuid?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          target?: string
          title?: string
          user_uuid?: string | null
        }
        Relationships: []
      }
      salary_requests: {
        Row: {
          admin_note: string | null
          amount_coins: number | null
          amount_usd: number
          created_at: string
          id: string
          payment_details: string
          payment_method: string
          recipient_country: string
          recipient_name: string
          request_type: string
          status: string
          transfer_image_url: string | null
          updated_at: string
          user_name: string
          user_phone: string | null
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          amount_coins?: number | null
          amount_usd: number
          created_at?: string
          id?: string
          payment_details: string
          payment_method: string
          recipient_country: string
          recipient_name: string
          request_type: string
          status?: string
          transfer_image_url?: string | null
          updated_at?: string
          user_name: string
          user_phone?: string | null
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          amount_coins?: number | null
          amount_usd?: number
          created_at?: string
          id?: string
          payment_details?: string
          payment_method?: string
          recipient_country?: string
          recipient_name?: string
          request_type?: string
          status?: string
          transfer_image_url?: string | null
          updated_at?: string
          user_name?: string
          user_phone?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      star_cashout_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_used: boolean
          stars_amount: number
          usd_amount: number
          used_at: string | null
          used_in_request_id: string | null
          user_name: string
          user_uuid: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_used?: boolean
          stars_amount: number
          usd_amount: number
          used_at?: string | null
          used_in_request_id?: string | null
          user_name: string
          user_uuid: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean
          stars_amount?: number
          usd_amount?: number
          used_at?: string | null
          used_in_request_id?: string | null
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      star_gift_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          recipient_uuid: string
          sender_name: string
          sender_uuid: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          recipient_uuid: string
          sender_name: string
          sender_uuid: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          recipient_uuid?: string
          sender_name?: string
          sender_uuid?: string
        }
        Relationships: []
      }
      user_star_balance: {
        Row: {
          carryover_stars: number
          created_at: string
          current_month: string
          id: string
          last_level: number
          monthly_stars: number
          total_stars: number
          updated_at: string
          user_uuid: string
        }
        Insert: {
          carryover_stars?: number
          created_at?: string
          current_month: string
          id?: string
          last_level?: number
          monthly_stars?: number
          total_stars?: number
          updated_at?: string
          user_uuid: string
        }
        Update: {
          carryover_stars?: number
          created_at?: string
          current_month?: string
          id?: string
          last_level?: number
          monthly_stars?: number
          total_stars?: number
          updated_at?: string
          user_uuid?: string
        }
        Relationships: []
      }
      video_tutorials: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
