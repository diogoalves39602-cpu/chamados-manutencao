"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Alerta, Botao, Campo, Cartao } from "@/components/ui";
import { env } from "@/lib/env";
import { loginParaEmail, loginSchema } from "@/lib/auth/login";
import { criarClienteNavegador } from "@/lib/supabase/client";

// O login roda no navegador: assim o limite de tentativas do Supabase Auth
// vale por IP do celular, e não pelo IP do servidor.
export function FormLogin({ destino, aviso }: { destino: string; aviso?: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const login = loginSchema.safeParse(dados.get("login"));
    const senha = String(dados.get("senha") ?? "");
    if (!login.success || !senha) {
      setErro("Informe usuário e senha.");
      return;
    }

    setEnviando(true);
    setErro(undefined);
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginParaEmail(login.data, env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN),
      password: senha,
    });

    if (error) {
      setEnviando(false);
      if (error.code === "user_banned") setErro("Seu acesso está desativado. Procure o administrador.");
      else if (error.status === 429) setErro("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
      else setErro("Usuário ou senha inválidos.");
      return;
    }

    router.replace(destino);
    router.refresh();
  }

  return (
    <Cartao>
      <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
        {aviso ? <Alerta tipo="aviso">{aviso}</Alerta> : null}
        {erro ? <Alerta>{erro}</Alerta> : null}
        <Campo
          id="login"
          name="login"
          rotulo="Usuário ou matrícula"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <Campo id="senha" name="senha" type="password" rotulo="Senha" autoComplete="current-password" required />
        <Botao type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
        <p className="text-center text-xs text-zinc-500">Esqueceu a senha? Peça ao administrador para redefinir.</p>
      </form>
    </Cartao>
  );
}
