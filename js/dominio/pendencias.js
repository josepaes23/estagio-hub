// Problemas do rodízio, para a lista "Precisa de atenção" do painel.
// Cada pendência tem um nivel, um texto e um alvo, que diz para onde o botão "Abrir" leva.
// 'erro' é um problema que precisa ser resolvido (choque de horário, aluno sem escala, rotação errada);
// 'aviso' pede revisão.
import { porId } from './comum.js';
import { rotuloSlot } from './calendario.js';
import { gruposDaTurma } from './turmas.js';
import { turmaNoModulo, validarRotacao } from './rotacao.js';
import { camposFaltando } from './preceptores.js';
import { alocacoesDoGrupo, cargaGrupo } from './escalas.js';
import { statusRelacao } from './relacoes.js';

// Grupos que estão com dois preceptores no mesmo turno.
export function choques(dados, rodizioId) {
  const porTurno = new Map();
  dados.alocacoes
    .filter((a) => a.rodizioId === rodizioId)
    .forEach((a) => {
      const chave = `${a.grupoId}|${a.slot}`;
      if (!porTurno.has(chave)) porTurno.set(chave, []);
      porTurno.get(chave).push(a);
    });

  return [...porTurno.values()]
    .filter((alocacoes) => alocacoes.length > 1)
    .map((alocacoes) => ({ grupoId: alocacoes[0].grupoId, slot: alocacoes[0].slot, alocacoes }));
}

// Turnos com grupo que saíram do horário do preceptor (ele mudou o horário depois da escala pronta).
export const foraDoHorario = (dados, rodizioId) =>
  dados.alocacoes.filter((a) => a.rodizioId === rodizioId && !porId(dados.preceptores, a.preceptorId).horario.includes(a.slot));

// Preceptores sem nenhum grupo no rodízio.
export const preceptoresOciosos = (dados, rodizioId) =>
  dados.preceptores.filter((p) => !dados.alocacoes.some((a) => a.rodizioId === rodizioId && a.preceptorId === p.id));

// Alunos sem grupo, ou cujo grupo não tem nenhum turno no rodízio.
export const alunosSemEscala = (dados, rodizioId) =>
  dados.alunos.filter((a) => !a.grupoId || !alocacoesDoGrupo(dados, rodizioId, a.grupoId).length);

export function pendencias(dados, rodizioId) {
  const nomeDe = (preceptorId) => porId(dados.preceptores, preceptorId).nome;
  const turnoNaEscala = (preceptorId, slot) => ({
    aba: 'escalas',
    rodizioId,
    moduloId: porId(dados.preceptores, preceptorId).moduloId,
    preceptorId,
    slot,
  });
  const lista = [];

  validarRotacao(dados).forEach((texto) => {
    lista.push({ nivel: 'erro', texto, alvo: { aba: 'cadastros', sub: 'periodo' } });
  });

  choques(dados, rodizioId).forEach((choque) => {
    const nomes = choque.alocacoes.map((a) => nomeDe(a.preceptorId)).join(' e ');
    lista.push({
      nivel: 'erro',
      texto: `O grupo ${choque.grupoId} está com ${nomes} ao mesmo tempo (${rotuloSlot(choque.slot)}).`,
      alvo: turnoNaEscala(choque.alocacoes.at(-1).preceptorId, choque.slot),
    });
  });

  const semEscala = alunosSemEscala(dados, rodizioId);
  if (semEscala.length) {
    const quantos = semEscala.length === 1 ? '1 aluno está' : `${semEscala.length} alunos estão`;
    lista.push({
      nivel: 'erro',
      texto: `${quantos} sem escala: ${semEscala.map((a) => a.nome).join(', ')}.`,
      alvo: { aba: 'cadastros', sub: 'turmas', turmaId: semEscala[0].turmaId },
    });
  }

  foraDoHorario(dados, rodizioId).forEach((a) => {
    lista.push({
      nivel: 'aviso',
      texto: `${nomeDe(a.preceptorId)} tem o grupo ${a.grupoId} num turno que saiu do horário de preceptoria (${rotuloSlot(a.slot)}).`,
      alvo: turnoNaEscala(a.preceptorId, a.slot),
    });
  });

  dados.modulos.forEach((modulo) => {
    const turmaId = turmaNoModulo(dados, rodizioId, modulo.id);
    if (!turmaId) return;
    gruposDaTurma(dados, turmaId).forEach((grupo) => {
      const carga = cargaGrupo(dados, rodizioId, grupo.id);
      if (carga.falta <= 0) return;
      lista.push({
        nivel: 'aviso',
        texto: `O grupo ${grupo.id} fecha ${carga.total} h de ${carga.meta} h em ${modulo.nome} (faltam ${carga.falta} h).`,
        alvo: { aba: 'escalas', rodizioId, moduloId: modulo.id },
      });
    });
  });

  dados.preceptores.forEach((preceptor) => {
    const faltam = camposFaltando(preceptor);
    if (faltam.length) {
      lista.push({
        nivel: 'aviso',
        texto: `Cadastro de ${preceptor.nome} incompleto: falta ${faltam.join(', ')}.`,
        alvo: { aba: 'cadastros', sub: 'preceptores', ficha: preceptor.id },
      });
    }
    if (statusRelacao(dados, preceptor.id) === 'desatualizada') {
      lista.push({
        nivel: 'aviso',
        texto: `A relação de alunos de ${preceptor.nome} mudou depois da última emissão.`,
        alvo: { aba: 'relacoes', preceptorId: preceptor.id },
      });
    }
  });

  return lista;
}
