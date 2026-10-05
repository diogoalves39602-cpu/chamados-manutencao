import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { registrarChamado } from "@/lib/chamados/abrir";
import { novoChamadoSchema } from "@/lib/chamados/validacao";
import { formatarDataHora } from "@/lib/datas";
import { dentroDoLimite } from "@/lib/seguranca";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Entrada de chamados por integração (automação do Base do Feishu/Lark, n8n, etc.).
//   POST /api/chamados/webhook
//   Authorization: Bearer <token do canal>   (ou header X-Api-Token)
//   Content-Type: application/json
// A origem (feishu | lark | api) vem do token, nunca do corpo.

const LIMITE_POR_MINUTO = 60;

type Campo = "solicitante_nome" | "solicitante_setor" | "solicitante_contato" | "local" | "categoria" | "descricao" | "foto_url";

// Aceita nomes alternativos (as automações do Base costumam usar rótulos curtos).
const ALIASES: Record<string, Campo> = {
  solicitante_nome: "solicitante_nome", nome: "solicitante_nome", solicitante: "solicitante_nome",
  solicitante_setor: "solicitante_setor", setor: "solicitante_setor",
  solicitante_contato: "solicitante_contato", contato: "solicitante_contato", telefone: "solicitante_contato", email: "solicitante_contato",
  local: "local", localizacao: "local",
  categoria: "categoria", categoria_id: "categoria",
  descricao: "descricao", problema: "descricao",
  foto_url: "foto_url", foto: "foto_url",
};

function semAcento(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

// Campos do Base podem chegar como número, array (multi-seleção) ou objeto {text}.
function paraTexto(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(paraTexto).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return paraTexto(o.text ?? o.name ?? o.value ?? o.link);
  }
  return undefined;
}

function json(status: number, corpo: Record<string, unknown>) {
  return NextResponse.json(corpo, { status });
}

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = (bearer ?? request.headers.get("x-api-token") ?? "").trim();
  if (!token) return json(401, { ok: false, erro: "Token ausente. Envie Authorization: Bearer <token>." });

  const admin = criarClienteAdmin();
  const { data: origem, error: erroToken } = await admin.rpc("validar_token_integracao", { p_token: token });
  if (erroToken) return json(500, { ok: false, erro: "Falha ao validar o token." });
  if (!origem) return json(401, { ok: false, erro: "Token inválido ou revogado." });

  if (!(await dentroDoLimite(`webhook:${origem}`, LIMITE_POR_MINUTO, 60))) {
    return json(429, { ok: false, erro: "Limite de requisições excedido. Tente em 1 minuto." });
  }

  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return json(400, { ok: false, erro: "Corpo precisa ser JSON válido." });
  }
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return json(400, { ok: false, erro: "Envie um objeto JSON com os campos do chamado." });
  }

  // Normaliza nomes e valores.
  const entrada: Partial<Record<Campo, string>> = {};
  for (const [chave, valor] of Object.entries(bruto as Record<string, unknown>)) {
    const campo = ALIASES[semAcento(chave).replace(/\s+/g, "_")];
    const texto = paraTexto(valor);
    if (campo && texto && !entrada[campo]) entrada[campo] = texto.trim();
  }

  // Categoria por id ou por nome (sem acento/maiúsculas). Desconhecida → "Outros".
  const { data: categorias } = await admin.from("categorias").select("id, nome").eq("ativo", true);
  const informada = entrada.categoria ?? "";
  const encontrada =
    categorias?.find((c) => String(c.id) === informada) ??
    categorias?.find((c) => semAcento(c.nome) === semAcento(informada));
  const outros = categorias?.find((c) => semAcento(c.nome) === "outros");
  const categoria = encontrada ?? outros;
  if (!categoria) {
    return json(422, { ok: false, erro: "Categoria inválida.", categorias_validas: categorias?.map((c) => c.nome) });
  }

  let descricao = entrada.descricao ?? "";
  if (!encontrada && informada) descricao += `\n\n(Categoria informada: ${informada})`;
  if (entrada.foto_url && /^https:\/\//i.test(entrada.foto_url)) descricao += `\n\nFoto: ${entrada.foto_url}`;

  const dados = novoChamadoSchema.safeParse({ ...entrada, categoria_id: categoria.id, descricao });
  if (!dados.success) {
    const campos = z.flattenError(dados.error).fieldErrors;
    return json(422, {
      ok: false,
      erro: "Dados inválidos.",
      campos: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v?.[0]])),
    });
  }

  try {
    const chamado = await registrarChamado(dados.data, origem);
    return json(201, {
      ok: true,
      numero: chamado.numero,
      aberto_em: chamado.aberto_em,
      prazo_limite: chamado.prazo_limite,
      prazo_limite_local: formatarDataHora(chamado.prazo_limite),
      origem,
    });
  } catch (e) {
    console.error("webhook:", e);
    return json(500, { ok: false, erro: "Não foi possível registrar o chamado." });
  }
}
