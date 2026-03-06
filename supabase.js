// Configurações do Supabase
// Substitua pelas suas credenciais do Supabase (Project URL e API Key)
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    window.supabaseClient = null;
    console.log("Supabase não configurado. Usando modo local (localStorage).");
}
