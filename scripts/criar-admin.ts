/**
 * Cria o PRIMEIRO administrador (os demais são criados pelo /admin).
 *
 *   npm run criar-admin -- --login admin --nome "Fulano de Tal"
 *
 * Gera uma senha inicial aleatória e a mostra só neste terminal.
 * No primeiro login a troca de senha é obrigatória.
 */
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: { login: { type: "string" }, nome: { type: "string" } },
});

const login = values.login?.trim().toLowerCase();
const nome = values.nome?.trim();
if (!login || !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login) || !nome || nome.length < 2) {
  console.error('Uso: npm run criar-admin -- --login <login> --nome "Nome completo"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
const dominio = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "chamados.local";
if (!url || !chave) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}

const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const senha = Array.from({ length: 12 }, () => alfabeto[randomInt(alfabeto.length)]).join("");

const supabase = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email: `${login}@${dominio}`,
  password: senha,
  email_confirm: true,
  app_metadata: { login },
  user_metadata: { nome },
});
if (error || !data.user) {
  console.error("Erro ao criar usuário no Auth:", error?.message);
  process.exit(1);
}

const { error: erroPerfil } = await supabase
  .from("perfis")
  .insert({ id: data.user.id, login, nome, papel: "admin", deve_trocar_senha: true });
if (erroPerfil) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("Erro ao criar perfil:", erroPerfil.message);
  process.exit(1);
}

console.log(`\nAdministrador criado.\n  Login: ${login}\n  Senha inicial: ${senha}\n\nEntre em /login; o sistema vai pedir para trocar a senha.\n`);
