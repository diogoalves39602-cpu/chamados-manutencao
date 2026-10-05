"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { alterarAtivo, alterarPapel, redefinirSenha, type EstadoForm } from "./actions";
import { gerarSenha } from "./senha";
import { SenhaGerada } from "./senha-gerada";

type Usuario = {
  id: string;
  login: string;
  nome: string;
  papel: "tecnico" | "admin";
  ativo: boolean;
  deve_trocar_senha: boolean;
};

export function LinhaUsuario({ usuario, ehVoce }: { usuario: Usuario; ehVoce: boolean }) {
  const [estadoAtivo, acaoAtivo, pendenteAtivo] = useActionState(alterarAtivo, {} as EstadoForm);
  const [estadoPapel, acaoPapel, pendentePapel] = useActionState(alterarPapel, {} as EstadoForm);
  const [estadoSenha, acaoSenha, pendenteSenha] = useActionState(redefinirSenha, {} as EstadoForm);
  const [redefinindo, setRedefinindo] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");

  const erro = estadoAtivo.erro ?? estadoPapel.erro ?? estadoSenha.erro;

  return (
    <li className={`flex flex-col gap-3 px-4 py-4 sm:px-6 ${usuario.ativo ? "" : "bg-zinc-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${usuario.ativo ? "text-zinc-900" : "text-zinc-500 line-through"}`}>
            {usuario.nome} {ehVoce ? <span className="text-xs font-normal text-zinc-500">(você)</span> : null}
          </p>
          <p className="font-mono text-xs text-zinc-500">{usuario.login}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            usuario.papel === "admin" ? "bg-purple-100 text-purple-800" : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {usuario.papel === "admin" ? "Admin" : "Técnico"}
        </span>
        {!usuario.ativo ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Desativado</span>
        ) : usuario.deve_trocar_senha ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            Aguardando 1º acesso
          </span>
        ) : null}
      </div>

      {erro ? <Alerta>{erro}</Alerta> : null}
      {estadoSenha.senhaGerada ? <SenhaGerada {...estadoSenha.senhaGerada} /> : null}

      {!ehVoce ? (
        <div className="flex flex-wrap gap-2">
          {usuario.ativo ? (
            <Botao
              type="button"
              variante="secundario"
              onClick={() => {
                setNovaSenha(gerarSenha());
                setRedefinindo((v) => !v);
              }}
            >
              Redefinir senha
            </Botao>
          ) : null}
          <form action={acaoPapel}>
            <input type="hidden" name="id" value={usuario.id} />
            <input type="hidden" name="papel" value={usuario.papel === "admin" ? "tecnico" : "admin"} />
            <Botao type="submit" variante="secundario" disabled={pendentePapel || !usuario.ativo}>
              {usuario.papel === "admin" ? "Tornar técnico" : "Tornar admin"}
            </Botao>
          </form>
          <form
            action={acaoAtivo}
            onSubmit={(e) => {
              if (usuario.ativo && !confirm(`Desativar ${usuario.nome}? A pessoa perde o acesso imediatamente.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={usuario.id} />
            <input type="hidden" name="ativo" value={usuario.ativo ? "false" : "true"} />
            <Botao type="submit" variante={usuario.ativo ? "perigo" : "secundario"} disabled={pendenteAtivo}>
              {usuario.ativo ? "Desativar" : "Reativar"}
            </Botao>
          </form>
        </div>
      ) : null}

      {redefinindo && usuario.ativo ? (
        <form
          action={(fd) => {
            acaoSenha(fd);
            setRedefinindo(false);
          }}
          className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
        >
          <input type="hidden" name="id" value={usuario.id} />
          <div className="min-w-48 flex-1">
            <Campo
              id={`senha-${usuario.id}`}
              name="senha"
              rotulo="Nova senha temporária"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              minLength={8}
              required
              autoComplete="off"
              erro={estadoSenha.erros?.senha}
            />
          </div>
          <Botao type="submit" disabled={pendenteSenha}>
            Salvar
          </Botao>
        </form>
      ) : null}
    </li>
  );
}
