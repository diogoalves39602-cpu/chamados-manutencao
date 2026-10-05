import type { Tables } from "@/lib/supabase/database.types";

// Chamado com nomes já resolvidos (categoria e pessoas). Usado no servidor e no cliente.
export type ChamadoCompleto = Tables<"chamados"> & {
  categoria: { nome: string } | null;
  recebido: { nome: string } | null;
  finalizador: { nome: string } | null;
  cancelador: { nome: string } | null;
};
