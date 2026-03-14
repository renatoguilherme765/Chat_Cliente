// Configurações do Supabase
// Substitua pelas suas credenciais do Supabase (Project URL e API Key)
const SUPABASE_URL = 'https://pjnauygynuakdurokkew.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5ksGaNp4pNRKpJA8X8SAGA_SmmCAiX2';

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    window.supabaseClient = null;
    console.log("Supabase não configurado. Usando modo local (localStorage).");
}
