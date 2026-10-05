"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, LogOut } from "lucide-react";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao, Campo, Cartao } from "@/components/ui";
import { trocarSenha, type EstadoTrocarSenha } from "./actions";

export function FormTrocarSenha({ obrigatoria }: { obrigatoria: boolean }) {
  const [estado, acao, pendente] = useActionState(trocarSenha, {} as EstadoTrocarSenha);
  const [mostrar, setMostrar] = useState(false);

  return (
    <Cartao className="animate-entrar">
      <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-4">
        {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
        <Campo
          id="senha"
          name="senha"
          type={mostrar ? "text" : "password"}
          rotulo="Nova senha"
          autoComplete="new-password"
          minLength={8}
          required
          erro={estado.erros?.senha}
          ajuda="Mínimo de 8 caracteres. Diferencia maiúsculas de minúsculas."
        />
        <Campo
          id="confirmacao"
          name="confirmacao"
          type={mostrar ? "text" : "password"}
          rotulo="Repita a nova senha"
          autoComplete="new-password"
          required
          erro={estado.erros?.confirmacao}
        />
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} className="h-4 w-4 accent-marca-700" />
          {mostrar ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          Mostrar as senhas enquanto digito
        </label>
        <Botao type="submit" disabled={pendente} icone={KeyRound} className="min-h-12 text-base">
          {pendente ? "Salvando…" : "Salvar nova senha"}
        </Botao>
      </form>
      {obrigatoria ? (
        <form action="/sair" method="post" className="mt-3 flex flex-col">
          <Botao type="submit" variante="fantasma" icone={LogOut}>
            Sair
          </Botao>
        </form>
      ) : (
        <Link href="/painel" className="mt-3 block rounded-xl py-2.5 text-center text-sm font-medium text-stone-600 hover:bg-stone-100">
          Cancelar
        </Link>
      )}
    </Cartao>
  );
}
