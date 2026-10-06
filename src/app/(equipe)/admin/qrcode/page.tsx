import type { Metadata } from "next";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { Marca } from "@/components/marca";
import { CabecalhoPagina } from "@/components/ui";
import { descreverSla } from "@/lib/chamados/rotulos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlBase } from "@/lib/url";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = { title: "QR Code do formulário" };

// Cartaz para imprimir e colar nos ambientes, e link para divulgar no Feishu/Lark.
export default async function PaginaQrCode() {
  const url = `${await urlBase()}/`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 320 });
  const { data: config } = await (await criarClienteServidor()).from("configuracoes").select("sla_minutos").single();
  const prazo = descreverSla(config?.sla_minutos ?? 120);

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <CabecalhoPagina
          icone={QrCode}
          titulo="QR Code e link do formulário"
          subtitulo={
            <>
              Imprima o cartaz ou copie o link para divulgar nos grupos do Feishu e do Lark. Se o endereço abaixo não for o
              definitivo, defina a variável <code>APP_URL</code> no servidor.
            </>
          }
        />
      </div>

      <section className="mx-auto flex w-full max-w-md flex-col items-center overflow-hidden rounded-3xl border border-stone-200 bg-white text-center shadow-lg print:border-0 print:shadow-none">
        <div className="fundo-marca flex w-full flex-col items-center gap-3 px-8 py-6 text-white print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
          <Marca claro />
          <h2 className="text-2xl font-bold">Problema de manutenção?</h2>
          <p className="text-base text-marca-100">Aponte a câmera do celular e abra um chamado.</p>
        </div>
        <div className="flex flex-col items-center gap-4 p-8 pt-6">
        <div
          className="w-64 [&>svg]:h-auto [&>svg]:w-full"
          role="img"
          aria-label={`QR Code para ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="break-all font-mono text-sm">{url.replace(/\/$/, "")}</p>
        <p className="text-sm font-semibold text-marca-800">Atendimento 24 horas · prazo de até {prazo}</p>
        </div>
      </section>

      <div className="flex justify-center print:hidden">
        <BotaoImprimir />
      </div>
    </div>
  );
}
