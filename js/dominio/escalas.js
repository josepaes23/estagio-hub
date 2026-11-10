// Escalas: em cada rodízio, cada turno do horário de um preceptor recebe no máximo um grupo.
// Cada "alocação" guarda isso: { id, rodizioId, preceptorId, slot, grupoId }.
import { porId, copiar, novoId } from './comum.js';
import { moduloDaTurma, turmaNoModulo } from './rotacao.js';
import { alunosDoGrupo, gruposDaTurma, turmaDoGrupo } from './turmas.js';
import { preceptoresDoModulo } from './preceptores.js';

export const alocacaoEm = (dados, rodizioId, preceptorId, slot) =>
  dados.alocacoes.find((a) => a.rodizioId === rodizioId && a.preceptorId === preceptorId && a.slot === slot);

export const alocacoesDoGrupo = (dados, rodizioId, grupoId) =>
  dados.alocacoes.filter((a) => a.rodizioId === rodizioId && a.grupoId === grupoId);

// Preceptores do módulo que atendem neste turno e ainda estão sem grupo nele.
export const preceptoresLivres = (dados, rodizioId, moduloId, slot) =>
  preceptoresDoModulo(dados, moduloId).filter((p) => p.horario.includes(slot) && !alocacaoEm(dados, rodizioId, p.id, slot));

// Número da escala no semestre: no rodízio 1 ficam as escalas 1, 2 e 3; no rodízio 2, as 4, 5 e 6...
export function numeroEscala(dados, rodizioId, moduloId) {
  const rodizio = porId(dados.rodizios, rodizioId);
  const posicaoDoModulo = dados.modulos.findIndex((m) => m.id === moduloId);
  return (rodizio.ordem - 1) * dados.modulos.length + posicaoDoModulo + 1;
}

// Confere se o grupo pode ocupar o turno do preceptor. Devolve uma lista de avisos:
// nivel 'bloqueia' não deixa colocar; nivel 'alerta' deixa, mas avisa.
// ignorarAlocacaoId é a alocação que está sendo trocada, para ela não contar como conflito consigo mesma.
export function avaliarGrupo(dados, rodizioId, preceptorId, slot, grupoId, ignorarAlocacaoId) {
  const preceptor = porId(dados.preceptores, preceptorId);
  const turmaId = turmaDoGrupo(dados, grupoId);
  const avisos = [];

  if (turmaId !== turmaNoModulo(dados, rodizioId, preceptor.moduloId)) {
    const turma = porId(dados.turmas, turmaId);
    const outroModulo = porId(dados.modulos, moduloDaTurma(dados, rodizioId, turmaId));
    avisos.push({
      nivel: 'bloqueia',
      texto: `A ${turma.nome} está em ${outroModulo ? outroModulo.nome : 'outro módulo'} neste rodízio.`,
    });
  }

  const ocupado = dados.alocacoes.find((a) =>
    a.rodizioId === rodizioId && a.grupoId === grupoId && a.slot === slot && a.id !== ignorarAlocacaoId);
  if (ocupado) {
    const outroPreceptor = porId(dados.preceptores, ocupado.preceptorId);
    avisos.push({ nivel: 'bloqueia', texto: `Já está com ${outroPreceptor.nome} neste horário.` });
  }

  if (!preceptor.horario.includes(slot)) {
    avisos.push({ nivel: 'alerta', texto: 'Fora do horário de preceptoria cadastrado.' });
  }
  return avisos;
}

// Grupos da turma que podem ocupar o turno, em ordem de sugestão:
// primeiro os sem conflito e, entre eles, os que mais precisam de horas.
export function gruposParaSlot(dados, rodizioId, preceptorId, slot) {
  const preceptor = porId(dados.preceptores, preceptorId);
  const atual = alocacaoEm(dados, rodizioId, preceptorId, slot);
  const turmaId = turmaNoModulo(dados, rodizioId, preceptor.moduloId);

  return gruposDaTurma(dados, turmaId)
    .map((grupo) => {
      const avisos = avaliarGrupo(dados, rodizioId, preceptorId, slot, grupo.id, atual?.id);
      return {
        grupo,
        avisos,
        bloqueado: avisos.some((a) => a.nivel === 'bloqueia'),
        carga: cargaGrupo(dados, rodizioId, grupo.id),
      };
    })
    .sort((a, b) => (a.bloqueado - b.bloqueado) || (b.carga.falta - a.carga.falta) || (a.grupo.numero - b.grupo.numero));
}

// Coloca, troca ou retira o grupo de um turno do preceptor. Com grupoId vazio, o turno fica livre.
// "quando" é a data e hora da mudança, que vai para o histórico (dados.trocas).
export function definirGrupo(dados, { rodizioId, preceptorId, slot }, grupoId, quando) {
  const atual = alocacaoEm(dados, rodizioId, preceptorId, slot);
  const de = atual ? atual.grupoId : null;
  const para = grupoId || null;
  if (de === para) return { ok: true, dados, avisos: [] };

  const avisos = para ? avaliarGrupo(dados, rodizioId, preceptorId, slot, para, atual?.id) : [];
  const bloqueios = avisos.filter((a) => a.nivel === 'bloqueia');
  if (bloqueios.length) return { ok: false, dados, avisos, motivo: bloqueios.map((a) => a.texto).join(' ') };

  const novosDados = copiar(dados);
  if (!para) {
    novosDados.alocacoes = novosDados.alocacoes.filter((a) => a.id !== atual.id);
  } else if (atual) {
    porId(novosDados.alocacoes, atual.id).grupoId = para;
  } else {
    novosDados.alocacoes.push({ id: novoId(novosDados.alocacoes, 'x'), rodizioId, preceptorId, slot, grupoId: para });
  }
  novosDados.trocas.push({ quando, rodizioId, slot, tipo: 'grupo', preceptorId, de, para });
  return { ok: true, dados: novosDados, avisos };
}

// Passa o grupo de um turno para outro preceptor do mesmo módulo que esteja livre no mesmo horário.
export function trocarPreceptor(dados, { rodizioId, preceptorId, slot }, novoPreceptorId, quando) {
  const atual = alocacaoEm(dados, rodizioId, preceptorId, slot);
  if (!atual) return { ok: false, dados, motivo: 'Este turno não tem grupo.' };

  const novo = porId(dados.preceptores, novoPreceptorId);
  const antigo = porId(dados.preceptores, preceptorId);
  if (novo.moduloId !== antigo.moduloId) return { ok: false, dados, motivo: `${novo.nome} é de outro módulo.` };
  if (!novo.horario.includes(slot)) return { ok: false, dados, motivo: `${novo.nome} não atende neste horário.` };
  if (alocacaoEm(dados, rodizioId, novoPreceptorId, slot)) return { ok: false, dados, motivo: `${novo.nome} já tem grupo neste horário.` };

  const novosDados = copiar(dados);
  porId(novosDados.alocacoes, atual.id).preceptorId = novoPreceptorId;
  novosDados.trocas.push({ quando, rodizioId, slot, tipo: 'preceptor', grupoId: atual.grupoId, de: preceptorId, para: novoPreceptorId });
  return { ok: true, dados: novosDados };
}

// Carga horária do grupo no rodízio: turnos na semana × horas do turno × semanas do rodízio.
// Cada turno conta uma vez: se o grupo está com dois preceptores no mesmo horário (choque),
// ele não ganha horas a mais por isso.
export function cargaGrupo(dados, rodizioId, grupoId) {
  const modulo = porId(dados.modulos, moduloDaTurma(dados, rodizioId, turmaDoGrupo(dados, grupoId)));
  const rodizio = porId(dados.rodizios, rodizioId);
  const turnos = new Set(alocacoesDoGrupo(dados, rodizioId, grupoId).map((a) => a.slot)).size;
  if (!modulo) return { turnos, horasSemana: 0, total: 0, meta: 0, falta: 0 };

  const horasSemana = turnos * modulo.horasTurno;
  const total = horasSemana * rodizio.semanas;
  return { turnos, horasSemana, total, meta: modulo.metaHoras, falta: Math.max(0, modulo.metaHoras - total) };
}

// Resumo de cada escala do rodízio, para a tabela do painel.
export function resumoEscalas(dados, rodizioId) {
  return dados.modulos.map((modulo) => {
    const turmaId = turmaNoModulo(dados, rodizioId, modulo.id);
    const grupos = turmaId ? gruposDaTurma(dados, turmaId) : [];
    const preceptores = preceptoresDoModulo(dados, modulo.id);
    const alocacoes = dados.alocacoes.filter((a) =>
      a.rodizioId === rodizioId && preceptores.some((p) => p.id === a.preceptorId));

    return {
      modulo,
      numero: numeroEscala(dados, rodizioId, modulo.id),
      turma: turmaId && porId(dados.turmas, turmaId),
      grupos: grupos.length,
      alunos: grupos.reduce((total, g) => total + alunosDoGrupo(dados, g.id).length, 0),
      preceptoresComGrupo: new Set(alocacoes.map((a) => a.preceptorId)).size,
      turnosOcupados: alocacoes.length,
      turnosOferecidos: preceptores.reduce((total, p) => total + p.horario.length, 0),
      abaixo: grupos.filter((g) => cargaGrupo(dados, rodizioId, g.id).falta > 0).length,
    };
  });
}
