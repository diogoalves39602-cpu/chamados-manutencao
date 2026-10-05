import { z } from "zod";

// Mesmas regras do banco (checks da tabela chamados), com mensagens em português.
const texto = (min: number, max: number, campo: string) =>
  z
    .string({ error: `Informe ${campo}.` })
    .trim()
    .min(min, min <= 1 ? `Informe ${campo}.` : `${campo[0].toUpperCase()}${campo.slice(1)}: mínimo de ${min} caracteres.`)
    .max(max, `${campo[0].toUpperCase()}${campo.slice(1)}: máximo de ${max} caracteres.`);

export const novoChamadoSchema = z.object({
  solicitante_nome: texto(2, 120, "seu nome"),
  solicitante_setor: texto(1, 80, "o setor"),
  solicitante_contato: texto(5, 120, "um telefone ou e-mail"),
  local: texto(2, 160, "o local"),
  categoria_id: z.coerce.number({ error: "Escolha a categoria." }).int().positive("Escolha a categoria."),
  descricao: texto(5, 4000, "a descrição do problema"),
});

export type NovoChamado = z.infer<typeof novoChamadoSchema>;

export const FOTO_MAX_BYTES = 3 * 1024 * 1024;
export const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"] as const;
