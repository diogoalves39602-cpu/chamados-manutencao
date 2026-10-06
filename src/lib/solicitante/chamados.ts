import "server-only";
import { BUCKET_FOTOS } from "@/lib/chamados/constantes";
import type { SituacaoPrazo, Status } from "@/lib/chamados/rotulos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { Plataforma } from "./plataformas";

// Chamados vistos pelo próprio solicitante (login do Feishu/Lark ou busca por
// telefone/e-mail). Nunca inclui o contato de ninguém; da equipe, só o primeiro nome.

export type ChamadoSolicitante = {
  numero: string;
  status: Status;
  local: string;
  categoria: string;
  descricao: string;
  foto_url: string | null;
  aberto_em: string;
  prazo_limite: string;
  recebido_em: string | null;
  tecnico: string | null;
  finalizado_em: string | null;
  situacao_prazo: SituacaoPrazo | null;
  tempo_total_minutos: number | null;
  observacao_finalizacao: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
};

const SELECT = `numero, status, local, descricao, foto_path, aberto_em, prazo_limite, recebido_em,
  finalizado_em, situacao_prazo, tempo_total_minutos, observacao_finalizacao, cancelado_em, motivo_cancelamento,
  categoria:categorias(nome), recebido:perfis!chamados_recebido_por_fkey(nome)`;

type Linha = Omit<ChamadoSolicitante, "categoria" | "tecnico" | "foto_url"> & {
  foto_path: string | null;
  categoria: { nome: string } | null;
  recebido: { nome: string } | null;
};

const primeiroNome = (nome?: string | null) => nome?.trim().split(/\s+/)[0] ?? null;

async function montar(linhas: Linha[]): Promise<ChamadoSolicitante[]> {
  const caminhos = linhas.flatMap((l) => (l.foto_path ? [l.foto_path] : []));
  const urls = new Map<string, string>();
  if (caminhos.length > 0) {
    const { data } = await criarClienteAdmin().storage.from(BUCKET_FOTOS).createSignedUrls(caminhos, 60 * 60);
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return linhas.map(({ foto_path, categoria, recebido, ...c }) => ({
    ...c,
    categoria: categoria?.nome ?? "—",
    tecnico: primeiroNome(recebido?.nome),
    foto_url: foto_path ? (urls.get(foto_path) ?? null) : null,
  }));
}

/** Chamados abertos com a conta do Feishu/Lark da pessoa. */
export async function chamadosDaConta(plataforma: Plataforma, id: string) {
  const { data } = await criarClienteAdmin()
    .from("chamados")
    .select(SELECT)
    .eq("solicitante_plataforma", plataforma)
    .eq("solicitante_externo_id", id)
    .order("aberto_em", { ascending: false })
    .limit(20);
  return montar((data ?? []) as unknown as Linha[]);
}

/** Detalhes dos chamados encontrados pela busca por telefone/e-mail. */
export async function chamadosPorNumeros(numeros: string[]) {
  if (numeros.length === 0) return [];
  const { data } = await criarClienteAdmin()
    .from("chamados")
    .select(SELECT)
    .in("numero", numeros)
    .order("aberto_em", { ascending: false });
  return montar((data ?? []) as unknown as Linha[]);
}
