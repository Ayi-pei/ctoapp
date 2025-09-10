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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      action_logs: {
        Row: {
          action: string | null
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: number
          operator_id: string | null
          operator_username: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          operator_id?: string | null
          operator_username?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          operator_id?: string | null
          operator_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          created_at: string
          createdAt: string
          description: string | null
          expiresat: string | null
          expiresAt: string | null
          howtoclaim: string | null
          howToClaim: string | null
          id: number
          imgsrc: string | null
          rewardrule: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string
          createdAt?: string
          description?: string | null
          expiresat?: string | null
          expiresAt?: string | null
          howtoclaim?: string | null
          howToClaim?: string | null
          id?: number
          imgsrc?: string | null
          rewardrule?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string
          createdAt?: string
          description?: string | null
          expiresat?: string | null
          expiresAt?: string | null
          howtoclaim?: string | null
          howToClaim?: string | null
          id?: number
          imgsrc?: string | null
          rewardrule?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          created_at: string
          id: string
          new_password: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_password?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_password?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: Json | null
          created_at: string
          expires_at: string | null
          id: number
          is_read: boolean | null
          priority: number | null
          theme: string | null
          title: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: number
          is_read?: boolean | null
          priority?: number | null
          theme?: string | null
          title?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: number
          is_read?: boolean | null
          priority?: number | null
          theme?: string | null
          title?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      balances: {
        Row: {
          asset: string
          asset_type: string | null
          available_balance: number | null
          frozen_balance: number | null
          id: number
          user_id: string
        }
        Insert: {
          asset: string
          asset_type?: string | null
          available_balance?: number | null
          frozen_balance?: number | null
          id?: number
          user_id: string
        }
        Update: {
          asset?: string
          asset_type?: string | null
          available_balance?: number | null
          frozen_balance?: number | null
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_logs: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          source_level: number
          source_user_id: string
          source_username: string
          trade_amount: number
          upline_user_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          source_level: number
          source_user_id: string
          source_username: string
          trade_amount: number
          upline_user_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          source_level?: number
          source_user_id?: string
          source_username?: string
          trade_amount?: number
          upline_user_id?: string
        }
        Relationships: []
      }
      commission_rates: {
        Row: {
          level: number
          rate: number
        }
        Insert: {
          level: number
          rate: number
        }
        Update: {
          level?: number
          rate?: number
        }
        Relationships: []
      }
      contract_trades: {
        Row: {
          amount: number
          created_at: string
          entry_price: number
          id: string
          outcome: string | null
          period: number
          profit: number | null
          profit_rate: number
          settlement_price: number | null
          settlement_time: string
          status: string
          trading_pair: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_price: number
          id?: string
          outcome?: string | null
          period: number
          profit?: number | null
          profit_rate: number
          settlement_price?: number | null
          settlement_time: string
          status: string
          trading_pair: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_price?: number
          id?: string
          outcome?: string | null
          period?: number
          profit?: number | null
          profit_rate?: number
          settlement_price?: number | null
          settlement_time?: string
          status?: string
          trading_pair?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          details: string | null
          end_time: string | null
          id: number
          job_name: string
          run_status: string
          start_time: string | null
        }
        Insert: {
          details?: string | null
          end_time?: string | null
          id?: number
          job_name: string
          run_status: string
          start_time?: string | null
        }
        Update: {
          details?: string | null
          end_time?: string | null
          id?: number
          job_name?: string
          run_status?: string
          start_time?: string | null
        }
        Relationships: []
      }
      daily_check_ins: {
        Row: {
          checked_in_at: string
          id: number
          reward_awarded: number
          streak_day: number
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          id?: number
          reward_awarded: number
          streak_day: number
          user_id: string
        }
        Update: {
          checked_in_at?: string
          id?: number
          reward_awarded?: number
          streak_day?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          description: string | null
          id: number
          img_src: string | null
          imgsrc: string | null
          imgSrc: string | null
          link: string | null
          reward: number | null
          reward_type: string | null
          status: string | null
          title: string
          trigger: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          img_src?: string | null
          imgsrc?: string | null
          imgSrc?: string | null
          link?: string | null
          reward?: number | null
          reward_type?: string | null
          status?: string | null
          title: string
          trigger?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          img_src?: string | null
          imgsrc?: string | null
          imgSrc?: string | null
          link?: string | null
          reward?: number | null
          reward_type?: string | null
          status?: string | null
          title?: string
          trigger?: string | null
        }
        Relationships: []
      }
      investment_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          period: number
          profit_rate: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          period: number
          profit_rate: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          period?: number
          profit_rate?: number
        }
        Relationships: []
      }
      investment_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_investment_amount: number
          min_investment_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_investment_amount: number
          min_investment_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_investment_amount?: number
          min_investment_amount?: number
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          daily_rate: number | null
          duration_hours: number | null
          hourly_rate: number | null
          id: number
          period: number | null
          product_id: string | null
          product_name: string
          producttype: string | null
          profit: number | null
          settlement_date: string
          staking_amount: number | null
          staking_asset: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          daily_rate?: number | null
          duration_hours?: number | null
          hourly_rate?: number | null
          id?: number
          period?: number | null
          product_id?: string | null
          product_name: string
          producttype?: string | null
          profit?: number | null
          settlement_date: string
          staking_amount?: number | null
          staking_asset?: string | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          daily_rate?: number | null
          duration_hours?: number | null
          hourly_rate?: number | null
          id?: number
          period?: number | null
          product_id?: string | null
          product_name?: string
          producttype?: string | null
          profit?: number | null
          settlement_date?: string
          staking_amount?: number | null
          staking_asset?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "investment_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_interventions: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_time: string
          id: number
          priority: number | null
          rule: Json
          start_time: string
          trading_pair: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_time: string
          id?: number
          priority?: number | null
          rule: Json
          start_time: string
          trading_pair: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          id?: number
          priority?: number | null
          rule?: Json
          start_time?: string
          trading_pair?: string
        }
        Relationships: []
      }
      market_kline_data: {
        Row: {
          close: number | null
          created_at: string | null
          high: number | null
          id: number
          is_intervened: boolean | null
          low: number | null
          open: number | null
          time: number
          trading_pair: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          created_at?: string | null
          high?: number | null
          id?: number
          is_intervened?: boolean | null
          low?: number | null
          open?: number | null
          time: number
          trading_pair: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          created_at?: string | null
          high?: number | null
          id?: number
          is_intervened?: boolean | null
          low?: number | null
          open?: number | null
          time?: number
          trading_pair?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_kline_raw: {
        Row: {
          close: number | null
          created_at: string | null
          high: number | null
          id: number
          low: number | null
          open: number | null
          source: string | null
          time: number
          trading_pair: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          created_at?: string | null
          high?: number | null
          id?: number
          low?: number | null
          open?: number | null
          source?: string | null
          time: number
          trading_pair: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          created_at?: string | null
          high?: number | null
          id?: number
          low?: number | null
          open?: number | null
          source?: string | null
          time?: number
          trading_pair?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_predictions: {
        Row: {
          created_at: string
          expires_at: string
          id: number
          prediction: string
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: number
          prediction: string
          status?: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: number
          prediction?: string
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_summary_data: {
        Row: {
          change: number | null
          high: number | null
          low: number | null
          pair: string
          price: number
          source: string | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          change?: number | null
          high?: number | null
          low?: number | null
          pair: string
          price: number
          source?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          change?: number | null
          high?: number | null
          low?: number | null
          pair?: string
          price?: number
          source?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      options_contracts: {
        Row: {
          ask: number | null
          bid: number | null
          change: number | null
          change_percent: number | null
          contract_id: string
          delta: number | null
          expiration_date: string
          gamma: number | null
          implied_volatility: number | null
          in_the_money: boolean | null
          last_price: number | null
          open_interest: number | null
          rho: number | null
          strike_price: number
          theta: number | null
          type: string
          underlying_symbol: string
          updated_at: string | null
          vega: number | null
          volume: number | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          change?: number | null
          change_percent?: number | null
          contract_id: string
          delta?: number | null
          expiration_date: string
          gamma?: number | null
          implied_volatility?: number | null
          in_the_money?: boolean | null
          last_price?: number | null
          open_interest?: number | null
          rho?: number | null
          strike_price: number
          theta?: number | null
          type: string
          underlying_symbol: string
          updated_at?: string | null
          vega?: number | null
          volume?: number | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          change?: number | null
          change_percent?: number | null
          contract_id?: string
          delta?: number | null
          expiration_date?: string
          gamma?: number | null
          implied_volatility?: number | null
          in_the_money?: boolean | null
          last_price?: number | null
          open_interest?: number | null
          rho?: number | null
          strike_price?: number
          theta?: number | null
          type?: string
          underlying_symbol?: string
          updated_at?: string | null
          vega?: number | null
          volume?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consecutive_check_ins: number | null
          created_at: string
          credit_score: number | null
          email: string | null
          id: string
          invitation_code: string | null
          inviter_id: string | null
          is_admin: boolean | null
          is_frozen: boolean | null
          is_test_user: boolean | null
          last_check_in_date: string | null
          last_login_at: string | null
          nickname: string | null
          password_hash: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          consecutive_check_ins?: number | null
          created_at?: string
          credit_score?: number | null
          email?: string | null
          id: string
          invitation_code?: string | null
          inviter_id?: string | null
          is_admin?: boolean | null
          is_frozen?: boolean | null
          is_test_user?: boolean | null
          last_check_in_date?: string | null
          last_login_at?: string | null
          nickname?: string | null
          password_hash?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          consecutive_check_ins?: number | null
          created_at?: string
          credit_score?: number | null
          email?: string | null
          id?: string
          invitation_code?: string | null
          inviter_id?: string | null
          is_admin?: boolean | null
          is_frozen?: boolean | null
          is_test_user?: boolean | null
          last_check_in_date?: string | null
          last_login_at?: string | null
          nickname?: string | null
          password_hash?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          address: string | null
          amount: number | null
          asset: string | null
          created_at: string
          id: number
          new_password: string | null
          status: string
          transaction_hash: string | null
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          amount?: number | null
          asset?: string | null
          created_at?: string
          id?: number
          new_password?: string | null
          status: string
          transaction_hash?: string | null
          type: string
          user_id: string
        }
        Update: {
          address?: string | null
          amount?: number | null
          asset?: string | null
          created_at?: string
          id?: number
          new_password?: string | null
          status?: string
          transaction_hash?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_logs: {
        Row: {
          amount: number
          asset: string
          created_at: string
          description: string | null
          id: number
          source_id: string | null
          source_level: number | null
          source_username: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          asset: string
          created_at?: string
          description?: string | null
          id?: number
          source_id?: string | null
          source_level?: number | null
          source_username?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          asset?: string
          created_at?: string
          description?: string | null
          id?: number
          source_id?: string | null
          source_level?: number | null
          source_username?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_trades: {
        Row: {
          amount: number
          base_asset: string
          created_at: string
          id: string
          quote_asset: string
          status: string
          total: number
          trading_pair: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          base_asset: string
          created_at?: string
          id?: string
          quote_asset: string
          status: string
          total: number
          trading_pair: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          base_asset?: string
          created_at?: string
          id?: string
          quote_asset?: string
          status?: string
          total?: number
          trading_pair?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      supported_assets: {
        Row: {
          asset: string
          asset_type: string | null
          is_active: boolean | null
        }
        Insert: {
          asset: string
          asset_type?: string | null
          is_active?: boolean | null
        }
        Update: {
          asset?: string
          asset_type?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      swap_orders: {
        Row: {
          created_at: string
          from_amount: number | null
          from_asset: string | null
          id: number
          payment_proof_url: string | null
          status: string | null
          taker_id: string | null
          taker_username: string | null
          to_amount: number | null
          to_asset: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          from_amount?: number | null
          from_asset?: string | null
          id?: number
          payment_proof_url?: string | null
          status?: string | null
          taker_id?: string | null
          taker_username?: string | null
          to_amount?: number | null
          to_asset?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          from_amount?: number | null
          from_asset?: string | null
          id?: number
          payment_proof_url?: string | null
          status?: string | null
          taker_id?: string | null
          taker_username?: string | null
          to_amount?: number | null
          to_asset?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swap_orders_taker_id_fkey"
            columns: ["taker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: number
          settings: Json | null
        }
        Insert: {
          id?: number
          settings?: Json | null
        }
        Update: {
          id?: number
          settings?: Json | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          amount: number
          base_asset: string | null
          created_at: string
          entry_price: number | null
          id: number
          ordertype: string
          outcome: string | null
          period: number | null
          price: number | null
          profit: number | null
          profit_rate: number | null
          quote_asset: string | null
          settlement_price: number | null
          settlement_time: string | null
          status: string
          total: number | null
          trading_pair: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          base_asset?: string | null
          created_at?: string
          entry_price?: number | null
          id?: number
          ordertype: string
          outcome?: string | null
          period?: number | null
          price?: number | null
          profit?: number | null
          profit_rate?: number | null
          quote_asset?: string | null
          settlement_price?: number | null
          settlement_time?: string | null
          status: string
          total?: number | null
          trading_pair: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          base_asset?: string | null
          created_at?: string
          entry_price?: number | null
          id?: number
          ordertype?: string
          outcome?: string | null
          period?: number | null
          price?: number | null
          profit?: number | null
          profit_rate?: number | null
          quote_asset?: string | null
          settlement_price?: number | null
          settlement_time?: string | null
          status?: string
          total?: number | null
          trading_pair?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          address: string | null
          amount: number
          asset: string
          created_at: string | null
          id: string
          status: string
          transaction_hash: string | null
          type: string
          user_id: string
        }
        Insert: {
          address?: string | null
          amount: number
          asset: string
          created_at?: string | null
          id?: string
          status: string
          transaction_hash?: string | null
          type: string
          user_id: string
        }
        Update: {
          address?: string | null
          amount?: number
          asset?: string
          created_at?: string | null
          id?: string
          status?: string
          transaction_hash?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_states: {
        Row: {
          completed: boolean | null
          created_at: string
          date: string
          id: number
          taskid: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          date: string
          id?: number
          taskid: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          date?: string
          id?: number
          taskid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_states_taskid_fkey"
            columns: ["taskid"]
            isOneToOne: false
            referencedRelation: "daily_tasks"
            referencedColumns: ["trigger"]
          },
          {
            foreignKeyName: "user_task_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          invitation_code: string | null
          inviter_id: string | null
          is_admin: boolean | null
          is_frozen: boolean | null
          is_test_user: boolean | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          invitation_code?: string | null
          inviter_id?: string | null
          is_admin?: boolean | null
          is_frozen?: boolean | null
          is_test_user?: boolean | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          invitation_code?: string | null
          inviter_id?: string | null
          is_admin?: boolean | null
          is_frozen?: boolean | null
          is_test_user?: boolean | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          name: string
          network: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          name: string
          network: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          name?: string
          network?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_daily_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          imgsrc: string | null
          link: string | null
          reward: number | null
          reward_type: string | null
          status: string | null
          title: string | null
          trigger: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_balance: {
        Args:
          | {
              p_amount: number
              p_asset: string
              p_is_debit_frozen?: boolean
              p_is_frozen?: boolean
              p_user_id: string
            }
          | {
              p_amount: number
              p_asset: string
              p_is_debit_frozen?: boolean
              p_is_frozen?: boolean
              p_user_id: string
            }
          | {
              p_amount: number
              p_asset: string
              p_is_frozen?: boolean
              p_user_id: string
            }
          | { p_amount: number; p_asset: string; p_user_id: string }
        Returns: undefined
      }
      claim_market_prediction_reward: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      claim_snowball_reward: {
        Args: { p_tier: number }
        Returns: Json
      }
      create_daily_investment: {
        Args: {
          p_amount: number
          p_category: string
          p_daily_rate: number
          p_period: number
          p_product_name: string
          p_staking_amount: number
          p_staking_asset: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_hourly_investment: {
        Args: {
          p_amount: number
          p_duration_hours: number
          p_hourly_rate: number
          p_product_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_investment: {
        Args: { p_amount: number; p_product_id: string }
        Returns: string
      }
      create_market_prediction: {
        Args: { p_prediction: string; p_symbol: string }
        Returns: Json
      }
      credit_reward: {
        Args: {
          p_amount: number
          p_asset: string
          p_description: string
          p_reward_type: string
          p_source_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      distribute_commissions: {
        Args: { p_source_user_id: string; p_trade_amount: number }
        Returns: undefined
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_downline: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          credit_score: number
          email: string
          id: string
          invitation_code: string
          inviter_id: string
          is_admin: boolean
          is_frozen: boolean
          is_test_user: boolean
          last_login_at: string
          level: number
          nickname: string
          username: string
        }[]
      }
      get_total_platform_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_downline: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          level: number
          username: string
        }[]
      }
      handle_user_check_in: {
        Args: { p_user_id: string }
        Returns: {
          message: string
          reward_amount: number
          success: boolean
        }[]
      }
      is_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      manage_frozen_balance: {
        Args: {
          p_amount: number
          p_asset: string
          p_operation: string
          p_user_id: string
        }
        Returns: undefined
      }
      perform_daily_check_in: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      pgroonga_command: {
        Args:
          | { arguments: string[]; groongacommand: string }
          | { groongacommand: string }
        Returns: string
      }
      pgroonga_command_escape_value: {
        Args: { value: string }
        Returns: string
      }
      pgroonga_condition: {
        Args: {
          column_name?: string
          fuzzy_max_distance_ratio?: number
          index_name?: string
          query?: string
          schema_name?: string
          scorers?: string[]
          weights?: number[]
        }
        Returns: Database["public"]["CompositeTypes"]["pgroonga_condition"]
      }
      pgroonga_equal_query_text_array: {
        Args: { query: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_equal_query_text_array_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
        Returns: boolean
      }
      pgroonga_equal_query_varchar_array: {
        Args: { query: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_equal_query_varchar_array_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
        Returns: boolean
      }
      pgroonga_equal_text: {
        Args: { other: string; target: string }
        Returns: boolean
      }
      pgroonga_equal_text_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_equal_varchar: {
        Args: { other: string; target: string }
        Returns: boolean
      }
      pgroonga_equal_varchar_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_escape: {
        Args:
          | { special_characters: string; value: string }
          | { value: boolean }
          | { value: number }
          | { value: number }
          | { value: number }
          | { value: number }
          | { value: number }
          | { value: string }
          | { value: string }
          | { value: string }
        Returns: string
      }
      pgroonga_flush: {
        Args: { indexname: unknown }
        Returns: boolean
      }
      pgroonga_handler: {
        Args: { "": unknown }
        Returns: unknown
      }
      pgroonga_highlight_html: {
        Args:
          | { indexname: unknown; keywords: string[]; target: string }
          | { indexname: unknown; keywords: string[]; targets: string[] }
          | { keywords: string[]; target: string }
          | { keywords: string[]; targets: string[] }
        Returns: string
      }
      pgroonga_index_column_name: {
        Args:
          | { columnindex: number; indexname: unknown }
          | { columnname: string; indexname: unknown }
        Returns: string
      }
      pgroonga_is_writable: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      pgroonga_list_broken_indexes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      pgroonga_list_lagged_indexes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      pgroonga_match_positions_byte: {
        Args:
          | { indexname: unknown; keywords: string[]; target: string }
          | { keywords: string[]; target: string }
        Returns: number[]
      }
      pgroonga_match_positions_character: {
        Args:
          | { indexname: unknown; keywords: string[]; target: string }
          | { keywords: string[]; target: string }
        Returns: number[]
      }
      pgroonga_match_term: {
        Args:
          | { target: string[]; term: string }
          | { target: string[]; term: string }
          | { target: string; term: string }
          | { target: string; term: string }
        Returns: boolean
      }
      pgroonga_match_text_array_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string[]
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string[]
            }
        Returns: boolean
      }
      pgroonga_match_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string[]
        }
        Returns: boolean
      }
      pgroonga_match_text_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_match_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_match_varchar_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_match_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_normalize: {
        Args: { normalizername: string; target: string } | { target: string }
        Returns: string
      }
      pgroonga_prefix_varchar_condition: {
        Args:
          | {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_query_escape: {
        Args: { query: string }
        Returns: string
      }
      pgroonga_query_expand: {
        Args: {
          query: string
          synonymscolumnname: string
          tablename: unknown
          termcolumnname: string
        }
        Returns: string
      }
      pgroonga_query_extract_keywords: {
        Args: { index_name?: string; query: string }
        Returns: string[]
      }
      pgroonga_query_text_array_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              targets: string[]
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              targets: string[]
            }
        Returns: boolean
      }
      pgroonga_query_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          targets: string[]
        }
        Returns: boolean
      }
      pgroonga_query_text_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_query_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_query_varchar_condition: {
        Args:
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"]
              target: string
            }
          | {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"]
              target: string
            }
        Returns: boolean
      }
      pgroonga_query_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"]
          target: string
        }
        Returns: boolean
      }
      pgroonga_regexp_text_array: {
        Args: { pattern: string; targets: string[] }
        Returns: boolean
      }
      pgroonga_regexp_text_array_condition: {
        Args: {
          pattern: Database["public"]["CompositeTypes"]["pgroonga_condition"]
          targets: string[]
        }
        Returns: boolean
      }
      pgroonga_result_to_jsonb_objects: {
        Args: { result: Json }
        Returns: Json
      }
      pgroonga_result_to_recordset: {
        Args: { result: Json }
        Returns: Record<string, unknown>[]
      }
      pgroonga_score: {
        Args:
          | { ctid: unknown; tableoid: unknown }
          | { row: Record<string, unknown> }
        Returns: number
      }
      pgroonga_set_writable: {
        Args: { newwritable: boolean }
        Returns: boolean
      }
      pgroonga_snippet_html: {
        Args: { keywords: string[]; target: string; width?: number }
        Returns: string[]
      }
      pgroonga_table_name: {
        Args: { indexname: unknown }
        Returns: string
      }
      pgroonga_tokenize: {
        Args: { target: string }
        Returns: Json[]
      }
      pgroonga_vacuum: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      pgroonga_wal_apply: {
        Args: Record<PropertyKey, never> | { indexname: unknown }
        Returns: number
      }
      pgroonga_wal_set_applied_position: {
        Args:
          | Record<PropertyKey, never>
          | { block: number; indexname: unknown; offset: number }
          | { block: number; offset: number }
          | { indexname: unknown }
        Returns: boolean
      }
      pgroonga_wal_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_block: number
          current_offset: number
          current_size: number
          last_block: number
          last_offset: number
          last_size: number
          name: string
          oid: unknown
        }[]
      }
      pgroonga_wal_truncate: {
        Args: Record<PropertyKey, never> | { indexname: unknown }
        Returns: number
      }
      register_new_user: {
        Args: {
          p_invitation_code: string
          p_password: string
          p_username: string
        }
        Returns: Json
      }
      set_current_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      settle_and_log: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      settle_due_records: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      contract_status: "active" | "settled"
      investment_status: "active" | "settled"
      order_outcome: "win" | "loss"
      order_type: "buy" | "sell"
      request_status: "pending" | "approved" | "rejected"
      reward_type:
        | "initial_investment_experience"
        | "market_prediction_success"
        | "snowball_tier_1"
        | "snowball_tier_2"
        | "snowball_tier_3"
      spot_status: "filled" | "cancelled"
      swap_order_status:
        | "open"
        | "pending_payment"
        | "pending_confirmation"
        | "completed"
        | "cancelled"
        | "disputed"
      transaction_type: "deposit" | "withdrawal" | "adjustment"
    }
    CompositeTypes: {
      pgroonga_condition: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        schema_name: string | null
        index_name: string | null
        column_name: string | null
        fuzzy_max_distance_ratio: number | null
      }
      pgroonga_full_text_search_condition: {
        query: string | null
        weigths: number[] | null
        indexname: string | null
      }
      pgroonga_full_text_search_condition_with_scorers: {
        query: string | null
        weigths: number[] | null
        scorers: string[] | null
        indexname: string | null
      }
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
      contract_status: ["active", "settled"],
      investment_status: ["active", "settled"],
      order_outcome: ["win", "loss"],
      order_type: ["buy", "sell"],
      request_status: ["pending", "approved", "rejected"],
      reward_type: [
        "initial_investment_experience",
        "market_prediction_success",
        "snowball_tier_1",
        "snowball_tier_2",
        "snowball_tier_3",
      ],
      spot_status: ["filled", "cancelled"],
      swap_order_status: [
        "open",
        "pending_payment",
        "pending_confirmation",
        "completed",
        "cancelled",
        "disputed",
      ],
      transaction_type: ["deposit", "withdrawal", "adjustment"],
    },
  },
} as const
