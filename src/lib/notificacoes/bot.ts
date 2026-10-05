import "server-only";
import { createHmac } from "node:crypto";

// Bot customizado de grupo do Feishu (open.feishu.cn) e do Lark
// (open.larksuite.com). As duas plataformas usam o mesmo formato de mensagem e
// o mesmo algoritmo de assinatura.

export type Destino = {
  id: string;
  nome: string;
  plataforma: "feishu" | "lark";
  webhook_url: string;
  secret_assinatura: string | null;
};

export type Cartao = Record<string, unknown>;

/**
 * Assinatura da "verificação por assinatura" do bot:
 * base64( HMAC-SHA256( chave = "<timestamp>\n<secret>", mensagem = "" ) ).
 * O timestamp é em segundos e precisa estar a menos de 1h do horário do servidor do Feishu/Lark.
 */
export function assinar(timestampSegundos: number, secret: string) {
  return createHmac("sha256", `${timestampSegundos}\n${secret}`).update("").digest("base64");
}

export function montarCorpo(cartao: Cartao, secret: string | null, agora = Date.now()) {
  const corpo: Record<string, unknown> = { msg_type: "interactive", card: cartao };
  if (secret) {
    const timestamp = Math.floor(agora / 1000);
    corpo.timestamp = String(timestamp);
    corpo.sign = assinar(timestamp, secret);
  }
  return corpo;
}

export type ResultadoEnvio = { destinoId: string; destino: string; ok: boolean; erro?: string };

export async function enviarCartao(destino: Destino, cartao: Cartao): Promise<ResultadoEnvio> {
  const base = { destinoId: destino.id, destino: destino.nome };
  try {
    const resposta = await fetch(destino.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(montarCorpo(cartao, destino.secret_assinatura)),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const json = (await resposta.json().catch(() => ({}))) as { code?: number; msg?: string; StatusCode?: number };
    // Respostas aceitas: {"code":0} (atual) ou {"StatusCode":0} (formato antigo).
    if (resposta.ok && (json.code === 0 || json.StatusCode === 0)) return { ...base, ok: true };
    return { ...base, ok: false, erro: `HTTP ${resposta.status} · code ${json.code ?? json.StatusCode} · ${json.msg ?? ""}`.trim() };
  } catch (e) {
    return { ...base, ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

/** Escapa caracteres que o lark_md interpreta como marcação. */
export function md(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
