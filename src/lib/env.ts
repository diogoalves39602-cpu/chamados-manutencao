import { z } from "zod";

// Variáveis públicas (vão para o navegador). Referenciadas literalmente para
// o Next.js conseguir embuti-las no bundle do cliente.
const publico = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_AUTH_EMAIL_DOMAIN: z.string().min(3).default("chamados.local"),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_AUTH_EMAIL_DOMAIN: process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || undefined,
  });

export const env = publico;

// Variáveis só do servidor: lidas sob demanda para não quebrar o bundle do cliente.
export function envServidor() {
  return z
    .object({
      SUPABASE_SECRET_KEY: z
        .string({ error: "Defina SUPABASE_SECRET_KEY no .env.local (Supabase → Project Settings → API Keys)." })
        .min(20),
    })
    .parse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
}
