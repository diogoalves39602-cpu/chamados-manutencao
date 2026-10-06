"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao, Campo, Cartao } from "@/components/ui";
import { consultarPorContato, type EstadoConsulta } from "./actions";
import { ListaChamados } from "./lista-chamados";

/** Busca pelo telefone ou e-mail informado na abertura (não precisa do número). */
export function FormAcompanhar({ destacar }: { destacar?: string }) {
  const [estado, acao, pendente] = useActionState(consultarPorContato, {} as EstadoConsulta);

  return (
    <>
      <Cartao className="animate-entrar">
        <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-4">
          {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
          <Campo
            id="contato"
            name="contato"
            rotulo="Telefone ou e-mail usado na abertura"
            placeholder="Ex.: 11 98888-7777 ou nome@empresa.com"
            autoComplete="tel"
            required
            ajuda="Não precisa do número do chamado: mostramos todos os chamados abertos com esse contato."
          />
          <Botao type="submit" disabled={pendente} icone={Search}>
            {pendente ? "Buscando…" : "Ver meus chamados"}
          </Botao>
        </form>
      </Cartao>

      {estado.chamados ? (
        estado.chamados.length > 0 ? (
          <>
            <p className="px-1 text-sm text-stone-600">
              {estado.chamados.length} chamado{estado.chamados.length === 1 ? "" : "s"} com este contato:
            </p>
            <ListaChamados chamados={estado.chamados} destacar={destacar} />
          </>
        ) : (
          <Alerta tipo="aviso">
            Nenhum chamado encontrado com esse contato. Confira se digitou o mesmo telefone ou e-mail usado na abertura.
          </Alerta>
        )
      ) : null}

      <Link href="/abrir-chamado" className="mx-auto text-sm font-medium text-marca-700 hover:underline">
        Abrir um novo chamado
      </Link>
    </>
  );
}
