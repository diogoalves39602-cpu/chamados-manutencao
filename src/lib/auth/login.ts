import { z } from "zod";

// O técnico entra com "usuário ou matrícula". No Supabase Auth ele existe como
// <login>@<domínio fictício>, sem envio de e-mail.
export const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,39}$/,
    "Use de 3 a 40 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.",
  );

export const senhaSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

export function loginParaEmail(login: string, dominio: string) {
  return `${login.trim().toLowerCase()}@${dominio}`;
}
