import "server-only";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, lerSessao } from "./sessao";

/** Solicitante identificado pelo Feishu/Lark nesta requisição (ou null). */
export async function solicitanteAtual() {
  const valor = (await cookies()).get(COOKIE_SESSAO)?.value;
  return lerSessao(valor);
}
