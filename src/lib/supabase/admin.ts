import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, envServidor } from "@/lib/env";
import type { Database } from "./database.types";

// Cliente com a chave secreta: IGNORA a RLS. Use só no servidor, depois de
// validar quem está chamando (exigirAdmin) ou em rotas públicas controladas
// (formulário, webhook, cron).
export function criarClienteAdmin() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, envServidor().SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
