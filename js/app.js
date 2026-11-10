// Ponto de partida do protótipo.
//
// Como funciona:
//  1. desenhar() monta o HTML da aba aberta a partir do estado (estado.js).
//  2. Cada botão ou campo diz, num atributo, qual ação dispara:
//       data-acao="..."    ao clicar
//       data-mudar="..."   ao mudar uma lista ou opção
//       data-digitar="..." a cada letra digitada
//       data-form="..."    ao enviar um formulário
//  3. A ação muda o estado e a página é desenhada de novo.
// As ações de cada tela ficam no próprio arquivo da tela, em telas/.
import { estado, fecharGavetas, restaurarExemplo } from './estado.js';
import { pendencias } from './dominio/index.js';
import { caixaDeAviso, descricaoDoCurso } from './componentes.js';
import { telaPainel, acoes as acoesDoPainel } from './telas/painel.js';
import { telaEscalas, acoes as acoesDasEscalas } from './telas/escalas.js';
import { gavetaDoTurno, acoes as acoesDoTurno } from './telas/turno.js';
import { telaCadastros, acoes as acoesDosCadastros } from './telas/cadastros.js';
import { gavetaDaFicha, acoes as acoesDaFicha } from './telas/ficha-preceptor.js';
import { telaRelacoes, acoes as acoesDasRelacoes } from './telas/relacoes.js';

const ABAS = [
  { id: 'painel', nome: 'Painel', tela: telaPainel },
  { id: 'escalas', nome: 'Escalas', tela: telaEscalas },
  { id: 'cadastros', nome: 'Cadastros', tela: telaCadastros },
  { id: 'relacoes', nome: 'Relações de alunos', tela: telaRelacoes },
];

// Ações que valem para a página toda.
const acoesGerais = {
  'abrir-aba'(botao) {
    const aba = botao.dataset.id;
    fecharGavetas();
    estado.ui.aba = aba;
    estado.ui.aviso = null;
    try {
      history.replaceState(null, '', `#${aba}`);
    } catch (erro) {
      // Sem histórico (página aberta de um jeito que não deixa mudar o endereço): segue sem.
    }
    window.scrollTo(0, 0);
  },
  'escolher-rodizio'(botao) {
    estado.ui.rodizioId = botao.dataset.id;
    estado.ui.turnoAberto = null;
    estado.ui.aviso = null;
  },
  fechar() {
    fecharGavetas();
  },
  restaurar() {
    restaurarExemplo();
  },
};

const acoes = {
  ...acoesGerais,
  ...acoesDoPainel,
  ...acoesDasEscalas,
  ...acoesDoTurno,
  ...acoesDosCadastros,
  ...acoesDaFicha,
  ...acoesDasRelacoes,
};

// Desenho da página

function desenhar() {
  const { dados, ui } = estado;
  const foco = lembrarFoco();
  const gavetaJaEstavaAberta = Boolean(document.querySelector('.gaveta'));
  const abaAberta = ABAS.find((aba) => aba.id === ui.aba);

  document.getElementById('abas').innerHTML = botoesDasAbas(dados, ui);
  document.getElementById('contexto').textContent = descricaoDoCurso(dados);
  document.getElementById('conteudo').innerHTML = avisoNoTopo(ui) + abaAberta.tela();
  document.getElementById('gaveta').innerHTML = gavetaAberta(ui);

  const temGaveta = Boolean(ui.rascunho || ui.turnoAberto);
  document.body.classList.toggle('travado', temGaveta); // a página de trás não rola com a gaveta aberta
  devolverFoco(foco);
  if (temGaveta && !gavetaJaEstavaAberta) document.getElementById('fechar-gaveta').focus();
}

// Botões das abas. A aba Painel mostra quantos erros o rodízio em andamento tem.
function botoesDasAbas(dados, ui) {
  const erros = pendencias(dados, dados.rodizioAtual).filter((p) => p.nivel === 'erro').length;
  return ABAS.map((aba) => {
    const contador = aba.id === 'painel' && erros
      ? `<span class="contador" aria-label="${erros} erros">${erros}</span>`
      : '';
    return `<button type="button" role="tab" aria-selected="${aba.id === ui.aba}" data-acao="abrir-aba" data-id="${aba.id}">${aba.nome}${contador}</button>`;
  }).join('');
}

// Mensagem da última ação. As que são da gaveta aparecem dentro dela.
const avisoNoTopo = (ui) => (ui.aviso && !ui.aviso.naGaveta ? caixaDeAviso(ui.aviso, 'status') : '');

function gavetaAberta(ui) {
  if (ui.rascunho) return gavetaDaFicha();
  if (ui.turnoAberto) return gavetaDoTurno();
  return '';
}

// Cada redesenho troca o HTML inteiro, e o campo em que a pessoa estava digitando sumiria.
// Por isso guardamos qual campo tinha o foco (pelo id) e onde estava o cursor, e devolvemos depois.
function lembrarFoco() {
  const campo = document.activeElement;
  if (!campo || !campo.id) return null;
  return { id: campo.id, cursor: typeof campo.selectionStart === 'number' ? campo.selectionStart : null };
}

function devolverFoco(foco) {
  const campo = foco && document.getElementById(foco.id);
  if (!campo) return;
  campo.focus();
  if (foco.cursor !== null) campo.setSelectionRange(foco.cursor, foco.cursor);
}

// A aba aberta fica no endereço da página (#escalas, #cadastros...), para o F5 voltar ao mesmo lugar.
function abaDoEndereco() {
  const id = location.hash.slice(1);
  return ABAS.some((aba) => aba.id === id) ? id : 'painel';
}

// Eventos

// Roda a ação e desenha a página de novo. Se a ação devolver uma função, ela roda depois do desenho
// (por exemplo, para levar o cursor até um campo com erro).
function executar(nomeDaAcao, elemento) {
  const acao = acoes[nomeDaAcao];
  if (!acao) {
    console.warn(`Nenhuma ação chamada "${nomeDaAcao}".`);
    return;
  }
  const depoisDeDesenhar = acao(elemento);
  desenhar();
  if (typeof depoisDeDesenhar === 'function') depoisDeDesenhar();
}

document.addEventListener('click', (evento) => {
  const elemento = evento.target.closest('[data-acao]');
  if (elemento && !elemento.disabled) executar(elemento.dataset.acao, elemento);
});

document.addEventListener('change', (evento) => {
  const nome = evento.target.dataset && evento.target.dataset.mudar;
  if (nome) executar(nome, evento.target);
});

document.addEventListener('input', (evento) => {
  const nome = evento.target.dataset && evento.target.dataset.digitar;
  if (nome) executar(nome, evento.target);
});

document.addEventListener('submit', (evento) => {
  evento.preventDefault();
  executar(evento.target.dataset.form, evento.target);
});

document.addEventListener('keydown', (evento) => {
  const temGaveta = estado.ui.rascunho || estado.ui.turnoAberto;
  if (evento.key === 'Escape' && temGaveta) executar('fechar');
});

estado.ui.aba = abaDoEndereco();
desenhar();
