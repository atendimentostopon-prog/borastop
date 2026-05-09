/**
 * Bora Stop Environment Variables
 * Centralized validator for environment variables
 */

export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    } else {
      console.warn(`[ENV WARNING] Missing variables: ${missing.join(', ')}`);
    }
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

export const env = validateEnv();
