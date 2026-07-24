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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      active_rest: {
        Row: {
          description: string | null
          focus: string | null
          session_id: string
        }
        Insert: {
          description?: string | null
          focus?: string | null
          session_id: string
        }
        Update: {
          description?: string | null
          focus?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_rest_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      body_metrics: {
        Row: {
          date: string
          height_cm: number | null
          id: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          date: string
          height_cm?: number | null
          id?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          date?: string
          height_cm?: number | null
          id?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cardio_sessions: {
        Row: {
          avg_hr: number | null
          distance_m: number | null
          focus: string | null
          session_id: string
        }
        Insert: {
          avg_hr?: number | null
          distance_m?: number | null
          focus?: string | null
          session_id: string
        }
        Update: {
          avg_hr?: number | null
          distance_m?: number | null
          focus?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardio_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          exercise_id: string | null
          id: string
          reps: number | null
          rest_period_sec: number | null
          rpe: number | null
          session_id: string | null
          set_number: number | null
          weight_kg: number | null
        }
        Insert: {
          exercise_id?: string | null
          id?: string
          reps?: number | null
          rest_period_sec?: number | null
          rpe?: number | null
          session_id?: string | null
          set_number?: number | null
          weight_kg?: number | null
        }
        Update: {
          exercise_id?: string | null
          id?: string
          reps?: number | null
          rest_period_sec?: number | null
          rpe?: number | null
          session_id?: string | null
          set_number?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "strength_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      external_plan_items: {
        Row: {
          external_id: string
          external_source: string
          id: string
          payload: Json
          resource_type: string
          synced_at: string
          user_id: string
        }
        Insert: {
          external_id: string
          external_source: string
          id?: string
          payload: Json
          resource_type: string
          synced_at?: string
          user_id: string
        }
        Update: {
          external_id?: string
          external_source?: string
          id?: string
          payload?: Json
          resource_type?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      handball_sessions: {
        Row: {
          comments: string | null
          defense_vs_attack_ratio: string | null
          perceived_challenge: number | null
          perceived_performance: number | null
          session_id: string
          subtype: Database["public"]["Enums"]["handball_subtype"]
          throws_count: number | null
        }
        Insert: {
          comments?: string | null
          defense_vs_attack_ratio?: string | null
          perceived_challenge?: number | null
          perceived_performance?: number | null
          session_id: string
          subtype: Database["public"]["Enums"]["handball_subtype"]
          throws_count?: number | null
        }
        Update: {
          comments?: string | null
          defense_vs_attack_ratio?: string | null
          perceived_challenge?: number | null
          perceived_performance?: number | null
          session_id?: string
          subtype?: Database["public"]["Enums"]["handball_subtype"]
          throws_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "handball_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      injuries: {
        Row: {
          cleared_date: string | null
          description: string | null
          grade: string | null
          id: string
          injured_date: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          cleared_date?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          injured_date: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          cleared_date?: string | null
          description?: string | null
          grade?: string | null
          id?: string
          injured_date?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injuries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_accounts: {
        Row: {
          access_token: string | null
          auth_type: string
          config: Json | null
          created_at: string
          expires_at: string | null
          external_account_id: string | null
          id: string
          last_synced_at: string | null
          refresh_token: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          auth_type: string
          config?: Json | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          source: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          auth_type?: string
          config?: Json | null
          created_at?: string
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          last_synced_at?: string | null
          refresh_token?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interval_logs: {
        Row: {
          id: string
          reps: number | null
          rest_duration_sec: number | null
          session_id: string | null
          sets: number | null
          work_duration_sec: number | null
          zone_target: string | null
        }
        Insert: {
          id?: string
          reps?: number | null
          rest_duration_sec?: number | null
          session_id?: string | null
          sets?: number | null
          work_duration_sec?: number | null
          zone_target?: string | null
        }
        Update: {
          id?: string
          reps?: number | null
          rest_duration_sec?: number | null
          session_id?: string | null
          sets?: number | null
          work_duration_sec?: number | null
          zone_target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interval_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cardio_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      mas_tests: {
        Row: {
          created_at: string
          external_id: string | null
          external_source: string | null
          id: string
          mas_mps: number | null
          raw_payload: Json | null
          test_date: string
          test_time_seconds: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          mas_mps?: number | null
          raw_payload?: Json | null
          test_date: string
          test_time_seconds?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          mas_mps?: number | null
          raw_payload?: Json | null
          test_date?: string
          test_time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mas_tests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          assists: number | null
          big_mistakes: number | null
          blocks: number | null
          breakthroughs: number | null
          goals: number | null
          importance: number | null
          is_home: boolean | null
          nine_m_shots: number | null
          opponent: string | null
          opposition_difficulty: number | null
          play_time_min: number | null
          session_id: string
          shots_missed: number | null
          shots_saved: number | null
          steals: number | null
          suspensions_created: number | null
          suspensions_received: number | null
          technical_faults: number | null
        }
        Insert: {
          assists?: number | null
          big_mistakes?: number | null
          blocks?: number | null
          breakthroughs?: number | null
          goals?: number | null
          importance?: number | null
          is_home?: boolean | null
          nine_m_shots?: number | null
          opponent?: string | null
          opposition_difficulty?: number | null
          play_time_min?: number | null
          session_id: string
          shots_missed?: number | null
          shots_saved?: number | null
          steals?: number | null
          suspensions_created?: number | null
          suspensions_received?: number | null
          technical_faults?: number | null
        }
        Update: {
          assists?: number | null
          big_mistakes?: number | null
          blocks?: number | null
          breakthroughs?: number | null
          goals?: number | null
          importance?: number | null
          is_home?: boolean | null
          nine_m_shots?: number | null
          opponent?: string | null
          opposition_difficulty?: number | null
          play_time_min?: number | null
          session_id?: string
          shots_missed?: number | null
          shots_saved?: number | null
          steals?: number | null
          suspensions_created?: number | null
          suspensions_received?: number | null
          technical_faults?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "handball_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      readiness: {
        Row: {
          current_illness: number | null
          current_injury: number | null
          date: string
          food_beverage: number | null
          id: string
          mental_stress: number | null
          mood: number | null
          muscle_soreness: number | null
          notes: string | null
          recovery_energy: number | null
          sleep_quality: number | null
          total_score: number | null
          training_load: number | null
          user_id: string | null
        }
        Insert: {
          current_illness?: number | null
          current_injury?: number | null
          date: string
          food_beverage?: number | null
          id?: string
          mental_stress?: number | null
          mood?: number | null
          muscle_soreness?: number | null
          notes?: string | null
          recovery_energy?: number | null
          sleep_quality?: number | null
          total_score?: number | null
          training_load?: number | null
          user_id?: string | null
        }
        Update: {
          current_illness?: number | null
          current_injury?: number | null
          date?: string
          food_beverage?: number | null
          id?: string
          mental_stress?: number | null
          mood?: number | null
          muscle_soreness?: number | null
          notes?: string | null
          recovery_energy?: number | null
          sleep_quality?: number | null
          total_score?: number | null
          training_load?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "readiness_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          end_time: string | null
          external_id: string | null
          external_source: string | null
          id: string
          location: string | null
          raw_payload: Json | null
          rpe: number | null
          start_time: string
          surface: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id: string | null
        }
        Insert: {
          end_time?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          location?: string | null
          raw_payload?: Json | null
          rpe?: number | null
          start_time: string
          surface?: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id?: string | null
        }
        Update: {
          end_time?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          location?: string | null
          raw_payload?: Json | null
          rpe?: number | null
          start_time?: string
          surface?: string | null
          type?: Database["public"]["Enums"]["session_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_sessions: {
        Row: {
          focus: string | null
          session_id: string
        }
        Insert: {
          focus?: string | null
          session_id: string
        }
        Update: {
          focus?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_test_results: {
        Row: {
          created_at: string
          estimated_1rm: number | null
          external_id: string | null
          external_source: string | null
          id: string
          raw_payload: Json | null
          reps: number | null
          test_date: string
          test_type: string
          user_id: string
          verification_status: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          estimated_1rm?: number | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          raw_payload?: Json | null
          reps?: number | null
          test_date: string
          test_type: string
          user_id: string
          verification_status?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          estimated_1rm?: number | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          raw_payload?: Json | null
          reps?: number | null
          test_date?: string
          test_type?: string
          user_id?: string
          verification_status?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_test_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          integration_account_id: string
          items_synced: number | null
          started_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          integration_account_id: string
          items_synced?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          integration_account_id?: string
          items_synced?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_integration_account_id_fkey"
            columns: ["integration_account_id"]
            isOneToOne: false
            referencedRelation: "integration_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_practices: {
        Row: {
          practice_focus: string | null
          session_id: string
          tactical_complexity: number | null
        }
        Insert: {
          practice_focus?: string | null
          session_id: string
          tactical_complexity?: number | null
        }
        Update: {
          practice_focus?: string | null
          session_id?: string
          tactical_complexity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_practices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "handball_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      users: {
        Row: {
          birth_date: string | null
          created_at: string | null
          gender: string | null
          id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string
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
      handball_subtype: "individual" | "team_practice" | "match"
      session_type:
        | "strength_power"
        | "cardio"
        | "mobility_rehab"
        | "active_rest"
        | "handball"
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
      handball_subtype: ["individual", "team_practice", "match"],
      session_type: [
        "strength_power",
        "cardio",
        "mobility_rehab",
        "active_rest",
        "handball",
      ],
    },
  },
} as const
