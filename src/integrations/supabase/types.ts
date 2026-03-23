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
      account_type_changes: {
        Row: {
          created_at: string
          id: string
          new_type: number
          old_type: number
          user_name: string
          user_uuid: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_type: number
          old_type: number
          user_name?: string
          user_uuid: string
        }
        Update: {
          created_at?: string
          id?: string
          new_type?: number
          old_type?: number
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      admin_accounts: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          id: string
          is_active: boolean
          password_hash: string
          permissions: Json
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          is_active?: boolean
          password_hash: string
          permissions?: Json
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          is_active?: boolean
          password_hash?: string
          permissions?: Json
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_role: string
          admin_username: string
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_role: string
          admin_username: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_role?: string
          admin_username?: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: []
      }
      admin_chat_messages: {
        Row: {
          created_at: string
          deleted_by: string | null
          id: string
          is_deleted: boolean
          media_url: string | null
          message: string
          message_type: string
          sender_display_name: string
          sender_username: string
        }
        Insert: {
          created_at?: string
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          media_url?: string | null
          message: string
          message_type?: string
          sender_display_name?: string
          sender_username: string
        }
        Update: {
          created_at?: string
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          media_url?: string | null
          message?: string
          message_type?: string
          sender_display_name?: string
          sender_username?: string
        }
        Relationships: []
      }
      admin_complaints: {
        Row: {
          admin_name: string | null
          admin_username: string
          created_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          owner_notes: string | null
          reason: string
          reporter_name: string | null
          reporter_uuid: string
          status: string | null
          voice_url: string | null
        }
        Insert: {
          admin_name?: string | null
          admin_username: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          owner_notes?: string | null
          reason: string
          reporter_name?: string | null
          reporter_uuid: string
          status?: string | null
          voice_url?: string | null
        }
        Update: {
          admin_name?: string | null
          admin_username?: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          owner_notes?: string | null
          reason?: string
          reporter_name?: string | null
          reporter_uuid?: string
          status?: string | null
          voice_url?: string | null
        }
        Relationships: []
      }
      admin_host_requests: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          created_at: string
          id: string
          image_url: string | null
          notes: string | null
          reject_reason: string | null
          request_type: string
          status: string
          submitted_by: string
          submitted_by_name: string
          updated_at: string
          user_uuid: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          reject_reason?: string | null
          request_type?: string
          status?: string
          submitted_by?: string
          submitted_by_name?: string
          updated_at?: string
          user_uuid: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          notes?: string | null
          reject_reason?: string | null
          request_type?: string
          status?: string
          submitted_by?: string
          submitted_by_name?: string
          updated_at?: string
          user_uuid?: string
        }
        Relationships: []
      }
      admin_post_comments: {
        Row: {
          comment: string
          commenter_name: string
          commenter_uuid: string | null
          created_at: string | null
          id: string
          is_admin: boolean | null
          post_id: string
        }
        Insert: {
          comment: string
          commenter_name?: string
          commenter_uuid?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          post_id: string
        }
        Update: {
          comment?: string
          commenter_name?: string
          commenter_uuid?: string | null
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "admin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_post_likes: {
        Row: {
          created_at: string | null
          id: string
          liker_name: string | null
          liker_uuid: string
          post_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          liker_name?: string | null
          liker_uuid: string
          post_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          liker_name?: string | null
          liker_uuid?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "admin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_posts: {
        Row: {
          caption: string | null
          content_type: string
          created_at: string | null
          id: string
          likes_count: number | null
          media_url: string | null
          thumbnail_url: string | null
          user_uuid: string
          username: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          content_type: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_url?: string | null
          thumbnail_url?: string | null
          user_uuid: string
          username: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          content_type?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_url?: string | null
          thumbnail_url?: string | null
          user_uuid?: string
          username?: string
          views_count?: number | null
        }
        Relationships: []
      }
      admin_ratings: {
        Row: {
          admin_name: string | null
          admin_username: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          service_type: string | null
          user_name: string | null
          user_uuid: string
        }
        Insert: {
          admin_name?: string | null
          admin_username: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          service_type?: string | null
          user_name?: string | null
          user_uuid: string
        }
        Update: {
          admin_name?: string | null
          admin_username?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          service_type?: string | null
          user_name?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      admin_shifts: {
        Row: {
          admin_display_name: string
          admin_username: string
          created_at: string
          id: string
          is_active: boolean
          phone_number: string | null
          role_type: string
          shift_end: string
          shift_start: string
          updated_at: string
        }
        Insert: {
          admin_display_name?: string
          admin_username: string
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number?: string | null
          role_type?: string
          shift_end: string
          shift_start: string
          updated_at?: string
        }
        Update: {
          admin_display_name?: string
          admin_username?: string
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number?: string | null
          role_type?: string
          shift_end?: string
          shift_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_stories: {
        Row: {
          created_at: string | null
          duration: number | null
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_uuid: string
          username: string
          views: Json | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          expires_at: string
          id?: string
          media_type: string
          media_url: string
          user_uuid: string
          username: string
          views?: Json | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_uuid?: string
          username?: string
          views?: Json | null
        }
        Relationships: []
      }
      agent_vip_overrides: {
        Row: {
          agent_name: string
          agent_uuid: string
          created_at: string
          id: string
          updated_at: string
          vip4_limit: number
          vip5_limit: number
          vip6_limit: number
        }
        Insert: {
          agent_name?: string
          agent_uuid: string
          created_at?: string
          id?: string
          updated_at?: string
          vip4_limit?: number
          vip5_limit?: number
          vip6_limit?: number
        }
        Update: {
          agent_name?: string
          agent_uuid?: string
          created_at?: string
          id?: string
          updated_at?: string
          vip4_limit?: number
          vip5_limit?: number
          vip6_limit?: number
        }
        Relationships: []
      }
      animated_photo_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          duration_label: string
          gif_url: string
          id: string
          is_final_rejection: boolean
          max_level: number
          rejection_image_url: string | null
          status: string
          user_name: string
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          duration_label: string
          gif_url: string
          id?: string
          is_final_rejection?: boolean
          max_level?: number
          rejection_image_url?: string | null
          status?: string
          user_name: string
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          duration_label?: string
          gif_url?: string
          id?: string
          is_final_rejection?: boolean
          max_level?: number
          rejection_image_url?: string | null
          status?: string
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
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
      banners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bd_commission_logs: {
        Row: {
          amount: number
          bd_uuid: string
          commission_pct: number
          created_at: string
          id: string
          member_type: string
          member_uuid: string
          month: string
          source_amount: number
        }
        Insert: {
          amount?: number
          bd_uuid: string
          commission_pct?: number
          created_at?: string
          id?: string
          member_type: string
          member_uuid: string
          month: string
          source_amount?: number
        }
        Update: {
          amount?: number
          bd_uuid?: string
          commission_pct?: number
          created_at?: string
          id?: string
          member_type?: string
          member_uuid?: string
          month?: string
          source_amount?: number
        }
        Relationships: []
      }
      bd_commission_settings: {
        Row: {
          agency_commission_pct: number
          available_balance: number
          banned_at: string | null
          bd_name: string
          bd_uuid: string
          created_at: string
          current_month_earnings: number
          external_available_profit: number
          external_last_update: string | null
          external_pending_profit: number
          external_profit_difference: number
          external_profit_status: string
          external_total_profit: number
          host_commission_pct: number
          id: string
          is_active: boolean
          is_approved: boolean
          monthly_goal: number
          referral_code: string
          total_earned: number
          updated_at: string
          user_commission_pct: number
          withdraw_exempt: boolean
        }
        Insert: {
          agency_commission_pct?: number
          available_balance?: number
          banned_at?: string | null
          bd_name?: string
          bd_uuid: string
          created_at?: string
          current_month_earnings?: number
          external_available_profit?: number
          external_last_update?: string | null
          external_pending_profit?: number
          external_profit_difference?: number
          external_profit_status?: string
          external_total_profit?: number
          host_commission_pct?: number
          id?: string
          is_active?: boolean
          is_approved?: boolean
          monthly_goal?: number
          referral_code?: string
          total_earned?: number
          updated_at?: string
          user_commission_pct?: number
          withdraw_exempt?: boolean
        }
        Update: {
          agency_commission_pct?: number
          available_balance?: number
          banned_at?: string | null
          bd_name?: string
          bd_uuid?: string
          created_at?: string
          current_month_earnings?: number
          external_available_profit?: number
          external_last_update?: string | null
          external_pending_profit?: number
          external_profit_difference?: number
          external_profit_status?: string
          external_total_profit?: number
          host_commission_pct?: number
          id?: string
          is_active?: boolean
          is_approved?: boolean
          monthly_goal?: number
          referral_code?: string
          total_earned?: number
          updated_at?: string
          user_commission_pct?: number
          withdraw_exempt?: boolean
        }
        Relationships: []
      }
      bd_event_registrations: {
        Row: {
          bd_uuid: string
          created_at: string
          event_id: string
          id: string
          user_name: string
          user_type: number
          user_uuid: string
        }
        Insert: {
          bd_uuid: string
          created_at?: string
          event_id: string
          id?: string
          user_name?: string
          user_type?: number
          user_uuid: string
        }
        Update: {
          bd_uuid?: string
          created_at?: string
          event_id?: string
          id?: string
          user_name?: string
          user_type?: number
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "bd_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "bd_events"
            referencedColumns: ["id"]
          },
        ]
      }
      bd_events: {
        Row: {
          bd_name: string
          bd_uuid: string
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          bd_name?: string
          bd_uuid: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          bd_name?: string
          bd_uuid?: string
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bd_member_invitations: {
        Row: {
          bd_name: string
          bd_referral_code: string
          bd_uuid: string
          created_at: string
          id: string
          member_name: string
          member_type: string
          member_uuid: string
          status: string
          terms_accepted: boolean
          updated_at: string
        }
        Insert: {
          bd_name?: string
          bd_referral_code?: string
          bd_uuid: string
          created_at?: string
          id?: string
          member_name?: string
          member_type?: string
          member_uuid: string
          status?: string
          terms_accepted?: boolean
          updated_at?: string
        }
        Update: {
          bd_name?: string
          bd_referral_code?: string
          bd_uuid?: string
          created_at?: string
          id?: string
          member_name?: string
          member_type?: string
          member_uuid?: string
          status?: string
          terms_accepted?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bd_members: {
        Row: {
          bd_uuid: string
          created_at: string
          current_month_commission: number
          custom_commission_pct: number | null
          id: string
          initial_charger_num: number
          is_active: boolean
          last_daily_charges: number
          last_processed_diamonds: number
          member_name: string
          member_type: string
          member_uuid: string
          monthly_charges: number
          total_commission: number
          type_user: number
          updated_at: string
        }
        Insert: {
          bd_uuid: string
          created_at?: string
          current_month_commission?: number
          custom_commission_pct?: number | null
          id?: string
          initial_charger_num?: number
          is_active?: boolean
          last_daily_charges?: number
          last_processed_diamonds?: number
          member_name?: string
          member_type?: string
          member_uuid: string
          monthly_charges?: number
          total_commission?: number
          type_user?: number
          updated_at?: string
        }
        Update: {
          bd_uuid?: string
          created_at?: string
          current_month_commission?: number
          custom_commission_pct?: number | null
          id?: string
          initial_charger_num?: number
          is_active?: boolean
          last_daily_charges?: number
          last_processed_diamonds?: number
          member_name?: string
          member_type?: string
          member_uuid?: string
          monthly_charges?: number
          total_commission?: number
          type_user?: number
          updated_at?: string
        }
        Relationships: []
      }
      bd_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          sent_by: string | null
          target_uuid: string
          title: string
          type: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          sent_by?: string | null
          target_uuid: string
          title: string
          type?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          sent_by?: string | null
          target_uuid?: string
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      bd_registration_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_level: number
          user_name: string
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_level?: number
          user_name?: string
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_level?: number
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      bd_requests_cache: {
        Row: {
          admin_note: string | null
          created_at: string
          details: Json | null
          id: string
          is_final_rejection: boolean
          rejection_image_url: string | null
          request_type: string
          status: number
          updated_at: string
          user_name: string
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: Json | null
          id: string
          is_final_rejection?: boolean
          rejection_image_url?: string | null
          request_type?: string
          status?: number
          updated_at?: string
          user_name?: string
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          is_final_rejection?: boolean
          rejection_image_url?: string | null
          request_type?: string
          status?: number
          updated_at?: string
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      bd_violations: {
        Row: {
          bd_name: string
          bd_uuid: string
          created_at: string
          details: string | null
          id: string
          member_name: string
          member_uuid: string
          violation_type: string
        }
        Insert: {
          bd_name?: string
          bd_uuid: string
          created_at?: string
          details?: string | null
          id?: string
          member_name?: string
          member_uuid: string
          violation_type?: string
        }
        Update: {
          bd_name?: string
          bd_uuid?: string
          created_at?: string
          details?: string | null
          id?: string
          member_name?: string
          member_uuid?: string
          violation_type?: string
        }
        Relationships: []
      }
      bd_withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          approved_at: string | null
          bd_name: string
          bd_uuid: string
          completed_at: string | null
          country: string | null
          created_at: string
          id: string
          receipt_url: string | null
          recipient_name: string | null
          recipient_phone: string | null
          rejected_at: string | null
          status: string
          transfer_number: string | null
          transfer_type: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          bd_name?: string
          bd_uuid: string
          completed_at?: string | null
          country?: string | null
          created_at?: string
          id?: string
          receipt_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          rejected_at?: string | null
          status?: string
          transfer_number?: string | null
          transfer_type?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          approved_at?: string | null
          bd_name?: string
          bd_uuid?: string
          completed_at?: string | null
          country?: string | null
          created_at?: string
          id?: string
          receipt_url?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          rejected_at?: string | null
          status?: string
          transfer_number?: string | null
          transfer_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          participants: Json
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participants?: Json
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participants?: Json
          type?: string
        }
        Relationships: []
      }
      custom_gifts: {
        Row: {
          admin_note: string | null
          charger_level_at_upload: number
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean
          is_final_rejection: boolean
          max_duration_allowed: number
          rejection_image_url: string | null
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
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_final_rejection?: boolean
          max_duration_allowed?: number
          rejection_image_url?: string | null
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
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean
          is_final_rejection?: boolean
          max_duration_allowed?: number
          rejection_image_url?: string | null
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
      direct_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          media_url: string | null
          message_type: string
          reply_to: string | null
          sender_avatar: string | null
          sender_name: string | null
          sender_uuid: string
          status: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          sender_avatar?: string | null
          sender_name?: string | null
          sender_uuid: string
          status?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          sender_avatar?: string | null
          sender_name?: string | null
          sender_uuid?: string
          status?: string
        }
        Relationships: []
      }
      edge_function_cache: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          value: Json
        }
        Insert: {
          created_at?: string
          expires_at: string
          key: string
          value: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          value?: Json
        }
        Relationships: []
      }
      entry_gift_claims: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          charger_level_at_claim: number
          claim_month: string
          claim_type: string
          created_at: string
          duration_days: number | null
          file_url: string | null
          friend_uuid: string | null
          gift_id: string
          gift_usage: string
          id: string
          status: string | null
          title: string | null
          user_uuid: string
          ware_type: string | null
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          charger_level_at_claim?: number
          claim_month: string
          claim_type: string
          created_at?: string
          duration_days?: number | null
          file_url?: string | null
          friend_uuid?: string | null
          gift_id: string
          gift_usage: string
          id?: string
          status?: string | null
          title?: string | null
          user_uuid: string
          ware_type?: string | null
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          charger_level_at_claim?: number
          claim_month?: string
          claim_type?: string
          created_at?: string
          duration_days?: number | null
          file_url?: string | null
          friend_uuid?: string | null
          gift_id?: string
          gift_usage?: string
          id?: string
          status?: string | null
          title?: string | null
          user_uuid?: string
          ware_type?: string | null
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
          deleted_at: string | null
          display_order: number
          gift_type: string
          id: string
          is_active: boolean
          is_deleted: boolean
          star_level: number
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          gift_type?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          gift_type?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      frame_claims: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          charger_level_at_claim: number
          claim_month: string
          claim_type: string
          created_at: string
          duration_days: number | null
          file_url: string | null
          frame_id: string
          friend_uuid: string | null
          id: string
          status: string | null
          title: string | null
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          charger_level_at_claim?: number
          claim_month: string
          claim_type: string
          created_at?: string
          duration_days?: number | null
          file_url?: string | null
          frame_id: string
          friend_uuid?: string | null
          id?: string
          status?: string | null
          title?: string | null
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          charger_level_at_claim?: number
          claim_month?: string
          claim_type?: string
          created_at?: string
          duration_days?: number | null
          file_url?: string | null
          frame_id?: string
          friend_uuid?: string | null
          id?: string
          status?: string | null
          title?: string | null
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
          deleted_at: string | null
          display_order: number
          file_url: string
          id: string
          is_active: boolean
          is_deleted: boolean
          star_level: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          file_url: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          file_url?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          star_level?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      hair_selections: {
        Row: {
          admin_note: string | null
          created_at: string
          hair_id: string
          id: string
          selection_week: string
          status: string
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          hair_id: string
          id?: string
          selection_week: string
          status?: string
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          hair_id?: string
          id?: string
          selection_week?: string
          status?: string
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "hair_selections_hair_id_fkey"
            columns: ["hair_id"]
            isOneToOne: false
            referencedRelation: "hairs"
            referencedColumns: ["id"]
          },
        ]
      }
      hairs: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          file_url: string
          id: string
          is_active: boolean
          is_deleted: boolean
          star_cost: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          file_url: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          star_cost?: number
          thumbnail_url?: string | null
          title?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          file_url?: string
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          star_cost?: number
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
      manual_bans: {
        Row: {
          ban_type: string
          banned_by: string
          banned_elements: string[] | null
          created_at: string
          duration_hours: number
          id: string
          reason: string | null
          status: string
          target_uuid: string
          unbanned_at: string | null
          unbanned_by: string | null
        }
        Insert: {
          ban_type?: string
          banned_by?: string
          banned_elements?: string[] | null
          created_at?: string
          duration_hours?: number
          id?: string
          reason?: string | null
          status?: string
          target_uuid: string
          unbanned_at?: string | null
          unbanned_by?: string | null
        }
        Update: {
          ban_type?: string
          banned_by?: string
          banned_elements?: string[] | null
          created_at?: string
          duration_hours?: number
          id?: string
          reason?: string | null
          status?: string
          target_uuid?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
        }
        Relationships: []
      }
      monitor_alerts: {
        Row: {
          alert_type: string
          amount: number | null
          created_at: string | null
          details: Json | null
          id: string
          is_read: boolean | null
          receiver_uuid: string | null
          sender_uuid: string | null
        }
        Insert: {
          alert_type: string
          amount?: number | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          receiver_uuid?: string | null
          sender_uuid?: string | null
        }
        Update: {
          alert_type?: string
          amount?: number | null
          created_at?: string | null
          details?: Json | null
          id?: string
          is_read?: boolean | null
          receiver_uuid?: string | null
          sender_uuid?: string | null
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
          type: string | null
          user_uuid: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          target?: string
          title: string
          type?: string | null
          user_uuid?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          target?: string
          title?: string
          type?: string | null
          user_uuid?: string | null
        }
        Relationships: []
      }
      portal_bans: {
        Row: {
          ban_type: string
          banned_by: string | null
          created_at: string | null
          duration: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          service: string | null
          uuid: string
        }
        Insert: {
          ban_type: string
          banned_by?: string | null
          created_at?: string | null
          duration?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          service?: string | null
          uuid: string
        }
        Update: {
          ban_type?: string
          banned_by?: string | null
          created_at?: string | null
          duration?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          service?: string | null
          uuid?: string
        }
        Relationships: []
      }
      quick_support_requests: {
        Row: {
          attachment_url: string | null
          created_at: string
          description: string | null
          id: string
          phone_number: string | null
          request_type: string
          room_code: string | null
          status: string
          user_name: string
          user_uuid: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          phone_number?: string | null
          request_type: string
          room_code?: string | null
          status?: string
          user_name?: string
          user_uuid: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          phone_number?: string | null
          request_type?: string
          room_code?: string | null
          status?: string
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      room_background_codes: {
        Row: {
          code: string
          created_at: string | null
          creator_uuid: string
          id: string
          month: string
          used_at: string | null
          used_by_uuid: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          creator_uuid: string
          id?: string
          month: string
          used_at?: string | null
          used_by_uuid?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          creator_uuid?: string
          id?: string
          month?: string
          used_at?: string | null
          used_by_uuid?: string | null
        }
        Relationships: []
      }
      room_background_requests: {
        Row: {
          admin_note: string | null
          created_at: string | null
          gift_code: string | null
          id: string
          image_url: string | null
          month: string
          request_type: string
          status: string | null
          user_name: string | null
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          gift_code?: string | null
          id?: string
          image_url?: string | null
          month: string
          request_type: string
          status?: string | null
          user_name?: string | null
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          gift_code?: string | null
          id?: string
          image_url?: string | null
          month?: string
          request_type?: string
          status?: string | null
          user_name?: string | null
          user_uuid?: string
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
          is_final_rejection: boolean
          payment_details: string
          payment_method: string
          recipient_country: string
          recipient_name: string
          rejection_image_url: string | null
          request_type: string
          status: string
          target_name: string | null
          target_uuid: string | null
          transaction_date: string | null
          transaction_id: string | null
          transfer_id: string | null
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
          is_final_rejection?: boolean
          payment_details: string
          payment_method: string
          recipient_country: string
          recipient_name: string
          rejection_image_url?: string | null
          request_type: string
          status?: string
          target_name?: string | null
          target_uuid?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          transfer_id?: string | null
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
          is_final_rejection?: boolean
          payment_details?: string
          payment_method?: string
          recipient_country?: string
          recipient_name?: string
          rejection_image_url?: string | null
          request_type?: string
          status?: string
          target_name?: string | null
          target_uuid?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          transfer_id?: string | null
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
      support_chat_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          updated_at: string | null
          user_uuid: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          updated_at?: string | null
          user_uuid: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          updated_at?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      support_chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_read: boolean
          media_url: string | null
          message: string
          sender_name: string
          sender_type: string
          sender_uuid: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          message: string
          sender_name: string
          sender_type?: string
          sender_uuid: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          media_url?: string | null
          message?: string
          sender_name?: string
          sender_type?: string
          sender_uuid?: string
        }
        Relationships: []
      }
      support_chat_sessions: {
        Row: {
          admin_username: string | null
          created_at: string
          id: string
          room_id: string | null
          status: string
          updated_at: string
          user_name: string
          user_uuid: string
          vip_level: number
        }
        Insert: {
          admin_username?: string | null
          created_at?: string
          id?: string
          room_id?: string | null
          status?: string
          updated_at?: string
          user_name: string
          user_uuid: string
          vip_level?: number
        }
        Update: {
          admin_username?: string | null
          created_at?: string
          id?: string
          room_id?: string | null
          status?: string
          updated_at?: string
          user_name?: string
          user_uuid?: string
          vip_level?: number
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          request_id: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          request_id: string
          sender_name?: string
          sender_type?: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          request_id?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "quick_support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ratings: {
        Row: {
          admin_username: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          session_id: string | null
          ticket_id: string | null
          user_uuid: string
        }
        Insert: {
          admin_username: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          session_id?: string | null
          ticket_id?: string | null
          user_uuid: string
        }
        Update: {
          admin_username?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          session_id?: string | null
          ticket_id?: string | null
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_session_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_name: string
          sender_type: string
          sender_uuid: string
          session_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_name?: string
          sender_type?: string
          sender_uuid: string
          session_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_name?: string
          sender_type?: string
          sender_uuid?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_session_participants: {
        Row: {
          admin_display_name: string
          admin_username: string
          id: string
          joined_at: string
          role_type: string
          session_id: string
        }
        Insert: {
          admin_display_name?: string
          admin_username: string
          id?: string
          joined_at?: string
          role_type?: string
          session_id: string
        }
        Update: {
          admin_display_name?: string
          admin_username?: string
          id?: string
          joined_at?: string
          role_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "support_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          admin_note: string | null
          assigned_admin: string | null
          assigned_admin_name: string | null
          created_at: string
          escalation_level: number
          file_type: string | null
          file_url: string | null
          id: string
          last_message_at: string | null
          notes: string | null
          request_type: string | null
          resolved_at: string | null
          room_name: string | null
          status: string
          support_level: number
          updated_at: string
          user_name: string
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          assigned_admin?: string | null
          assigned_admin_name?: string | null
          created_at?: string
          escalation_level?: number
          file_type?: string | null
          file_url?: string | null
          id?: string
          last_message_at?: string | null
          notes?: string | null
          request_type?: string | null
          resolved_at?: string | null
          room_name?: string | null
          status?: string
          support_level?: number
          updated_at?: string
          user_name?: string
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          assigned_admin?: string | null
          assigned_admin_name?: string | null
          created_at?: string
          escalation_level?: number
          file_type?: string | null
          file_url?: string | null
          id?: string
          last_message_at?: string | null
          notes?: string | null
          request_type?: string | null
          resolved_at?: string | null
          room_name?: string | null
          status?: string
          support_level?: number
          updated_at?: string
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          admin_username: string | null
          created_at: string
          description: string
          id: string
          priority: string
          replied_at: string | null
          status: string
          subject: string
          ticket_type: string
          updated_at: string
          user_name: string
          user_uuid: string
        }
        Insert: {
          admin_reply?: string | null
          admin_username?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          replied_at?: string | null
          status?: string
          subject: string
          ticket_type?: string
          updated_at?: string
          user_name: string
          user_uuid: string
        }
        Update: {
          admin_reply?: string | null
          admin_username?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          replied_at?: string | null
          status?: string
          subject?: string
          ticket_type?: string
          updated_at?: string
          user_name?: string
          user_uuid?: string
        }
        Relationships: []
      }
      supporter_challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_amount: number
          id: string
          started_at: string
          status: string
          user_uuid: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          started_at?: string
          status?: string
          user_uuid: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          started_at?: string
          status?: string
          user_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "supporter_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "supporter_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      supporter_challenges: {
        Row: {
          challenge_type: string
          color: string | null
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          reward_description: string | null
          reward_type: string
          reward_value: number
          target_amount: number
          title: string
        }
        Insert: {
          challenge_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          reward_description?: string | null
          reward_type?: string
          reward_value?: number
          target_amount?: number
          title: string
        }
        Update: {
          challenge_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          reward_description?: string | null
          reward_type?: string
          reward_value?: number
          target_amount?: number
          title?: string
        }
        Relationships: []
      }
      supporter_monthly_charges: {
        Row: {
          id: string
          month: string
          tier_name: string | null
          total_coins: number | null
          updated_at: string | null
          uuid: string
        }
        Insert: {
          id?: string
          month: string
          tier_name?: string | null
          total_coins?: number | null
          updated_at?: string | null
          uuid: string
        }
        Update: {
          id?: string
          month?: string
          tier_name?: string | null
          total_coins?: number | null
          updated_at?: string | null
          uuid?: string
        }
        Relationships: []
      }
      supporter_rewards: {
        Row: {
          count: number | null
          created_at: string | null
          duration_days: number | null
          expires_at: string | null
          id: string
          item_duration_days: number | null
          item_expires_at: string | null
          month: string
          status: string | null
          tier_id: string | null
          tier_name: string | null
          type: string
          use_expires_at: string | null
          used_at: string | null
          used_for: string | null
          used_for_uuid: string | null
          uuid: string
          value: number | null
          ware_id: number | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          item_duration_days?: number | null
          item_expires_at?: string | null
          month: string
          status?: string | null
          tier_id?: string | null
          tier_name?: string | null
          type: string
          use_expires_at?: string | null
          used_at?: string | null
          used_for?: string | null
          used_for_uuid?: string | null
          uuid: string
          value?: number | null
          ware_id?: number | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          item_duration_days?: number | null
          item_expires_at?: string | null
          month?: string
          status?: string | null
          tier_id?: string | null
          tier_name?: string | null
          type?: string
          use_expires_at?: string | null
          used_at?: string | null
          used_for?: string | null
          used_for_uuid?: string | null
          uuid?: string
          value?: number | null
          ware_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supporter_rewards_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "supporter_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      supporter_settings: {
        Row: {
          coins_mode: string | null
          default_use_validity_days: number | null
          distribution_mode: string | null
          id: string
          is_active: boolean | null
          notify_admin: boolean | null
          notify_user: boolean | null
          notify_whatsapp: boolean | null
          reminder_days: number | null
          reminder_days_before: number | null
          reward_validity_days: number | null
          special_offers: Json | null
          updated_at: string | null
        }
        Insert: {
          coins_mode?: string | null
          default_use_validity_days?: number | null
          distribution_mode?: string | null
          id?: string
          is_active?: boolean | null
          notify_admin?: boolean | null
          notify_user?: boolean | null
          notify_whatsapp?: boolean | null
          reminder_days?: number | null
          reminder_days_before?: number | null
          reward_validity_days?: number | null
          special_offers?: Json | null
          updated_at?: string | null
        }
        Update: {
          coins_mode?: string | null
          default_use_validity_days?: number | null
          distribution_mode?: string | null
          id?: string
          is_active?: boolean | null
          notify_admin?: boolean | null
          notify_user?: boolean | null
          notify_whatsapp?: boolean | null
          reminder_days?: number | null
          reminder_days_before?: number | null
          reward_validity_days?: number | null
          special_offers?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supporter_tiers: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          min_coins: number
          name: string
          rewards: Json | null
          sort_order: number | null
          use_validity_days: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_coins: number
          name: string
          rewards?: Json | null
          sort_order?: number | null
          use_validity_days?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          min_coins?: number
          name?: string
          rewards?: Json | null
          sort_order?: number | null
          use_validity_days?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          sender_name?: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_replies: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_name?: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_name?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      used_charge_ids: {
        Row: {
          amount_usd: number
          charge_id: string
          created_at: string
          id: string
          salary_request_id: string | null
          user_uuid: string
        }
        Insert: {
          amount_usd: number
          charge_id: string
          created_at?: string
          id?: string
          salary_request_id?: string | null
          user_uuid: string
        }
        Update: {
          amount_usd?: number
          charge_id?: string
          created_at?: string
          id?: string
          salary_request_id?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          updated_at: string
          user_uuid: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          updated_at?: string
          user_uuid: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          updated_at?: string
          user_uuid?: string
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
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_deleted: boolean
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      vip_requests: {
        Row: {
          created_at: string
          id: string
          recipient_uuid: string | null
          request_month: string
          type_user: number | null
          user_name: string
          user_uuid: string
          vip_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_uuid?: string | null
          request_month: string
          type_user?: number | null
          user_name?: string
          user_uuid: string
          vip_level: number
        }
        Update: {
          created_at?: string
          id?: string
          recipient_uuid?: string | null
          request_month?: string
          type_user?: number | null
          user_name?: string
          user_uuid?: string
          vip_level?: number
        }
        Relationships: []
      }
      works_abuse_log: {
        Row: {
          action: string
          attempt_number: number | null
          created_at: string | null
          id: string
          reason: string | null
          user_uuid: string
        }
        Insert: {
          action: string
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          reason?: string | null
          user_uuid: string
        }
        Update: {
          action?: string
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          reason?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      works_accounts: {
        Row: {
          agent_commission_pct: number | null
          auto_approve_withdrawals: boolean | null
          balance_usd: number | null
          can_withdraw: boolean | null
          created_at: string | null
          deleted_at: string | null
          id: string
          status: string | null
          supporter_commission_pct: number | null
          total_earnings_usd: number | null
          updated_at: string | null
          user_name: string | null
          user_uuid: string
          works_code: string
        }
        Insert: {
          agent_commission_pct?: number | null
          auto_approve_withdrawals?: boolean | null
          balance_usd?: number | null
          can_withdraw?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          status?: string | null
          supporter_commission_pct?: number | null
          total_earnings_usd?: number | null
          updated_at?: string | null
          user_name?: string | null
          user_uuid: string
          works_code: string
        }
        Update: {
          agent_commission_pct?: number | null
          auto_approve_withdrawals?: boolean | null
          balance_usd?: number | null
          can_withdraw?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          status?: string | null
          supporter_commission_pct?: number | null
          total_earnings_usd?: number | null
          updated_at?: string | null
          user_name?: string | null
          user_uuid?: string
          works_code?: string
        }
        Relationships: []
      }
      works_ban_requests: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          reason: string | null
          reviewed_by: string | null
          status: string | null
          user_uuid: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          reason?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_uuid: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          reason?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      works_commission_logs: {
        Row: {
          amount: number | null
          bd_uuid: string
          commission_pct: number | null
          created_at: string | null
          description: string | null
          id: string
          member_type: string | null
          member_uuid: string | null
          month: string | null
          source_amount: number | null
          works_id: string | null
        }
        Insert: {
          amount?: number | null
          bd_uuid: string
          commission_pct?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_type?: string | null
          member_uuid?: string | null
          month?: string | null
          source_amount?: number | null
          works_id?: string | null
        }
        Update: {
          amount?: number | null
          bd_uuid?: string
          commission_pct?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_type?: string | null
          member_uuid?: string | null
          month?: string | null
          source_amount?: number | null
          works_id?: string | null
        }
        Relationships: []
      }
      works_earnings: {
        Row: {
          commission_pct: number
          commission_usd: number
          created_at: string | null
          id: string
          member_activity_usd: number | null
          member_id: string | null
          member_uuid: string
          period_date: string
          source: string | null
          works_id: string | null
        }
        Insert: {
          commission_pct: number
          commission_usd: number
          created_at?: string | null
          id?: string
          member_activity_usd?: number | null
          member_id?: string | null
          member_uuid: string
          period_date: string
          source?: string | null
          works_id?: string | null
        }
        Update: {
          commission_pct?: number
          commission_usd?: number
          created_at?: string | null
          id?: string
          member_activity_usd?: number | null
          member_id?: string | null
          member_uuid?: string
          period_date?: string
          source?: string | null
          works_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "works_earnings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "works_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_earnings_works_id_fkey"
            columns: ["works_id"]
            isOneToOne: false
            referencedRelation: "works_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      works_invitations: {
        Row: {
          created_at: string | null
          id: string
          inviter_code: string | null
          inviter_name: string | null
          inviter_uuid: string | null
          member_type: string | null
          status: string | null
          target_name: string | null
          target_uuid: string | null
          terms_accepted: boolean | null
          updated_at: string | null
          works_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inviter_code?: string | null
          inviter_name?: string | null
          inviter_uuid?: string | null
          member_type?: string | null
          status?: string | null
          target_name?: string | null
          target_uuid?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          works_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inviter_code?: string | null
          inviter_name?: string | null
          inviter_uuid?: string | null
          member_type?: string | null
          status?: string | null
          target_name?: string | null
          target_uuid?: string | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          works_id?: string | null
        }
        Relationships: []
      }
      works_members: {
        Row: {
          agency_id: string | null
          commission_pct: number | null
          created_at: string | null
          id: string
          joined_at: string | null
          member_name: string | null
          member_type: string
          member_uuid: string
          status: string | null
          total_commission_usd: number | null
          works_id: string | null
        }
        Insert: {
          agency_id?: string | null
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_name?: string | null
          member_type: string
          member_uuid: string
          status?: string | null
          total_commission_usd?: number | null
          works_id?: string | null
        }
        Update: {
          agency_id?: string | null
          commission_pct?: number | null
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_name?: string | null
          member_type?: string
          member_uuid?: string
          status?: string | null
          total_commission_usd?: number | null
          works_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "works_members_works_id_fkey"
            columns: ["works_id"]
            isOneToOne: false
            referencedRelation: "works_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      works_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          sent_by: string | null
          target_uuid: string | null
          title: string | null
          type: string | null
          works_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          sent_by?: string | null
          target_uuid?: string | null
          title?: string | null
          type?: string | null
          works_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          sent_by?: string | null
          target_uuid?: string | null
          title?: string | null
          type?: string | null
          works_id?: string | null
        }
        Relationships: []
      }
      works_requests: {
        Row: {
          admin_note: string | null
          created_at: string | null
          id: string
          status: string | null
          user_level: number | null
          user_name: string | null
          user_uuid: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_level?: number | null
          user_name?: string | null
          user_uuid: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_level?: number | null
          user_name?: string | null
          user_uuid?: string
        }
        Relationships: []
      }
      works_withdrawals: {
        Row: {
          admin_note: string | null
          amount_coins: number
          amount_usd: number
          created_at: string | null
          id: string
          recipient_uuid: string
          status: string | null
          user_uuid: string
          works_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_coins: number
          amount_usd: number
          created_at?: string | null
          id?: string
          recipient_uuid: string
          status?: string | null
          user_uuid: string
          works_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_coins?: number
          amount_usd?: number
          created_at?: string | null
          id?: string
          recipient_uuid?: string
          status?: string | null
          user_uuid?: string
          works_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "works_withdrawals_works_id_fkey"
            columns: ["works_id"]
            isOneToOne: false
            referencedRelation: "works_accounts"
            referencedColumns: ["id"]
          },
        ]
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
