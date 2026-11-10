// Gaveta que abre ao clicar num turno da escala.
// Nela se escolhe o grupo do turno, deixa o turno livre ou passa o grupo para outro preceptor livre.
import { estado, aplicar } from '../estado.js';
import {
  porId, rotuloSlot, horarioDoSlot, alunosDoGrupo, numeroEscala,
  alocacaoEm, avaliarGrupo, gruposParaSlot, preceptoresLivres, definirGrupo, trocarPreceptor,
} from '../dominio/index.js';
import { gaveta, caixaDeAviso, nomeDoPreceptor, grupoOuLivre } from '../componentes.js';
import { escapar, agora } from '../util.js';

export function gavetaDoTurno() {
  const { dados, ui } = estado;
  const { preceptorId, slot } = ui.turnoAberto;
  const rodizio = porId(dados.rodizios, ui.rodizioId);
  const preceptor = porId(dados.preceptores, preceptorId);
  const modulo = porId(dados.modulos, preceptor.moduloId);
  const unidade = porId(dados.unidades, preceptor.unidadeId);
  const alocacao = alocacaoEm(dados, rodizio.id, preceptor.id, slot);
  const turno = { dados, rodizio, modulo, preceptor, slot, alocacao };

  return gaveta({
    sobretitulo: `Escala ${numeroEscala(dados, rodizio.id, modulo.id)} · ${escapar(modulo.nome)} · Rodízio ${rodizio.ordem}`,
    titulo: escapar(preceptor.nome),
    subtitulo: `${rotuloSlot(slot)}, ${escapar(horarioDoSlot(modulo, slot))} · ${escapar(unidade.nome)} · ${escapar(preceptor.setor)}`,
    conteudo: `
      ${ui.aviso && ui.aviso.naGaveta ? caixaDeAviso(ui.aviso, 'alert') : ''}
      ${problemasDoGrupoAtual(turno)}
      ${secaoEscolherGrupo(turno)}
      ${alocacao ? secaoPassarGrupo(turno) : ''}`,
  });
}

// Se o grupo que já está no turno tem problema (conflito, fora do horário), mostra no topo.
function problemasDoGrupoAtual({ dados, rodizio, preceptor, slot, alocacao }) {
  if (!alocacao) return '';
  const problemas = avaliarGrupo(dados, rodizio.id, preceptor.id, slot, alocacao.grupoId, alocacao.id);
  if (!problemas.length) return '';
  const nivel = problemas.some((p) => p.nivel === 'bloqueia') ? 'erro' : 'aviso';
  return caixaDeAviso({ nivel, texto: problemas.map((p) => p.texto).join(' ') });
}

// Lista de grupos que podem ficar no turno, com o motivo quando algum não pode.
function secaoEscolherGrupo({ dados, rodizio, preceptor, slot, alocacao }) {
  const opcoes = gruposParaSlot(dados, rodizio.id, preceptor.id, slot).map(({ grupo, avisos, bloqueado, carga }) => {
    const estaNoTurno = alocacao && alocacao.grupoId === grupo.id;
    const motivo = !estaNoTurno && avisos.length
      ? `<span class="${bloqueado ? 'txt-erro' : 'txt-aviso'}">${escapar(avisos.map((a) => a.texto).join(' '))}</span>`
      : '';
    const botao = estaNoTurno
      ? '<span class="atual">Neste turno</span>'
      : `<button type="button" class="btn sec pequeno" data-acao="colocar-grupo" data-grupo="${escapar(grupo.id)}" ${bloqueado ? 'disabled' : ''}>Colocar</button>`;
    return `
      <li class="${bloqueado && !estaNoTurno ? 'bloqueado' : ''}">
        <div class="opcao-info">
          <b>Grupo ${escapar(grupo.id)}</b>
          <span class="mudo">${alunosDoGrupo(dados, grupo.id).length} alunos · ${carga.total} h de ${carga.meta} h no rodízio</span>
          ${motivo}
        </div>
        ${botao}
      </li>`;
  }).join('');

  const deixarLivre = alocacao
    ? '<button type="button" class="link perigo" data-acao="colocar-grupo" data-grupo="">Deixar o turno livre</button>'
    : '';
  return `
    <section class="gaveta-secao">
      <h3>Grupo neste turno</h3>
      <ul class="opcoes">${opcoes}</ul>
      ${deixarLivre}
    </section>`;
}

// Preceptores do módulo livres no mesmo horário, para quem dá para passar o grupo.
function secaoPassarGrupo({ dados, rodizio, modulo, preceptor, slot, alocacao }) {
  const livres = preceptoresLivres(dados, rodizio.id, modulo.id, slot).filter((p) => p.id !== preceptor.id);
  const itens = livres.map((outro) => {
    const unidade = porId(dados.unidades, outro.unidadeId);
    return `
      <li>
        <div class="opcao-info"><b>${escapar(outro.nome)}</b><span class="mudo">${escapar(unidade.nome)} · ${escapar(outro.setor)}</span></div>
        <button type="button" class="btn sec pequeno" data-acao="passar-grupo" data-preceptor="${escapar(outro.id)}">Passar</button>
      </li>`;
  }).join('');

  return `
    <section class="gaveta-secao">
      <h3>Passar o grupo ${escapar(alocacao.grupoId)} para outro preceptor</h3>
      ${itens ? `<ul class="opcoes">${itens}</ul>` : '<p class="mudo">Nenhum preceptor deste módulo está livre neste horário.</p>'}
    </section>`;
}

export const acoes = {
  // Coloca o grupo no turno aberto. Com data-grupo vazio, deixa o turno livre.
  'colocar-grupo'(botao) {
    const { ui } = estado;
    const turno = { rodizioId: ui.rodizioId, ...ui.turnoAberto };
    const grupoId = botao.dataset.grupo;
    const resultado = definirGrupo(estado.dados, turno, grupoId, agora());
    if (!resultado.ok) {
      ui.aviso = { nivel: 'erro', naGaveta: true, texto: resultado.motivo };
      return;
    }
    const preceptor = nomeDoPreceptor(estado.dados, turno.preceptorId);
    ui.turnoAberto = null;
    aplicar(resultado, `${preceptor}, ${rotuloSlot(turno.slot)}: ${grupoOuLivre(grupoId)}.`);
  },

  // Passa o grupo do turno aberto para outro preceptor.
  'passar-grupo'(botao) {
    const { ui } = estado;
    const turno = { rodizioId: ui.rodizioId, ...ui.turnoAberto };
    const novoPreceptorId = botao.dataset.preceptor;
    const grupoId = alocacaoEm(estado.dados, turno.rodizioId, turno.preceptorId, turno.slot).grupoId;
    const resultado = trocarPreceptor(estado.dados, turno, novoPreceptorId, agora());
    if (!resultado.ok) {
      ui.aviso = { nivel: 'erro', naGaveta: true, texto: resultado.motivo };
      return;
    }
    const novoPreceptor = nomeDoPreceptor(estado.dados, novoPreceptorId);
    ui.turnoAberto = null;
    aplicar(resultado, `O grupo ${grupoId} passou para ${novoPreceptor} (${rotuloSlot(turno.slot)}).`);
  },
};
