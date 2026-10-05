"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { SituacaoPrazo, Status } from "@/lib/chamados/rotulos";
import { dentroDoLimite, obterIp, sha256 } from "@/lib/seguranca";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type ResultadoConsulta = {
  numero: string;
  status: Status;
  categoria: string;
  local: string;
  aberto_em: string;
  prazo_limite: string;
  recebido_em: string | null;
  responsavel: string | null;
  finalizado_em: string | null;
  situacao_prazo: SituacaoPrazo | null;
  observacao_finalizacao: string | null;
};

export type EstadoConsulta = { erro?: string; chamado?: ResultadoConsulta };

const schema = z.object({
  numero: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (/^\d+$/.test(v) ? `CH-${v.padStart(6, "0")}` : v))
    .pipe(z.string().regex(/^CH-\d{6,}$/, "Número inválido. Exemplo: CH-000123.")),
  contato: z.string().trim().min(4, "Informe o telefone ou e-mail usado na abertura."),
});

// Telefone: compara só os dígitos. E-mail/texto: sem maiúsculas e espaços.
function normalizar(contato: string) {
  const digitos = contato.replace(/\D/g, "");
  return digitos.length >= 8 ? digitos : contato.toLowerCase().replace(/\s+/g, "");
}

const NAO_ENCONTRADO = "Não encontramos um chamado com esse número e contato. Confira os dados.";

/**
 * Consulta pública do andamento. Exige número + o contato informado na abertura,
 * para que ninguém veja chamados alheios só chutando números em sequência.
 */
export async function consultarChamado(_: EstadoConsulta, formData: FormData): Promise<EstadoConsulta> {
  const dados = schema.safeParse({ numero: formData.get("numero"), contato: formData.get("contato") });
  if (!dados.success) return { erro: dados.error.issues[0]?.message };

  const ip = obterIp(await headers());
  if (!(await dentroDoLimite(`acompanhar:${sha256(ip)}`, 20, 10 * 60))) {
    return { erro: "Muitas consultas em pouco tempo. Aguarde alguns minutos." };
  }

  const { data: c } = await criarClienteAdmin()
    .from("chamados")
    .select(
      "numero, status, local, aberto_em, prazo_limite, recebido_em, finalizado_em, situacao_prazo, observacao_finalizacao, solicitante_contato, categoria:categorias(nome), recebido:perfis!chamados_recebido_por_fkey(nome)",
    )
    .eq("numero", dados.data.numero)
    .maybeSingle();

  if (!c || normalizar(c.solicitante_contato) !== normalizar(dados.data.contato)) return { erro: NAO_ENCONTRADO };

  const categoria = c.categoria as unknown as { nome: string } | null;
  const recebido = c.recebido as unknown as { nome: string } | null;
  return {
    chamado: {
      numero: c.numero,
      status: c.status,
      categoria: categoria?.nome ?? "—",
      local: c.local,
      aberto_em: c.aberto_em,
      prazo_limite: c.prazo_limite,
      recebido_em: c.recebido_em,
      responsavel: recebido?.nome.split(" ")[0] ?? null, // só o primeiro nome
      finalizado_em: c.finalizado_em,
      situacao_prazo: c.situacao_prazo,
      observacao_finalizacao: c.observacao_finalizacao,
    },
  };
}
