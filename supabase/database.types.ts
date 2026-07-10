// 자동 생성 — 직접 수정 금지.
// 재생성: Supabase MCP generate_typescript_types 또는 `supabase gen types typescript`.
// 대시보드 스캐폴딩 시 dashboard/src/shared/api/ 로 이동 예정.

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
      alert_state: {
        Row: {
          last_alert_date: string | null
          last_signal_fingerprint: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          last_alert_date?: string | null
          last_signal_fingerprint?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          last_alert_date?: string | null
          last_signal_fingerprint?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_state_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          active_signals: Json
          close_price: number | null
          email_sent_at: string | null
          event_calendar_warning: string | null
          id: string
          macro_check_note: string | null
          risk_reward_ratio: number | null
          risk_reward_sufficient: boolean | null
          score: number
          stop_price: number | null
          subscription_id: string
          symbol: string
          target_primary: number | null
          target_secondary: number | null
          triggered_at: string
          user_id: string
        }
        Insert: {
          active_signals: Json
          close_price?: number | null
          email_sent_at?: string | null
          event_calendar_warning?: string | null
          id?: string
          macro_check_note?: string | null
          risk_reward_ratio?: number | null
          risk_reward_sufficient?: boolean | null
          score: number
          stop_price?: number | null
          subscription_id: string
          symbol: string
          target_primary?: number | null
          target_secondary?: number | null
          triggered_at?: string
          user_id: string
        }
        Update: {
          active_signals?: Json
          close_price?: number | null
          email_sent_at?: string | null
          event_calendar_warning?: string | null
          id?: string
          macro_check_note?: string | null
          risk_reward_ratio?: number | null
          risk_reward_sufficient?: boolean | null
          score?: number
          stop_price?: number | null
          subscription_id?: string
          symbol?: string
          target_primary?: number | null
          target_secondary?: number | null
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      backtest_results: {
        Row: {
          average_r: number | null
          equity_curve: Json | null
          expectancy: number | null
          id: string
          is_out_of_sample: boolean
          max_drawdown: number | null
          parameters: Json
          period_end: string
          period_start: string
          run_at: string
          symbol: string
          trade_count: number | null
          win_rate: number | null
        }
        Insert: {
          average_r?: number | null
          equity_curve?: Json | null
          expectancy?: number | null
          id?: string
          is_out_of_sample?: boolean
          max_drawdown?: number | null
          parameters: Json
          period_end: string
          period_start: string
          run_at?: string
          symbol: string
          trade_count?: number | null
          win_rate?: number | null
        }
        Update: {
          average_r?: number | null
          equity_curve?: Json | null
          expectancy?: number | null
          id?: string
          is_out_of_sample?: boolean
          max_drawdown?: number | null
          parameters?: Json
          period_end?: string
          period_start?: string
          run_at?: string
          symbol?: string
          trade_count?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backtest_results_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "curated_symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
      curated_symbols: {
        Row: {
          created_at: string
          display_name: string
          is_active: boolean
          market: string
          market_context_symbol: string | null
          symbol: string
        }
        Insert: {
          created_at?: string
          display_name: string
          is_active?: boolean
          market?: string
          market_context_symbol?: string | null
          symbol: string
        }
        Update: {
          created_at?: string
          display_name?: string
          is_active?: boolean
          market?: string
          market_context_symbol?: string | null
          symbol?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          notifications_enabled: boolean
          unsubscribe_token: string
        }
        Insert: {
          created_at?: string
          id: string
          notifications_enabled?: boolean
          unsubscribe_token?: string
        }
        Update: {
          created_at?: string
          id?: string
          notifications_enabled?: boolean
          unsubscribe_token?: string
        }
        Relationships: []
      }
      signal_snapshots: {
        Row: {
          bollinger_lower: number | null
          bollinger_middle: number | null
          bollinger_upper: number | null
          breadth_signal: boolean | null
          captured_at: string
          close_price: number | null
          id: string
          indicator_series: Json | null
          market_context_close: number | null
          market_context_moving_average_20: number | null
          market_regime_signal: boolean
          pullback_signal: boolean
          relative_strength_index_14: number | null
          score: number
          simple_moving_average_200: number | null
          symbol: string
          trend_gate_passed: boolean
        }
        Insert: {
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          breadth_signal?: boolean | null
          captured_at?: string
          close_price?: number | null
          id?: string
          indicator_series?: Json | null
          market_context_close?: number | null
          market_context_moving_average_20?: number | null
          market_regime_signal?: boolean
          pullback_signal?: boolean
          relative_strength_index_14?: number | null
          score?: number
          simple_moving_average_200?: number | null
          symbol: string
          trend_gate_passed?: boolean
        }
        Update: {
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          breadth_signal?: boolean | null
          captured_at?: string
          close_price?: number | null
          id?: string
          indicator_series?: Json | null
          market_context_close?: number | null
          market_context_moving_average_20?: number | null
          market_regime_signal?: boolean
          pullback_signal?: boolean
          relative_strength_index_14?: number | null
          score?: number
          simple_moving_average_200?: number | null
          symbol?: string
          trend_gate_passed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "signal_snapshots_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "curated_symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          score_threshold: number
          symbol: string
          throttle_days: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          score_threshold?: number
          symbol: string
          throttle_days?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          score_threshold?: number
          symbol?: string
          throttle_days?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "curated_symbols"
            referencedColumns: ["symbol"]
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
