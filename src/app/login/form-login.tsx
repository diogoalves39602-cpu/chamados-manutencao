"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
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
  const [mostrarSenha, setMostrarSenha] = useState(false);

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
      else setErro("Usuário ou senha inválidos. A senha diferencia maiúsculas de minúsculas.");
      return;
    }

    router.replace(destino);
    router.refresh();
  }

  return (
    <Cartao className="animate-entrar">
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
        <div className="relative">
          <Campo
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            rotulo="Senha"
            autoComplete="current-password"
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-xl text-stone-500 hover:text-stone-800"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <Botao type="submit" disabled={enviando} icone={LogIn} className="min-h-12 text-base">
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
        <p className="text-center text-xs text-stone-500">Esqueceu a senha? Peça ao administrador para redefinir.</p>
      </form>
    </Cartao>
  );
}
