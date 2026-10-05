"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alerta, Botao, Campo, Cartao } from "@/components/ui";
import { trocarSenha, type EstadoTrocarSenha } from "./actions";

export function FormTrocarSenha({ obrigatoria }: { obrigatoria: boolean }) {
  const [estado, acao, pendente] = useActionState(trocarSenha, {} as EstadoTrocarSenha);

  return (
    <Cartao>
      <form action={acao} className="flex flex-col gap-4">
        {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
        <Campo
          id="senha"
          name="senha"
          type="password"
          rotulo="Nova senha"
          autoComplete="new-password"
          minLength={8}
          required
          erro={estado.erros?.senha}
          ajuda="Mínimo de 8 caracteres."
        />
        <Campo
          id="confirmacao"
          name="confirmacao"
          type="password"
          rotulo="Repita a nova senha"
          autoComplete="new-password"
          required
          erro={estado.erros?.confirmacao}
        />
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar nova senha"}
        </Botao>
      </form>
      {obrigatoria ? (
        <form action="/sair" method="post" className="mt-3 flex flex-col">
          <Botao type="submit" variante="secundario">
            Sair
          </Botao>
        </form>
      ) : (
        <Link href="/painel" className="mt-3 block text-center text-sm text-blue-700 hover:underline">
          Cancelar
        </Link>
      )}
    </Cartao>
  );
}
