// Funções pequenas de texto, números e datas, usadas pelas telas.

const ENTIDADES_HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Protege um texto antes de colocá-lo no HTML, para que um nome com "<" ou aspas não quebre a página.
// Use sempre que o texto vier dos dados (nomes, setores, CPFs...).
export const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (letra) => ENTIDADES_HTML[letra]);

// Tira os acentos e deixa tudo minúsculo, para comparar em buscas: "Cláudia" → "claudia".
export const semAcento = (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const primeiraMaiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// plural(1, 'grupo', 'grupos') → "1 grupo"; plural(3, 'grupo', 'grupos') → "3 grupos"
export const plural = (quantidade, singular, varios) => `${quantidade} ${quantidade === 1 ? singular : varios}`;

// somar(grupos, (g) => g.alunos) soma o número de alunos de todos os grupos.
export const somar = (lista, valorDe) => lista.reduce((total, item) => total + valorDe(item), 0);

// As datas ficam guardadas no formato ISO: "2026-08-03" ou "2026-10-22T10:00".
export const formatarData = (iso) => iso.slice(0, 10).split('-').reverse().join('/'); // "03/08/2026"
export const formatarDiaMes = (iso) => formatarData(iso).slice(0, 5); // "03/08"
export const formatarDataHora = (iso) => `${formatarDiaMes(iso)} às ${iso.slice(11, 16)}`; // "22/10 às 10:00"

// Data e hora de agora no formato ISO, no fuso do computador: "2026-11-08T14:05:30".
// Os segundos servem para saber o que veio antes quando duas coisas acontecem no mesmo minuto
// (por exemplo, emitir a relação e trocar um grupo logo depois). A tela mostra só hora e minuto.
export function agora() {
  const instante = new Date();
  const doisDigitos = (numero) => String(numero).padStart(2, '0');
  const dia = `${instante.getFullYear()}-${doisDigitos(instante.getMonth() + 1)}-${doisDigitos(instante.getDate())}`;
  const hora = [instante.getHours(), instante.getMinutes(), instante.getSeconds()].map(doisDigitos).join(':');
  return `${dia}T${hora}`;
}
