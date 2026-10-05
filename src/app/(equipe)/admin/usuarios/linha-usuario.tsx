"use client";

import { useActionState, useState } from "react";
import { Ban, Hourglass, ShieldCheck, Wrench } from "lucide-react";
import { Alerta, Botao, Campo, Selo } from "@/components/ui";
import { iniciais } from "@/lib/iniciais";
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
    <li className={`flex flex-col gap-3 px-4 py-4 sm:px-6 ${usuario.ativo ? "" : "bg-stone-50"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${
            usuario.ativo ? "bg-marca-100 text-marca-800" : "bg-stone-200 text-stone-500"
          }`}
          aria-hidden
        >
          {iniciais(usuario.nome)}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${usuario.ativo ? "text-stone-900" : "text-stone-500 line-through"}`}>
            {usuario.nome} {ehVoce ? <span className="text-xs font-normal text-stone-500">(você)</span> : null}
          </p>
          <p className="font-mono text-xs text-stone-500">{usuario.login}</p>
        </div>
        <Selo className={usuario.papel === "admin" ? "bg-marca-700 text-white" : "bg-stone-100 text-stone-700"} icone={usuario.papel === "admin" ? ShieldCheck : Wrench}>
          {usuario.papel === "admin" ? "Admin" : "Técnico"}
        </Selo>
        {!usuario.ativo ? (
          <Selo className="bg-stone-200 text-stone-700" icone={Ban}>
            Desativado
          </Selo>
        ) : usuario.deve_trocar_senha ? (
          <Selo className="bg-amber-100 text-amber-900" icone={Hourglass}>
            Aguardando 1º acesso
          </Selo>
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
          className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3"
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
