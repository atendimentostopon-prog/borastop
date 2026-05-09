import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

import { env } from '@/lib/env';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);

export const isSupabaseConfigured = env.isConfigured;
