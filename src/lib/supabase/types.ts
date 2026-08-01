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
          body_fat_percentage: number | null
          date: string
          external_id: string | null
          external_source: string | null
          id: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          date: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          date?: string
          external_id?: string | null
          external_source?: string | null
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
      daily_metrics: {
        Row: {
          active_zone_minutes: number | null
          avg_hrv_ms: number | null
          avg_spo2_percentage: number | null
          created_at: string
          date: string
          external_id: string | null
          external_source: string | null
          id: string
          raw_payload: Json | null
          resting_heart_rate: number | null
          steps: number | null
          user_id: string
        }
        Insert: {
          active_zone_minutes?: number | null
          avg_hrv_ms?: number | null
          avg_spo2_percentage?: number | null
          created_at?: string
          date: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          raw_payload?: Json | null
          resting_heart_rate?: number | null
          steps?: number | null
          user_id: string
        }
        Update: {
          active_zone_minutes?: number | null
          avg_hrv_ms?: number | null
          avg_spo2_percentage?: number | null
          created_at?: string
          date?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          raw_payload?: Json | null
          resting_heart_rate?: number | null
          steps?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          contact_load: number | null
          defense_vs_attack_ratio: string | null
          jump_load: number | null
          perceived_challenge: number | null
          perceived_performance: number | null
          position: string | null
          session_id: string
          subtype: Database["public"]["Enums"]["handball_subtype"]
          throws_count: number | null
        }
        Insert: {
          comments?: string | null
          contact_load?: number | null
          defense_vs_attack_ratio?: string | null
          jump_load?: number | null
          perceived_challenge?: number | null
          perceived_performance?: number | null
          position?: string | null
          session_id: string
          subtype: Database["public"]["Enums"]["handball_subtype"]
          throws_count?: number | null
        }
        Update: {
          comments?: string | null
          contact_load?: number | null
          defense_vs_attack_ratio?: string | null
          jump_load?: number | null
          perceived_challenge?: number | null
          perceived_performance?: number | null
          position?: string | null
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
      match_events: {
        Row: {
          clock_seconds: number | null
          court_x: number | null
          court_y: number | null
          created_at: string
          event_type: string
          goal_cell: number | null
          id: string
          note: string | null
          period: number | null
          phase: string | null
          position: string | null
          score_them: number | null
          score_us: number | null
          session_id: string
          shot_origin: string | null
          source: string
          video_id: string | null
          video_offset_seconds: number | null
        }
        Insert: {
          clock_seconds?: number | null
          court_x?: number | null
          court_y?: number | null
          created_at?: string
          event_type: string
          goal_cell?: number | null
          id?: string
          note?: string | null
          period?: number | null
          phase?: string | null
          position?: string | null
          score_them?: number | null
          score_us?: number | null
          session_id: string
          shot_origin?: string | null
          source?: string
          video_id?: string | null
          video_offset_seconds?: number | null
        }
        Update: {
          clock_seconds?: number | null
          court_x?: number | null
          court_y?: number | null
          created_at?: string
          event_type?: string
          goal_cell?: number | null
          id?: string
          note?: string | null
          period?: number | null
          phase?: string | null
          position?: string | null
          score_them?: number | null
          score_us?: number | null
          session_id?: string
          shot_origin?: string | null
          source?: string
          video_id?: string | null
          video_offset_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "match_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "match_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      match_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_name: string | null
          file_size_bytes: number | null
          handle_key: string | null
          id: string
          kind: string
          label: string | null
          period_offsets: Json
          session_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          handle_key?: string | null
          id?: string
          kind?: string
          label?: string | null
          period_offsets?: Json
          session_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size_bytes?: number | null
          handle_key?: string | null
          id?: string
          kind?: string
          label?: string | null
          period_offsets?: Json
          session_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_videos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["session_id"]
          },
        ]
      }
      matches: {
        Row: {
          importance: number | null
          is_home: boolean | null
          opponent: string | null
          opposition_difficulty: number | null
          play_time_min: number | null
          session_id: string
        }
        Insert: {
          importance?: number | null
          is_home?: boolean | null
          opponent?: string | null
          opposition_difficulty?: number | null
          play_time_min?: number | null
          session_id: string
        }
        Update: {
          importance?: number | null
          is_home?: boolean | null
          opponent?: string | null
          opposition_difficulty?: number | null
          play_time_min?: number | null
          session_id?: string
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
          active_duration_seconds: number | null
          active_zone_minutes: number | null
          calories_kcal: number | null
          end_time: string | null
          external_id: string | null
          external_source: string | null
          hr_zones: Json | null
          id: string
          location: string | null
          manual_rpe: number | null
          merged_into: string | null
          raw_payload: Json | null
          rpe: number | null
          start_time: string
          surface: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id: string | null
        }
        Insert: {
          active_duration_seconds?: number | null
          active_zone_minutes?: number | null
          calories_kcal?: number | null
          end_time?: string | null
          external_id?: string | null
          external_source?: string | null
          hr_zones?: Json | null
          id?: string
          location?: string | null
          manual_rpe?: number | null
          merged_into?: string | null
          raw_payload?: Json | null
          rpe?: number | null
          start_time: string
          surface?: string | null
          type: Database["public"]["Enums"]["session_type"]
          user_id?: string | null
        }
        Update: {
          active_duration_seconds?: number | null
          active_zone_minutes?: number | null
          calories_kcal?: number | null
          end_time?: string | null
          external_id?: string | null
          external_source?: string | null
          hr_zones?: Json | null
          id?: string
          location?: string | null
          manual_rpe?: number | null
          merged_into?: string | null
          raw_payload?: Json | null
          rpe?: number | null
          start_time?: string
          surface?: string | null
          type?: Database["public"]["Enums"]["session_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_logs: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_time: string | null
          external_id: string | null
          external_source: string | null
          id: string
          raw_payload: Json | null
          sleep_stages: Json | null
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          raw_payload?: Json | null
          sleep_stages?: Json | null
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string | null
          external_id?: string | null
          external_source?: string | null
          id?: string
          raw_payload?: Json | null
          sleep_stages?: Json | null
          start_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_logs_user_id_fkey"
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
          height_cm: number | null
          id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      // Hand-maintained alongside daily_facts - see README.md; a `supabase gen
      // types` run drops both and they have to be re-added.
      match_box_score: {
        Row: {
          session_id: string | null
          start_time: string | null
          rpe: number | null
          merged_into: string | null
          opponent: string | null
          is_home: boolean | null
          importance: number | null
          opposition_difficulty: number | null
          play_time_min: number | null
          goals: number | null
          shots_missed: number | null
          shots_saved: number | null
          nine_m_shots: number | null
          breakthroughs: number | null
          technical_faults: number | null
          assists: number | null
          suspensions_created: number | null
          suspensions_received: number | null
          steals: number | null
          blocks: number | null
          big_mistakes: number | null
          final_score_us: number | null
          final_score_them: number | null
          clipped_events: number | null
          event_count: number | null
        }
        Relationships: []
      }
      daily_facts: {
        Row: {
          user_id: string | null
          day: string | null
          session_count: number | null
          total_load: number | null
          load_estimate: number | null
          sessions_with_intensity: number | null
          sessions_with_rpe: number | null
          max_rpe: number | null
          total_duration_min: number | null
          calories_kcal: number | null
          had_match: boolean | null
          had_practice: boolean | null
          had_strength: boolean | null
          perceived_performance: number | null
          perceived_challenge: number | null
          readiness_score: number | null
          readiness_training_load: number | null
          muscle_soreness: number | null
          mental_stress: number | null
          current_injury: number | null
          current_illness: number | null
          sleep_quality: number | null
          food_beverage: number | null
          mood: number | null
          recovery_energy: number | null
          weight_kg: number | null
          body_fat_percentage: number | null
          steps: number | null
          resting_heart_rate: number | null
          avg_hrv_ms: number | null
          avg_spo2_percentage: number | null
          active_zone_minutes: number | null
          sleep_hours: number | null
          dow: number | null
          is_weekend: boolean | null
          days_since_last_match: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_local_date: {
        Args: { ts: string }
        Returns: string
      }
    }
    Enums: {
      handball_subtype: "individual" | "team_practice" | "match"
      session_type:
        | "strength_power"
        | "cardio"
        | "general_cardio"
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
        "general_cardio",
        "mobility_rehab",
        "active_rest",
        "handball",
      ],
    },
  },
} as const
