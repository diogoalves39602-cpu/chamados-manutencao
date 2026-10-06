import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Plataforma } from "./plataformas";

// Sessão do SOLICITANTE (quem abre chamado) após o login no Feishu/Lark.
// Independente do login da equipe (Supabase Auth): é um cookie httpOnly com os
// dados do usuário assinados por HMAC-SHA256 (SESSAO_SECRET). Não dá para
// forjar nem alterar o nome/ID sem a chave do servidor.

export const COOKIE_SESSAO = "chamados_solicitante";
export const COOKIE_OAUTH = "chamados_oauth";
export const DURACAO_SESSAO_S = 30 * 24 * 60 * 60; // 30 dias

export type SessaoSolicitante = {
  plataforma: Plataforma;
  id: string; // open_id
  nome: string;
  email?: string;
  celular?: string;
  exp: number; // epoch em segundos
};

const sessaoSchema = z.object({
  plataforma: z.enum(["feishu", "lark"]),
  id: z.string().min(3).max(120),
  nome: z.string().min(1).max(120),
  email: z.string().max(200).optional(),
  celular: z.string().max(40).optional(),
  exp: z.number().int(),
});

function chave(segredo?: string) {
  const s = segredo ?? process.env.SESSAO_SECRET?.trim();
  if (!s || s.length < 32) throw new Error("SESSAO_SECRET não configurado (mínimo 32 caracteres).");
  return s;
}

function assinatura(dados: string, segredo: string) {
  return createHmac("sha256", segredo).update(dados).digest("base64url");
}

/** Serializa e assina qualquer objeto JSON: "<payload base64url>.<assinatura>". */
export function assinar(objeto: unknown, segredo?: string) {
  const dados = Buffer.from(JSON.stringify(objeto)).toString("base64url");
  return `${dados}.${assinatura(dados, chave(segredo))}`;
}

/** Verifica a assinatura e devolve o objeto, ou null se adulterado/ilegível. */
export function verificar(valor: string | undefined, segredo?: string): unknown {
  if (!valor) return null;
  const [dados, sig] = valor.split(".");
  if (!dados || !sig) return null;
  let esperado: string;
  try {
    esperado = assinatura(dados, chave(segredo));
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(dados, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function criarSessao(
  dados: Omit<SessaoSolicitante, "exp">,
  agora = Date.now(),
  segredo?: string,
): { valor: string; sessao: SessaoSolicitante } {
  const sessao: SessaoSolicitante = { ...dados, exp: Math.floor(agora / 1000) + DURACAO_SESSAO_S };
  return { valor: assinar(sessao, segredo), sessao };
}

export function lerSessao(valor: string | undefined, agora = Date.now(), segredo?: string): SessaoSolicitante | null {
  const resultado = sessaoSchema.safeParse(verificar(valor, segredo));
  if (!resultado.success) return null;
  if (resultado.data.exp * 1000 < agora) return null;
  return resultado.data;
}
