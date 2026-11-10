// Aba "Escalas": a grade de um módulo no rodízio.
// Cada linha é o horário fixo de um preceptor; cada coluna, um turno da semana.
// Clicar num turno abre a gaveta do turno (telas/turno.js).
import { estado } from '../estado.js';
import {
  DIAS, SLOTS, porId, rotuloSlot, descreverDias,
  turmaNoModulo, gruposDaTurma, alunosDoGrupo, preceptoresDoModulo,
  alocacaoEm, alocacoesDoGrupo, numeroEscala, cargaGrupo, choques, foraDoHorario,
} from '../dominio/index.js';
import { seletor, seletorDeRodizio } from '../componentes.js';
import { escapar, somar } from '../util.js';

export function telaEscalas() {
  const { dados, ui } = estado;
  const rodizio = porId(dados.rodizios, ui.rodizioId);
  const modulo = porId(dados.modulos, ui.moduloId);
  const turma = porId(dados.turmas, turmaNoModulo(dados, rodizio.id, modulo.id));
  const grupos = turma ? gruposDaTurma(dados, turma.id) : [];
  const totalAlunos = somar(grupos, (grupo) => alunosDoGrupo(dados, grupo.id).length);
  const seletorDeModulo = seletor({
    acao: 'escolher-modulo',
    rotulo: 'Módulo',
    marcado: modulo.id,
    opcoes: dados.modulos.map((m) => ({ id: m.id, texto: escapar(m.nome) })),
  });
  const sobreATurma = turma
    ? `${escapar(turma.nome)} · ${grupos.length} grupos · ${totalAlunos} alunos`
    : 'Nenhuma turma neste rodízio';

  return `
    <section class="secao">
      <div class="cab-secao">
        ${seletorDeRodizio(dados, rodizio.id)}
        ${seletorDeModulo}
      </div>
      <div>
        <h2>Escala ${numeroEscala(dados, rodizio.id, modulo.id)} · ${escapar(modulo.nome)}</h2>
        <p class="mudo">
          ${sobreATurma} ·
          turnos de ${modulo.horasTurno} h (manhã ${escapar(modulo.horarios.m)}, tarde ${escapar(modulo.horarios.t)}) ·
          meta de ${modulo.metaHoras} h no rodízio
        </p>
      </div>
      <p class="dica">
        Cada linha é o horário fixo de um preceptor. Clique num turno para colocar, trocar ou retirar o grupo,
        ou para passar o grupo a outro preceptor livre.
      </p>
      ${gradeDaEscala(dados, ui, rodizio, modulo)}
      ${LEGENDA}
    </section>
    ${secaoGruposDaTurma(dados, rodizio, turma, grupos)}`;
}

const LEGENDA = `
  <p class="legenda">
    <span class="amostra cel-a">A1</span> turno com grupo
    <span class="amostra livre-a">livre</span> turno sem grupo
    <span class="amostra nao-a"></span> não atende
    <span class="amostra conflito-a">A2</span> conflito
  </p>`;

function gradeDaEscala(dados, ui, rodizio, modulo) {
  // Turnos com problema, para pintar a célula de vermelho (choque) ou âmbar (fora do horário).
  const problemas = {
    choque: new Set(choques(dados, rodizio.id).flatMap((c) => c.alocacoes.map((a) => a.id))),
    fora: new Set(foraDoHorario(dados, rodizio.id).map((a) => a.id)),
  };
  const linhas = preceptoresDoModulo(dados, modulo.id)
    .map((preceptor) => linhaDoPreceptor(dados, ui, rodizio, preceptor, problemas))
    .join('');
  const nomesDosDias = DIAS.map((dia) => `<th colspan="2" scope="colgroup" class="dia">${dia.nome}</th>`).join('');
  const turnosDosDias = DIAS.map(() => '<th scope="col" class="turno">Manhã</th><th scope="col" class="turno">Tarde</th>').join('');

  return `
    <div class="tabela rola">
      <table class="grade">
        <thead>
          <tr><th rowspan="2" scope="col" class="col-preceptor">Preceptor</th>${nomesDosDias}</tr>
          <tr>${turnosDosDias}</tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function linhaDoPreceptor(dados, ui, rodizio, preceptor, problemas) {
  const unidade = porId(dados.unidades, preceptor.unidadeId);
  const celulas = SLOTS.map((slot) => celulaDoTurno(dados, ui, rodizio, preceptor, slot, problemas)).join('');
  return `
    <tr>
      <th scope="row" class="preceptor">
        <b>${escapar(preceptor.nome)}</b><span class="sub">${escapar(unidade.nome)} · ${escapar(preceptor.setor)}</span>
      </th>
      ${celulas}
    </tr>`;
}

function celulaDoTurno(dados, ui, rodizio, preceptor, slot, problemas) {
  const alocacao = alocacaoEm(dados, rodizio.id, preceptor.id, slot);
  const atende = preceptor.horario.includes(slot);
  const fimDoDia = slot.endsWith('-t') ? 'fim-dia' : ''; // linha separando um dia do outro

  if (!atende && !alocacao) {
    return `<td class="nao-atende ${fimDoDia}"><span class="sr">Não atende</span></td>`;
  }

  const classes = ['cel'];
  if (!alocacao) classes.push('livre');
  else if (problemas.choque.has(alocacao.id)) classes.push('conflito');
  else if (problemas.fora.has(alocacao.id)) classes.push('fora');
  const aberto = ui.turnoAberto && ui.turnoAberto.preceptorId === preceptor.id && ui.turnoAberto.slot === slot;
  if (aberto) classes.push('sel');

  const conteudo = alocacao ? alocacao.grupoId : 'livre';
  const rotulo = `${preceptor.nome}, ${rotuloSlot(slot)}: ${alocacao ? `grupo ${alocacao.grupoId}` : 'livre'}`;
  return `
    <td class="${fimDoDia}">
      <button type="button" class="${classes.join(' ')}" data-acao="abrir-turno" data-preceptor="${escapar(preceptor.id)}"
        data-slot="${slot}" aria-label="${escapar(rotulo)}">${escapar(conteudo)}</button>
    </td>`;
}

// Tabela com os grupos da turma e a carga horária de cada um no rodízio.
function secaoGruposDaTurma(dados, rodizio, turma, grupos) {
  const linhas = grupos.map((grupo) => {
    const carga = cargaGrupo(dados, rodizio.id, grupo.id);
    const turnos = alocacoesDoGrupo(dados, rodizio.id, grupo.id).map((a) => a.slot);
    const dias = turnos.length ? escapar(descreverDias(turnos)) : '<span class="txt-erro">Sem turnos</span>';
    const horas = carga.falta ? `<span class="txt-aviso">${carga.total} h de ${carga.meta} h</span>` : `${carga.total} h`;
    return `
      <tr>
        <td><b>${escapar(grupo.id)}</b></td>
        <td class="num">${alunosDoGrupo(dados, grupo.id).length}</td>
        <td>${dias}</td>
        <td class="num">${horas}</td>
      </tr>`;
  }).join('');

  return `
    <section class="secao">
      <h3>Grupos da ${turma ? escapar(turma.nome) : 'turma'}</h3>
      <div class="tabela"><table>
        <thead><tr><th>Grupo</th><th class="num">Alunos</th><th>Dias na semana</th><th class="num">Carga no rodízio</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </section>`;
}

export const acoes = {
  'escolher-modulo'(botao) {
    estado.ui.moduloId = botao.dataset.id;
    estado.ui.turnoAberto = null;
    estado.ui.aviso = null;
  },
  'abrir-turno'(botao) {
    estado.ui.turnoAberto = { preceptorId: botao.dataset.preceptor, slot: botao.dataset.slot };
    estado.ui.aviso = null;
  },
};
