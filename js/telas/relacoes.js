// Aba "Relações de alunos": o documento de cada preceptor, com os alunos de todos os grupos dele no semestre.
// À esquerda, a lista de preceptores do módulo; à direita, a relação do preceptor escolhido.
import { estado, aplicar } from '../estado.js';
import {
  porId, rotuloSlot, preceptoresDoModulo, relacaoPreceptor, relacoesDo, statusRelacao, emitirRelacao,
} from '../dominio/index.js';
import { nomeDoPreceptor, descreverTroca, opcoesDeModulo } from '../componentes.js';
import { escapar, formatarData, formatarDataHora, agora } from '../util.js';

// Como cada situação aparece na lista de preceptores.
const SITUACOES = {
  em_dia: { classe: '', texto: 'Em dia' },
  desatualizada: { classe: 'txt-aviso', texto: 'Mudou' },
  nao_emitida: { classe: 'mudo', texto: 'Não emitida' },
};

export function telaRelacoes() {
  const { dados, ui } = estado;
  const lista = preceptoresDoModulo(dados, ui.moduloDasRelacoes)
    .filter((p) => statusRelacao(dados, p.id) !== 'sem_grupos');
  const escolhidoId = preceptorEscolhido(dados, ui, lista);
  const escolhido = escolhidoId && porId(dados.preceptores, escolhidoId);
  return `
    <div class="duas-colunas">
      <section class="secao">
        <div class="campo-inline">
          <label for="filtro-rel">Módulo</label>
          <select id="filtro-rel" data-mudar="filtrar-relacoes">${opcoesDeModulo(dados, ui.moduloDasRelacoes)}</select>
        </div>
        <ul class="lista-lateral">${lista.map((p) => itemDaLista(dados, p, escolhidoId)).join('')}</ul>
      </section>
      <section class="secao doc-area">
        ${escolhido ? relacaoDoPreceptor(dados, escolhido) : '<p class="mudo">Nenhum preceptor com grupos neste módulo.</p>'}
      </section>
    </div>`;
}

// Qual preceptor mostrar: o que a pessoa escolheu, se ele está na lista; senão, o primeiro com relação
// desatualizada ou, se não houver, o primeiro da lista. Só calcula: não muda o estado.
function preceptorEscolhido(dados, ui, lista) {
  if (lista.some((p) => p.id === ui.preceptorDaRelacao)) return ui.preceptorDaRelacao;
  const primeiro = lista.find((p) => statusRelacao(dados, p.id) === 'desatualizada') || lista[0];
  return primeiro ? primeiro.id : null;
}

function itemDaLista(dados, preceptor, escolhidoId) {
  const situacao = SITUACOES[statusRelacao(dados, preceptor.id)];
  return `
    <li>
      <button type="button" class="item-lista" aria-pressed="${preceptor.id === escolhidoId}" data-acao="abrir-relacao" data-id="${escapar(preceptor.id)}">
        <span>${escapar(preceptor.nome)}</span><span class="${situacao.classe} pequeno">${situacao.texto}</span>
      </button>
    </li>`;
}

function relacaoDoPreceptor(dados, preceptor) {
  const relacao = relacaoPreceptor(dados, preceptor.id);
  return `
    ${barraDeEmissao(dados, preceptor)}
    ${mudancasDesdeAUltimaEmissao(dados, preceptor)}
    <article class="doc" aria-label="Relação de alunos por grupo">
      <header class="doc-cab">
        <p>Coordenação de Estágio · Coordenação de Medicina</p>
        <h3>Relação de alunos por grupo</h3>
      </header>
      <dl class="doc-ficha">${fichaDaRelacao(relacao)}</dl>
      ${relacao.grupos.map((grupo) => tabelaDoGrupo(grupo)).join('')}
      <div class="assinaturas"><span>Coordenador de Estágio</span><span>Coordenador do Curso</span></div>
    </article>
    <p class="dica">No sistema final, esta relação sai em PDF a partir do modelo .docx da coordenação.</p>`;
}

// Diz qual versão está emitida e, se a escala mudou, mostra o botão para emitir de novo.
function barraDeEmissao(dados, preceptor) {
  const emitidas = relacoesDo(dados, preceptor.id);
  const ultima = emitidas.at(-1);
  const situacao = statusRelacao(dados, preceptor.id);

  let texto = 'Ainda não emitida.';
  if (situacao === 'em_dia') texto = `Versão ${ultima.versao}, emitida em ${escapar(formatarDataHora(ultima.quando))}.`;
  if (situacao === 'desatualizada') texto = `<span class="txt-aviso">A escala mudou depois da versão ${ultima.versao}.</span>`;

  const botao = situacao === 'em_dia'
    ? ''
    : `<button type="button" class="btn" data-acao="emitir-relacao" data-id="${escapar(preceptor.id)}">Emitir versão ${emitidas.length + 1}</button>`;
  return `
    <div class="barra-doc">
      <p>${texto}</p>
      ${botao}
    </div>`;
}

// Alterações de escala que envolvem o preceptor, feitas depois da última emissão.
function mudancasDesdeAUltimaEmissao(dados, preceptor) {
  const ultima = relacoesDo(dados, preceptor.id).at(-1);
  if (!ultima) return '';
  const envolveOPreceptor = (troca) =>
    troca.preceptorId === preceptor.id || troca.de === preceptor.id || troca.para === preceptor.id;
  const mudancas = dados.trocas.filter((troca) => troca.quando > ultima.quando && envolveOPreceptor(troca));
  if (!mudancas.length) return '';

  const itens = mudancas.map((troca) => {
    const rodizio = porId(dados.rodizios, troca.rodizioId);
    const quando = `${escapar(formatarDataHora(troca.quando))} · Rodízio ${rodizio.ordem}, ${rotuloSlot(troca.slot)}`;
    return `<li>${quando}: ${descreverTroca(dados, troca)}</li>`;
  }).join('');
  return `<ul class="mudancas">${itens}</ul>`;
}

// Cabeçalho do documento: preceptor, unidade, datas, cargas horárias...
function fichaDaRelacao(relacao) {
  const carga = relacao.cargaIndividual;
  let cargaIndividual = '—';
  if (carga) cargaIndividual = carga.min === carga.max ? `${carga.max} h` : `de ${carga.min} a ${carga.max} h`;
  const periodo = relacao.inicio ? `${formatarData(relacao.inicio)} a ${formatarData(relacao.fim)}` : '—';

  const linhas = [
    ['Preceptor(a)', relacao.preceptor],
    ['CRM-MA', relacao.crm || '—'],
    ['Disciplina', relacao.modulo],
    ['Unidade concedente', `${relacao.unidade}, ${relacao.municipio}`],
    ['Setor', relacao.setor],
    // Período e semestre só aparecem se existirem nos dados (o exemplo não tem mais esses campos).
    ['Curso', [relacao.curso, relacao.periodo].filter(Boolean).join(', ')],
    ['Semestre', relacao.semestre || '—'],
    ['Data inicial e final', periodo],
    ['Nº de grupos', relacao.totalGrupos],
    ['Nº de alunos', relacao.totalAlunos],
    ['Dias da semana', relacao.dias],
    ['Horário', relacao.horarios],
    ['Carga horária individual', cargaIndividual],
    ['Carga horária total', `${relacao.cargaTotal} h`],
    ['Nº de semanas', relacao.semanas],
  ];
  return linhas.map(([rotulo, valor]) => `<div><dt>${rotulo}</dt><dd>${escapar(valor)}</dd></div>`).join('');
}

function tabelaDoGrupo(grupo) {
  const linhas = grupo.alunos.map((aluno, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escapar(aluno.nome)}</td>
      <td>${escapar(aluno.matricula)}</td>
    </tr>`).join('');

  return `
    <section class="doc-grupo">
      <h4>Grupo ${escapar(grupo.grupo)}</h4>
      <p>${escapar(formatarData(grupo.inicio))} a ${escapar(formatarData(grupo.fim))} · ${escapar(grupo.dias)}</p>
      <table>
        <thead><tr><th class="num">Nº</th><th>Nome completo</th><th>R.A.</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </section>`;
}

export const acoes = {
  'filtrar-relacoes'(lista) {
    estado.ui.moduloDasRelacoes = lista.value;
    estado.ui.preceptorDaRelacao = null;
  },
  'abrir-relacao'(botao) {
    estado.ui.preceptorDaRelacao = botao.dataset.id;
    estado.ui.aviso = null;
  },
  'emitir-relacao'(botao) {
    const preceptorId = botao.dataset.id;
    const versao = relacoesDo(estado.dados, preceptorId).length + 1;
    const nome = nomeDoPreceptor(estado.dados, preceptorId);
    estado.ui.preceptorDaRelacao = preceptorId; // depois de emitir, a tela continua neste preceptor
    aplicar(emitirRelacao(estado.dados, preceptorId, agora()), `Versão ${versao} da relação de ${nome} emitida.`);
  },
};
