import "server-only";
import { appUrl } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { enviarCartao, type Cartao, type Destino, type ResultadoEnvio } from "./bot";
import { cartaoAlertaPrazo, cartaoNovoChamado, type ChamadoNotificavel } from "./cartoes";

export async function destinosAtivos(): Promise<Destino[]> {
  const { data, error } = await criarClienteAdmin()
    .from("destinos_notificacao")
    .select("id, nome, plataforma, webhook_url, secret_assinatura")
    .eq("ativo", true);
  if (error) throw new Error(`destinos: ${error.message}`);
  return data;
}

export async function enviarParaTodos(destinos: Destino[], cartao: Cartao) {
  return Promise.all(destinos.map((d) => enviarCartao(d, cartao)));
}

// Completa os chamados reivindicados com nome da categoria e do responsável.
async function enriquecer(chamados: Tables<"chamados">[]): Promise<ChamadoNotificavel[]> {
  if (chamados.length === 0) return [];
  const admin = criarClienteAdmin();
  const idsPerfis = [...new Set(chamados.map((c) => c.recebido_por).filter((x): x is string => Boolean(x)))];
  const [{ data: categorias }, { data: perfis }] = await Promise.all([
    admin.from("categorias").select("id, nome"),
    idsPerfis.length ? admin.from("perfis").select("id, nome").in("id", idsPerfis) : Promise.resolve({ data: [] }),
  ]);
  const nomeCategoria = new Map(categorias?.map((c) => [c.id, c.nome]));
  const nomePerfil = new Map(perfis?.map((p) => [p.id, p.nome]));
  return chamados.map((c) => ({
    ...c,
    categoria: nomeCategoria.get(c.categoria_id) ?? "—",
    responsavel: c.recebido_por ? (nomePerfil.get(c.recebido_por) ?? null) : null,
  }));
}

function linkPainel(numero: string) {
  const base = appUrl();
  return base ? `${base}/painel/${numero}` : undefined;
}

export type RelatorioEnvio = { novos: number; alertas: number; falhas: ResultadoEnvio[] };

/**
 * Notifica chamados novos. Com id: só aquele (chamado logo após a abertura).
 * Sem id: todos os pendentes dos últimos 15 min (rodado pelo cron, faz o reenvio).
 */
export async function notificarNovos(chamadoId?: string): Promise<RelatorioEnvio> {
  const admin = criarClienteAdmin();
  const relatorio: RelatorioEnvio = { novos: 0, alertas: 0, falhas: [] };
  const destinos = await destinosAtivos();

  const { data, error } = await admin.rpc("reivindicar_novos_chamados", chamadoId ? { p_chamado_id: chamadoId } : {});
  if (error) throw new Error(`reivindicar_novos_chamados: ${error.message}`);
  if (destinos.length === 0) return relatorio; // nada configurado: marca como tratado

  for (const c of await enriquecer(data)) {
    const resultados = await enviarParaTodos(destinos, cartaoNovoChamado(c, linkPainel(c.numero)));
    relatorio.falhas.push(...resultados.filter((r) => !r.ok));
    if (resultados.some((r) => r.ok)) relatorio.novos++;
    else await admin.rpc("liberar_notificacao_novo", { p_chamado_id: c.id }); // tenta de novo no próximo minuto
  }
  return relatorio;
}

/** Alerta "faltam X min" para chamados perto de estourar o prazo (uma vez por chamado). */
export async function enviarAlertasPrazo(): Promise<RelatorioEnvio> {
  const admin = criarClienteAdmin();
  const relatorio: RelatorioEnvio = { novos: 0, alertas: 0, falhas: [] };
  const destinos = await destinosAtivos();

  const { data, error } = await admin.rpc("reivindicar_alertas_prazo", {});
  if (error) throw new Error(`reivindicar_alertas_prazo: ${error.message}`);
  if (destinos.length === 0) return relatorio;

  for (const c of await enriquecer(data)) {
    const resultados = await enviarParaTodos(destinos, cartaoAlertaPrazo(c, linkPainel(c.numero)));
    relatorio.falhas.push(...resultados.filter((r) => !r.ok));
    if (resultados.some((r) => r.ok)) relatorio.alertas++;
  }
  return relatorio;
}
