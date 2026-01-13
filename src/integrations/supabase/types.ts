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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      food_scans: {
        Row: {
          created_at: string
          id: string
          image_path: string
          image_url: string | null
          language: string
          result_json: Json
          serving: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          image_url?: string | null
          language?: string
          result_json: Json
          serving?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          image_url?: string | null
          language?: string
          result_json?: Json
          serving?: number
          user_id?: string
        }
        Relationships: []
      }
      free_scan_sessions: {
        Row: {
          created_at: string
          daily_limit: number | null
          daily_remaining: number | null
          id: string
          last_reset_at: string | null
          session_id: string | null
          total_limit: number | null
          total_remaining: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          daily_remaining?: number | null
          id?: string
          last_reset_at?: string | null
          session_id?: string | null
          total_limit?: number | null
          total_remaining?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          daily_remaining?: number | null
          id?: string
          last_reset_at?: string | null
          session_id?: string | null
          total_limit?: number | null
          total_remaining?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          language: string
          plan: Json
          share_id: string | null
          target_weight: number | null
          timeframe_weeks: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          language?: string
          plan: Json
          share_id?: string | null
          target_weight?: number | null
          timeframe_weeks?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          language?: string
          plan?: Json
          share_id?: string | null
          target_weight?: number | null
          timeframe_weeks?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          features: Json | null
          id: string
          interval: string
          is_active: boolean
          is_popular: boolean
          name: string
          not_included: string | null
          previous_price_cents: number | null
          price_cents: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          not_included?: string | null
          previous_price_cents?: number | null
          price_cents?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          not_included?: string | null
          previous_price_cents?: number | null
          price_cents?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          current_period_end: string | null
          id: string
          is_active: boolean
          platform_plan_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          platform_plan_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          platform_plan_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_subscriptions_platform_plan_id_fkey"
            columns: ["platform_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          default_language: string
          email: string
          full_name: string | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          platform_subscription_id: string | null
          platform_subscription_plan_id: string | null
          platform_subscription_type:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          updated_at: string
          weight_kg: number | null
          widget_site_limit: number | null
          widget_subscription_id: string | null
          widget_subscription_type:
            | Database["public"]["Enums"]["widget_subscription_type"]
            | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          default_language?: string
          email: string
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id: string
          platform_subscription_id?: string | null
          platform_subscription_plan_id?: string | null
          platform_subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          updated_at?: string
          weight_kg?: number | null
          widget_site_limit?: number | null
          widget_subscription_id?: string | null
          widget_subscription_type?:
            | Database["public"]["Enums"]["widget_subscription_type"]
            | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          default_language?: string
          email?: string
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          platform_subscription_id?: string | null
          platform_subscription_plan_id?: string | null
          platform_subscription_type?:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          updated_at?: string
          weight_kg?: number | null
          widget_site_limit?: number | null
          widget_subscription_id?: string | null
          widget_subscription_type?:
            | Database["public"]["Enums"]["widget_subscription_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_platform_subscription_plan_id_fkey"
            columns: ["platform_subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_widget_subscription_id_fkey"
            columns: ["widget_subscription_id"]
            isOneToOne: false
            referencedRelation: "widget_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_recipes: {
        Row: {
          created_at: string
          food_name: string
          food_scan_id: string | null
          id: string
          image_path: string | null
          image_url: string | null
          nutrition_summary: Json | null
          recipe_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_name: string
          food_scan_id?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          nutrition_summary?: Json | null
          recipe_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_name?: string
          food_scan_id?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          nutrition_summary?: Json | null
          recipe_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_recipes_food_scan_id_fkey"
            columns: ["food_scan_id"]
            isOneToOne: false
            referencedRelation: "food_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_api_calls: {
        Row: {
          call_type: string
          created_at: string
          id: string
          ip_address: string | null
          response_time_ms: number | null
          site_url: string | null
          status: string
          user_agent: string | null
          user_id: string
          widget_id: string
        }
        Insert: {
          call_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          response_time_ms?: number | null
          site_url?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
          widget_id: string
        }
        Update: {
          call_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          response_time_ms?: number | null
          site_url?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_api_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_api_calls_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widget_settings"
            referencedColumns: ["widget_id"]
          },
        ]
      }
      widget_settings: {
        Row: {
          background_color: string | null
          border_radius: string | null
          branding_visible: boolean
          created_at: string
          custom_text: string | null
          id: string
          iframe_height: string | null
          iframe_margin_bottom: string | null
          iframe_margin_left: string | null
          iframe_margin_right: string | null
          iframe_margin_top: string | null
          iframe_padding_bottom: string | null
          iframe_padding_left: string | null
          iframe_padding_right: string | null
          iframe_padding_top: string | null
          iframe_width: string | null
          is_default: boolean
          primary_color: string | null
          result_display_mode: string | null
          updated_at: string
          upload_area_background_color: string | null
          user_id: string
          widget_description: string | null
          widget_id: string
          widget_name: string | null
        }
        Insert: {
          background_color?: string | null
          border_radius?: string | null
          branding_visible?: boolean
          created_at?: string
          custom_text?: string | null
          id?: string
          iframe_height?: string | null
          iframe_margin_bottom?: string | null
          iframe_margin_left?: string | null
          iframe_margin_right?: string | null
          iframe_margin_top?: string | null
          iframe_padding_bottom?: string | null
          iframe_padding_left?: string | null
          iframe_padding_right?: string | null
          iframe_padding_top?: string | null
          iframe_width?: string | null
          is_default?: boolean
          primary_color?: string | null
          result_display_mode?: string | null
          updated_at?: string
          upload_area_background_color?: string | null
          user_id: string
          widget_description?: string | null
          widget_id: string
          widget_name?: string | null
        }
        Update: {
          background_color?: string | null
          border_radius?: string | null
          branding_visible?: boolean
          created_at?: string
          custom_text?: string | null
          id?: string
          iframe_height?: string | null
          iframe_margin_bottom?: string | null
          iframe_margin_left?: string | null
          iframe_margin_right?: string | null
          iframe_margin_top?: string | null
          iframe_padding_bottom?: string | null
          iframe_padding_left?: string | null
          iframe_padding_right?: string | null
          iframe_padding_top?: string | null
          iframe_width?: string | null
          is_default?: boolean
          primary_color?: string | null
          result_display_mode?: string | null
          updated_at?: string
          upload_area_background_color?: string | null
          user_id?: string
          widget_description?: string | null
          widget_id?: string
          widget_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_sites: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          site_name: string | null
          site_url: string
          updated_at: string
          user_id: string
          widget_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          site_name?: string | null
          site_url: string
          updated_at?: string
          user_id: string
          widget_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          site_name?: string | null
          site_url?: string
          updated_at?: string
          user_id?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_sites_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widget_settings"
            referencedColumns: ["widget_id"]
          },
        ]
      }
      widget_subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          current_period_end: string | null
          id: string
          is_active: boolean
          site_limit: number | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_type: Database["public"]["Enums"]["widget_subscription_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          site_limit?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["widget_subscription_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          is_active?: boolean
          site_limit?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: Database["public"]["Enums"]["widget_subscription_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_widget_user_api_count: {
        Args: { p_widget_id: string }
        Returns: {
          api_call_count: number
          subscription_type: string
          user_id: string
        }[]
      }
      sync_all_platform_subscriptions_to_profiles: {
        Args: never
        Returns: undefined
      }
      sync_all_widget_subscriptions_to_profiles: {
        Args: never
        Returns: undefined
      }
      widget_plan_site_limit: {
        Args: { plan: Database["public"]["Enums"]["widget_subscription_type"] }
        Returns: number
      }
    }
    Enums: {
      subscription_type: "free" | "premium"
      widget_subscription_type: "free" | "plan1" | "plan2" | "plan3"
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
    Enums: {
      subscription_type: ["free", "premium"],
      widget_subscription_type: ["free", "plan1", "plan2", "plan3"],
    },
  },
} as const
