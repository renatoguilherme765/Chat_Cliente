import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configurações do Supabase (Hardcoded conforme solicitado)
const SUPABASE_URL = 'https://pjnauygynuakdurokkew.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5ksGaNp4pNRKpJA8X8SAGA_SmmCAiX2';

console.log("Inicializando Supabase com chaves fixas...");

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase inicializado com sucesso!");
} else {
    window.supabaseClient = null;
    console.error("ERRO: Supabase não configurado.");
}
