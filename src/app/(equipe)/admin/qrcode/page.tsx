import type { Metadata } from "next";
import QRCode from "qrcode";
import { descreverSla } from "@/lib/chamados/rotulos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = { title: "QR Code do formulário" };

// Cartaz para imprimir e colar nos ambientes, e link para divulgar no Feishu/Lark.
export default async function PaginaQrCode() {
  const url = `${await urlBase()}/abrir-chamado`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 320 });
  const { data: config } = await (await criarClienteServidor()).from("configuracoes").select("sla_minutos").single();
  const prazo = descreverSla(config?.sla_minutos ?? 120);

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="text-xl font-bold text-zinc-900">QR Code e link do formulário</h1>
        <p className="text-sm text-zinc-600">
          Imprima o cartaz ou copie o link para divulgar nos grupos do Feishu e do Lark. Se o endereço abaixo não for o
          definitivo, defina a variável <code>APP_URL</code> no servidor.
        </p>
      </div>

      <section className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border-2 border-zinc-900 bg-white p-8 text-center print:border-0">
        <h2 className="text-2xl font-bold">Problema de manutenção?</h2>
        <p className="text-base">Aponte a câmera do celular e abra um chamado.</p>
        <div
          className="w-64 [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`QR Code para ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="break-all font-mono text-sm">{url}</p>
        <p className="text-sm text-zinc-600">Atendimento 24 horas · prazo de até {prazo}</p>
      </section>

      <div className="flex justify-center print:hidden">
        <BotaoImprimir />
      </div>
    </div>
  );
}
