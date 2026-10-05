/** "Carlos Mendes (exemplo)" → "CM". Ignora palavras que não começam com letra. */
export function iniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  if (palavras.length === 0) return "?";
  const primeira = palavras[0][0];
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
