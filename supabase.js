import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configurações do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pjnauygynuakdurokkew.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5ksGaNp4pNRKpJA8X8SAGA_SmmCAiX2';

console.log("Verificando variáveis de ambiente do Supabase...");
console.log("VITE_SUPABASE_URL definida?", !!SUPABASE_URL);
console.log("VITE_SUPABASE_ANON_KEY definida?", !!SUPABASE_ANON_KEY);

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase inicializado com sucesso!");
} else {
    window.supabaseClient = null;
    console.error("ERRO: Supabase não configurado. Verifique os Secrets VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Usando modo local (localStorage).");
}
