"use client";

// Alertas de novo chamado no painel: som (Web Audio, sem arquivo), notificação
// do sistema (se permitida) e título da aba piscando.
// Navegadores só liberam som após um toque do usuário: por isso o botão
// "Ativar alertas" no painel.

const CHAVE = "chamados:alertas";
let contexto: AudioContext | null = null;

export function alertasAtivados() {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
}

/** Chamar dentro de um clique: desbloqueia o áudio e pede permissão de notificação. */
export async function ativarAlertas() {
  contexto ??= new AudioContext();
  await contexto.resume();
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
  try {
    localStorage.setItem(CHAVE, "1");
  } catch {
    // ignora
  }
  tocarSom();
}

export function desativarAlertas() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ignora
  }
}

export function tocarSom() {
  if (!alertasAtivados()) return;
  contexto ??= new AudioContext();
  if (contexto.state === "suspended") void contexto.resume();
  const inicio = contexto.currentTime;
  // Três bipes curtos, alternando 880 Hz e 660 Hz.
  [0, 0.25, 0.5].forEach((atraso, i) => {
    const osc = contexto!.createOscillator();
    const ganho = contexto!.createGain();
    osc.type = "sine";
    osc.frequency.value = i % 2 === 0 ? 880 : 660;
    ganho.gain.setValueAtTime(0.0001, inicio + atraso);
    ganho.gain.exponentialRampToValueAtTime(0.4, inicio + atraso + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + atraso + 0.2);
    osc.connect(ganho).connect(contexto!.destination);
    osc.start(inicio + atraso);
    osc.stop(inicio + atraso + 0.22);
  });
}

export function notificarSistema(titulo: string, corpo: string, url: string) {
  if (!alertasAtivados() || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(titulo, { body: corpo, tag: url });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  } catch {
    // Alguns navegadores móveis só permitem notificações via service worker.
  }
}

let tituloOriginal: string | null = null;
let piscando: ReturnType<typeof setInterval> | undefined;

/** Pisca o título da aba até a pessoa voltar para ela. */
export function piscarTitulo(texto: string) {
  if (document.visibilityState === "visible" && document.hasFocus()) return;
  tituloOriginal ??= document.title;
  clearInterval(piscando);
  let alterna = false;
  piscando = setInterval(() => {
    document.title = (alterna = !alterna) ? texto : tituloOriginal!;
  }, 1000);
  const parar = () => {
    clearInterval(piscando);
    if (tituloOriginal) document.title = tituloOriginal;
    tituloOriginal = null;
    window.removeEventListener("focus", parar);
  };
  window.addEventListener("focus", parar);
}
