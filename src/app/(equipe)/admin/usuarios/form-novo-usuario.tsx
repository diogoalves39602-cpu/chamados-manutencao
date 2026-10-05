"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { Alerta, Botao, Campo, Selecao } from "@/components/ui";
import { criarUsuario, type EstadoForm } from "./actions";
import { gerarSenha } from "./senha";
import { SenhaGerada } from "./senha-gerada";

// onSubmit + startTransition (em vez de <form action>) para o React não limpar
// os campos quando a validação falha; limpamos só no sucesso.
export function FormNovoUsuario({ senhaInicial }: { senhaInicial: string }) {
  const [estado, acao, pendente] = useActionState(criarUsuario, {} as EstadoForm);
  const formRef = useRef<HTMLFormElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!estado.ok || !formRef.current || !senhaRef.current) return;
    formRef.current.reset();
    senhaRef.current.value = gerarSenha();
  }, [estado]);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acao(dados));
  }

  return (
    <form ref={formRef} onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      {estado.erro ? (
        <div className="sm:col-span-2">
          <Alerta>{estado.erro}</Alerta>
        </div>
      ) : null}
      {estado.senhaGerada ? (
        <div className="sm:col-span-2">
          <SenhaGerada {...estado.senhaGerada} />
        </div>
      ) : null}

      <Campo id="nome" name="nome" rotulo="Nome completo" required erro={estado.erros?.nome} />
      <Campo
        id="login"
        name="login"
        rotulo="Login (usuário ou matrícula)"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        erro={estado.erros?.login}
        ajuda="Ex.: joao.silva ou 10234"
      />
      <Selecao id="papel" name="papel" rotulo="Perfil" defaultValue="tecnico">
        <option value="tecnico">Técnico</option>
        <option value="admin">Administrador</option>
      </Selecao>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Campo
            ref={senhaRef}
            id="senha"
            name="senha"
            rotulo="Senha inicial"
            defaultValue={senhaInicial}
            required
            minLength={8}
            erro={estado.erros?.senha}
            autoComplete="off"
          />
        </div>
        <Botao
          type="button"
          variante="secundario"
          aria-label="Gerar outra senha"
          onClick={() => {
            if (senhaRef.current) senhaRef.current.value = gerarSenha();
          }}
        >
          ↻
        </Botao>
      </div>
      <div className="sm:col-span-2">
        <Botao type="submit" disabled={pendente} className="w-full sm:w-auto">
          {pendente ? "Criando…" : "Criar usuário"}
        </Botao>
      </div>
    </form>
  );
}
