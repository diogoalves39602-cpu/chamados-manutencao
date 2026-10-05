// Senha inicial legível para ditar ou mandar por mensagem (sem 0/O, 1/l/I).
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarSenha(tamanho = 10) {
  const valores = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(valores, (v) => ALFABETO[v % ALFABETO.length]).join("");
}
