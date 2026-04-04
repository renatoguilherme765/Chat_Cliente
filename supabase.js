import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
