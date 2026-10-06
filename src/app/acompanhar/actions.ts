"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { dentroDoLimite, obterIp, sha256 } from "@/lib/seguranca";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { ChamadoSolicitante } from "./lista-chamados";

export type EstadoConsulta = { erro?: string; chamados?: ChamadoSolicitante[]; contato?: string };

const contatoSchema = z
  .string()
  .trim()
  .min(1, "Informe o telefone ou e-mail usado na abertura.")
  .max(120)
  .refine((v) => v.includes("@") || v.replace(/\D/g, "").length >= 8, {
    message: "Digite o telefone com DDD (ex.: 11 98888-7777) ou o e-mail completo.",
  });

/**
 * Consulta pública por telefone ou e-mail (para quem esqueceu o número do chamado).
 * Limite de consultas por aparelho para impedir varredura de telefones; a lista
 * mostra só o andamento, nunca o contato de ninguém.
 */
export async function consultarPorContato(_: EstadoConsulta, formData: FormData): Promise<EstadoConsulta> {
  const contato = contatoSchema.safeParse(formData.get("contato"));
  if (!contato.success) return { erro: contato.error.issues[0]?.message };

  const ip = obterIp(await headers());
  if (!(await dentroDoLimite(`acompanhar:${sha256(ip)}`, 10, 10 * 60))) {
    return { erro: "Muitas consultas em pouco tempo. Aguarde alguns minutos." };
  }

  const { data, error } = await criarClienteAdmin().rpc("chamados_por_contato", { p_contato: contato.data });
  if (error) {
    console.error("chamados_por_contato:", error.message);
    return { erro: "Não foi possível consultar agora. Tente de novo em instantes." };
  }
  return { chamados: data ?? [], contato: contato.data };
}
