// Aba "Cadastros": troca entre as sub-abas. Cada sub-aba tem o seu arquivo.
import { estado } from '../estado.js';
import { seletor } from '../componentes.js';
import { telaPreceptores, acoes as acoesDosPreceptores } from './preceptores.js';
import { telaTurmas, acoes as acoesDasTurmas } from './turmas.js';
import { telaUnidades } from './unidades.js';
import { telaPeriodo } from './periodo.js';

const CADASTROS = [
  { id: 'preceptores', nome: 'Preceptores', tela: telaPreceptores },
  { id: 'turmas', nome: 'Turmas e grupos', tela: telaTurmas },
  { id: 'unidades', nome: 'Unidades', tela: telaUnidades },
  { id: 'periodo', nome: 'Período e rodízios', tela: telaPeriodo },
];

export function telaCadastros() {
  const aberto = CADASTROS.find((cadastro) => cadastro.id === estado.ui.cadastro);
  const seletorDeCadastro = seletor({
    acao: 'escolher-cadastro',
    rotulo: 'Cadastro',
    marcado: aberto.id,
    opcoes: CADASTROS.map((cadastro) => ({ id: cadastro.id, texto: cadastro.nome })),
  });
  return `
    <section class="secao">${seletorDeCadastro}</section>
    ${aberto.tela()}`;
}

export const acoes = {
  'escolher-cadastro'(botao) {
    estado.ui.cadastro = botao.dataset.id;
    estado.ui.aviso = null;
  },
  ...acoesDosPreceptores,
  ...acoesDasTurmas,
};
