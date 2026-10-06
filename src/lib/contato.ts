// Interpreta o contato livre do solicitante ("11 98888-7777", "+55 (11)…", "nome@empresa.com").

export function emailDe(contato: string): string | null {
  return contato.match(/[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]+/)?.[0] ?? null;
}

/** Só os dígitos do telefone (null se não parece telefone). */
export function telefoneDe(contato: string): string | null {
  if (emailDe(contato)) return null;
  const digitos = contato.replace(/\D/g, "");
  return digitos.length >= 8 ? digitos : null;
}

/** Número no formato do WhatsApp (com DDI 55 quando vier só DDD + número). */
export function numeroWhatsapp(contato: string): string | null {
  const tel = telefoneDe(contato);
  if (!tel) return null;
  return tel.length <= 11 ? `55${tel}` : tel;
}

/** Link "clique para conversar" do WhatsApp, com a mensagem já escrita. */
export function linkWhatsapp(contato: string, texto?: string): string | null {
  const numero = numeroWhatsapp(contato);
  if (!numero) return null;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
