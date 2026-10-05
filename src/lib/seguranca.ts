import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** IP do cliente atrás da Vercel ou do Netlify. */
export function obterIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconhecido"
  );
}

export function sha256(valor: string) {
  return createHash("sha256").update(valor).digest("hex");
}

/** Comparação em tempo constante (evita timing attack em segredos). */
export function segredoConfere(recebido: string | null | undefined, esperado: string) {
  if (!recebido) return false;
  const a = Buffer.from(sha256(recebido));
  const b = Buffer.from(sha256(esperado));
  return timingSafeEqual(a, b);
}

/**
 * Contabiliza uma requisição e diz se ela está dentro do limite.
 * Em caso de erro no banco, deixa passar (não derruba o atendimento).
 */
export async function dentroDoLimite(chave: string, max: number, janelaSegundos: number) {
  const { data, error } = await criarClienteAdmin().rpc("consumir_limite", {
    p_chave: chave,
    p_max: max,
    p_janela_segundos: janelaSegundos,
  });
  if (error) {
    console.error("consumir_limite falhou", error.message);
    return true;
  }
  return data === true;
}
