import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Helper to bypass strict TypeScript checks on direct table calls
 * Use only when standard typing fails due to Supabase v2 limitations
 */
export const db = supabase as any;
