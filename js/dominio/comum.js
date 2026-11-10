// Ferramentas pequenas que as regras usam o tempo todo.

// Acha um item da lista pelo id.
export const porId = (lista, id) => lista.find((item) => item.id === id);

// Para ordenar pessoas pelo nome, do jeito do português: lista.sort(porNome).
export const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

// Cópia completa dos dados. As regras nunca alteram o objeto que recebem:
// fazem a mudança numa cópia e devolvem a cópia.
export const copiar = (dados) => JSON.parse(JSON.stringify(dados));

// Só os números de um texto: "000.000.001-91" → "00000000191".
export const digitos = (texto) => String(texto || '').replace(/\D/g, '');

// Campo vazio ou só com espaços.
export const vazio = (valor) => !String(valor || '').trim();

// Código curto (até 11 letras e números) que muda sempre que o texto muda: "{…relação…}" → "5xq0k2m1h9a".
// Serve para saber se algo mudou sem guardar o texto, que pode ter dados pessoais.
// Algoritmo cyrb53, de domínio público. Não é criptografia: é só uma impressão digital do texto.
export function resumo(texto) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Próximo id com o prefixo dado: se já existem p1 e p2, devolve p3.
export function novoId(lista, prefixo) {
  const maior = lista.reduce((atual, item) => Math.max(atual, Number(digitos(item.id)) || 0), 0);
  return `${prefixo}${maior + 1}`;
}
