"use client";

import { useActionState } from "react";
import { Alerta, Botao, Campo, Selecao } from "@/components/ui";
import { criarDestino, testarDestino, type EstadoDestino } from "./actions";

export function FormNovoDestino() {
  const [estado, acao, pendente] = useActionState(criarDestino, {} as EstadoDestino);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      {estado.erro ? (
        <div className="sm:col-span-2">
          <Alerta>{estado.erro}</Alerta>
        </div>
      ) : null}
      {estado.ok ? (
        <div className="sm:col-span-2">
          <Alerta tipo="sucesso">{estado.ok}</Alerta>
        </div>
      ) : null}
      <Campo id="d-nome" name="nome" rotulo="Nome" placeholder="Ex.: Grupo Manutenção (Feishu)" required />
      <Selecao id="d-plataforma" name="plataforma" rotulo="Plataforma" defaultValue="feishu">
        <option value="feishu">Feishu (open.feishu.cn)</option>
        <option value="lark">Lark (open.larksuite.com)</option>
      </Selecao>
      <div className="sm:col-span-2">
        <Campo
          id="d-url"
          name="webhook_url"
          rotulo="Webhook do bot"
          placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/…"
          required
          autoComplete="off"
        />
      </div>
      <div className="sm:col-span-2">
        <Campo
          id="d-secret"
          name="secret_assinatura"
          rotulo="Secret da verificação por assinatura (recomendado)"
          type="password"
          autoComplete="off"
          ajuda="Em Segurança do bot, marque “Verificação por assinatura” e cole o secret aqui."
        />
      </div>
      <div className="sm:col-span-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Cadastrar destino"}
        </Botao>
      </div>
    </form>
  );
}

export function BotaoTeste({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState(testarDestino, {} as EstadoDestino);
  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <Botao type="submit" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar teste"}
      </Botao>
      {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
      {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
    </form>
  );
}
