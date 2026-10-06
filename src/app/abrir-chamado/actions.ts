"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { registrarChamado, salvarFoto } from "@/lib/chamados/abrir";
import { FOTO_MAX_BYTES, FOTO_TIPOS, novoChamadoSchema } from "@/lib/chamados/validacao";
import { dentroDoLimite, obterIp, sha256 } from "@/lib/seguranca";
import { solicitanteAtual } from "@/lib/solicitante/atual";
import { formularioExigeLogin } from "@/lib/solicitante/plataformas";

export type EstadoAbrir = {
  erro?: string;
  erros?: Partial<Record<keyof z.infer<typeof novoChamadoSchema> | "foto", string>>;
  sucesso?: { numero: string; aberto_em: string; prazo_limite: string };
};

const LIMITE_POR_IP = 6; // chamados por IP...
const JANELA_SEGUNDOS = 10 * 60; // ...a cada 10 minutos

export async function abrirChamado(_: EstadoAbrir, formData: FormData): Promise<EstadoAbrir> {
  // Honeypot: campo invisível que só robôs preenchem.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { erro: "Não foi possível enviar o chamado." };
  }

  const ip = obterIp(await headers());
  if (!(await dentroDoLimite(`form:${sha256(ip)}`, LIMITE_POR_IP, JANELA_SEGUNDOS))) {
    return { erro: "Muitos chamados enviados deste aparelho em pouco tempo. Aguarde alguns minutos." };
  }

  // Identidade do Feishu/Lark (cookie assinado pelo servidor): o nome vem da conta,
  // não do que foi digitado.
  const solicitante = await solicitanteAtual();
  if (!solicitante && formularioExigeLogin()) {
    return { erro: "Sua sessão expirou. Recarregue a página e entre com sua conta para abrir o chamado." };
  }

  const dados = novoChamadoSchema.safeParse({
    ...Object.fromEntries(formData),
    ...(solicitante ? { solicitante_nome: solicitante.nome } : {}),
  });
  if (!dados.success) {
    const campos = z.flattenError(dados.error).fieldErrors;
    return {
      erro: "Confira os campos destacados.",
      erros: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v?.[0]])),
    };
  }

  const foto = formData.get("foto");
  let fotoPath: string | undefined;
  if (foto instanceof File && foto.size > 0) {
    if (!FOTO_TIPOS.includes(foto.type as (typeof FOTO_TIPOS)[number])) {
      return { erros: { foto: "Envie uma imagem JPG, PNG ou WEBP." } };
    }
    if (foto.size > FOTO_MAX_BYTES) return { erros: { foto: "A foto deve ter no máximo 3 MB." } };
    try {
      fotoPath = await salvarFoto(foto);
    } catch (e) {
      console.error(e);
      return { erro: "Não foi possível enviar a foto. Tente sem a foto ou novamente em instantes." };
    }
  }

  try {
    const chamado = await registrarChamado(
      dados.data,
      "formulario",
      fotoPath,
      solicitante ? { plataforma: solicitante.plataforma, id: solicitante.id } : undefined,
    );
    return { sucesso: { numero: chamado.numero, aberto_em: chamado.aberto_em, prazo_limite: chamado.prazo_limite } };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error && e.message.includes("Categoria") ? e.message : "Não foi possível registrar o chamado.";
    return { erro: `${msg} Tente novamente.` };
  }
}
