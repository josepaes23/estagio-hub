// Regras do sistema, sem nada de tela. Cada arquivo cuida de um assunto;
// as telas e os testes importam tudo por aqui.
//
// Nenhuma regra altera os dados que recebe. As que mudam alguma coisa devolvem
// { ok: true, dados: <cópia nova> } ou { ok: false, motivo: 'texto explicando o problema' }.
// Por isso este código pode ser reaproveitado no sistema definitivo.

export { porId, porNome } from './comum.js';
export * from './calendario.js';
export * from './cpf.js';
export * from './turmas.js';
export * from './rotacao.js';
export * from './preceptores.js';
export * from './escalas.js';
export * from './relacoes.js';
export * from './pendencias.js';
export * from './formato.js';
