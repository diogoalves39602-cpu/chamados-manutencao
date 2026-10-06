"use client";

import { useActionState, useState } from "react";
import { MessageCircle, MessageSquareText, Send } from "lucide-react";
import { enviarSemReset } from "@/components/envio";
import { Alerta, Botao, Cartao } from "@/components/ui";
import { MODELOS_MENSAGEM, type DadosModelo } from "@/lib/chamados/modelos-mensagem";
import { linkWhatsapp } from "@/lib/contato";
import { enviarPeloFeishu, registrarWhatsapp, type EstadoMensagem } from "./mensagens-actions";

/** Cartão "Enviar mensagem ao solicitante" (Feishu direto pelo bot, WhatsApp com texto pronto). */
export function EnviarMensagem({
  chamadoId,
  contato,
  dados,
  feishu,
}: {
  chamadoId: string;
  contato: string;
  dados: DadosModelo;
  /** Nome da plataforma ("Feishu"/"Lark") se o solicitante entrou com ela; senão null. */
  feishu: string | null;
}) {
  const [estado, acao, pendente] = useActionState(enviarPeloFeishu, {} as EstadoMensagem);
  const [texto, setTexto] = useState(() => MODELOS_MENSAGEM[0].texto(dados));
  const temWhatsapp = linkWhatsapp(contato) !== null;

  return (
    <Cartao className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-semibold text-stone-900">
        <MessageSquareText className="h-5 w-5 text-marca-700" aria-hidden />
        Enviar mensagem ao solicitante
      </h2>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Modelos de mensagem">
        {MODELOS_MENSAGEM.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setTexto(m.texto(dados))}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-marca-300 hover:bg-marca-50 hover:text-marca-800"
          >
            {m.rotulo}
          </button>
        ))}
      </div>

      <form onSubmit={enviarSemReset(acao)} className="flex flex-col gap-3">
        <input type="hidden" name="chamadoId" value={chamadoId} />
        <label htmlFor="texto-mensagem" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="texto-mensagem"
          name="texto"
          rows={4}
          maxLength={2000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 outline-none focus:border-marca-600 focus:ring-4 focus:ring-marca-100"
        />
        {estado.erro ? <Alerta>{estado.erro}</Alerta> : null}
        {estado.ok ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Botao
            type="submit"
            icone={Send}
            disabled={pendente || !feishu || !texto.trim()}
            className="flex-1"
            title={feishu ? undefined : "O solicitante não entrou com o Feishu ao abrir o chamado"}
          >
            {pendente ? "Enviando…" : feishu ? `Enviar pelo ${feishu}` : "Feishu indisponível"}
          </Botao>
          <Botao
            type="button"
            variante="secundario"
            icone={MessageCircle}
            disabled={!temWhatsapp || !texto.trim()}
            className="flex-1"
            onClick={() => {
              const link = linkWhatsapp(contato, texto.trim());
              if (!link) return;
              window.open(link, "_blank", "noopener");
              void registrarWhatsapp(chamadoId, texto.trim());
            }}
          >
            {temWhatsapp ? "Abrir no WhatsApp" : "Sem telefone para WhatsApp"}
          </Botao>
        </div>
        <p className="text-xs text-stone-500">
          {feishu
            ? `Pelo ${feishu}, a mensagem chega direto para a pessoa, enviada pelo bot "Chamados de Manutenção". `
            : "O Feishu só fica disponível quando a pessoa entra com a conta dela ao abrir o chamado. "}
          No WhatsApp, a conversa abre com o texto pronto: é só tocar em enviar.
        </p>
      </form>
    </Cartao>
  );
}
