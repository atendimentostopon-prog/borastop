export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          code: string
          name: string
          is_private: boolean
          password: string | null
          status: string
          host_nickname: string
          max_players: number
          round_time: number
          total_rounds: number
          current_round: number
          allowed_letters: string[]
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          is_private?: boolean
          password?: string | null
          status?: string
          host_nickname: string
          max_players?: number
          round_time?: number
          total_rounds?: number
          current_round?: number
          allowed_letters?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          is_private?: boolean
          password?: string | null
          status?: string
          host_nickname?: string
          max_players?: number
          round_time?: number
          total_rounds?: number
          current_round?: number
          allowed_letters?: string[]
          created_at?: string
        }
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          nickname: string
          avatar: string | null
          score: number
          is_host: boolean
          is_ready: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          nickname: string
          avatar?: string | null
          score?: number
          is_host?: boolean
          is_ready?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          nickname?: string
          avatar?: string | null
          score?: number
          is_host?: boolean
          is_ready?: boolean
          joined_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      room_categories: {
        Row: {
          id: string
          room_id: string
          category_id: string
        }
        Insert: {
          id?: string
          room_id: string
          category_id: string
        }
        Update: {
          id?: string
          room_id?: string
          category_id?: string
        }
      }
      messages: {
        Row: {
          id: string
          room_id: string
          player_id: string | null
          nickname: string
          message: string
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id?: string | null
          nickname: string
          message: string
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string | null
          nickname?: string
          message?: string
          is_system?: boolean
          created_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          room_id: string
          round_number: number
          letter: string
          status: string
          started_at: string | null
          ended_at: string | null
          validation_category_index: number | null
          validation_started_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          round_number: number
          letter: string
          status?: string
          started_at?: string | null
          ended_at?: string | null
          validation_category_index?: number | null
          validation_started_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          round_number?: number
          letter?: string
          status?: string
          started_at?: string | null
          ended_at?: string | null
          validation_category_index?: number | null
          validation_started_at?: string | null
          created_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          room_id: string
          round_id: string
          player_id: string
          category_id: string
          answer: string | null
          points: number
          is_valid: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          round_id: string
          player_id: string
          category_id: string
          answer?: string | null
          points?: number
          is_valid?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          round_id?: string
          player_id?: string
          category_id?: string
          answer?: string | null
          points?: number
          is_valid?: boolean | null
          created_at?: string
        }
      }
      validation_votes: {
        Row: {
          id: string
          round_id: string
          category_id: string
          normalized_answer: string
          voter_id: string
          vote: string
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          category_id: string
          normalized_answer: string
          voter_id: string
          vote: string
          created_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          category_id?: string
          normalized_answer?: string
          voter_id?: string
          vote?: string
          created_at?: string
        }
      }
      validation_confirmations: {
        Row: {
          id: string
          round_id: string
          category_id: string
          player_id: string
          confirmed_at: string
        }
        Insert: {
          id?: string
          round_id: string
          category_id: string
          player_id: string
          confirmed_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          category_id?: string
          player_id?: string
          confirmed_at?: string
        }
      }
    }
  }
}
