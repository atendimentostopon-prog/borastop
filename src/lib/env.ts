/**
 * Validador de Variáveis de Ambiente
 * Centraliza o acesso e garante que o app não inicie sem as configurações básicas.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  isProduction: process.env.NODE_ENV === 'production',
};

// Validação rigorosa em produção
if (env.isProduction) {
  const missingVars = [];
  if (!env.supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env.supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missingVars.length > 0) {
    // No build da Vercel, o log será exibido aqui
    const errorMsg = `❌ ERRO DE CONFIGURAÇÃO: As seguintes variáveis de ambiente estão faltando: ${missingVars.join(', ')}. ` +
      `Por favor, adicione-as no painel da Vercel em Project Settings -> Environment Variables.`;
    
    // Se for no servidor (build ou runtime), lançamos o erro
    if (typeof window === 'undefined') {
      throw new Error(errorMsg);
    } else {
      console.error(errorMsg);
    }
  }
}
