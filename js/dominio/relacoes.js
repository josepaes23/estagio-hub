// Relação de alunos por grupo: um documento por preceptor, com os grupos dele no semestre inteiro.
// Cada emissão guarda uma "assinatura": um resumo curto do conteúdo da relação, sem os dados pessoais
// (veja resumo() em comum.js). Se a escala muda depois, a assinatura deixa de bater e a relação
// aparece como desatualizada.
import { porId, porNome, copiar, resumo } from './comum.js';
import { TURNOS, descreverDias } from './calendario.js';
import { alunosDoGrupoNoRodizio } from './turmas.js';

export function relacaoPreceptor(dados, preceptorId) {
  const preceptor = porId(dados.preceptores, preceptorId);
  const modulo = porId(dados.modulos, preceptor.moduloId);
  const unidade = porId(dados.unidades, preceptor.unidadeId);
  const grupos = dados.rodizios.flatMap((rodizio) => gruposNoRodizio(dados, preceptor, modulo, rodizio));
  const rodiziosComGrupo = dados.rodizios.filter((r) => grupos.some((g) => g.rodizio === r.ordem));
  const horas = grupos.map((g) => g.horas);

  // Atenção: não mude a ordem destes campos. A assinatura das relações já emitidas é o resumo deste
  // objeto em texto, e mudar a ordem faria todas as relações salvas aparecerem como desatualizadas.
  return {
    preceptor: preceptor.nome,
    crm: preceptor.crm,
    modulo: modulo.nome,
    unidade: unidade.nome,
    municipio: unidade.municipio,
    setor: preceptor.setor,
    curso: dados.curso,
    periodo: dados.periodoCurso,
    semestre: dados.semestre,
    inicio: rodiziosComGrupo.length ? rodiziosComGrupo[0].inicio : null,
    fim: rodiziosComGrupo.length ? rodiziosComGrupo.at(-1).fim : null,
    grupos,
    totalGrupos: grupos.length,
    totalAlunos: grupos.reduce((total, g) => total + g.alunos.length, 0),
    dias: descreverDias(preceptor.horario),
    horarios: descreverHorarios(preceptor.horario, modulo),
    cargaIndividual: horas.length ? { min: Math.min(...horas), max: Math.max(...horas) } : null,
    cargaTotal: horas.reduce((total, h) => total + h, 0),
    semanas: rodiziosComGrupo.reduce((total, r) => total + r.semanas, 0),
  };
}

// Os grupos que o preceptor tem num rodízio, cada um com seus dias, horas e alunos.
// Os alunos são os que estavam no grupo naquele rodízio (uma troca de grupo não muda rodízios que já terminaram).
function gruposNoRodizio(dados, preceptor, modulo, rodizio) {
  const alocacoes = dados.alocacoes.filter((a) => a.rodizioId === rodizio.id && a.preceptorId === preceptor.id);
  const idsDosGrupos = [...new Set(alocacoes.map((a) => a.grupoId))];

  return idsDosGrupos
    .map((id) => porId(dados.grupos, id))
    .sort((a, b) => a.numero - b.numero)
    .map((grupo) => {
      const turnos = alocacoes.filter((a) => a.grupoId === grupo.id).map((a) => a.slot);
      return {
        grupo: grupo.id,
        rodizio: rodizio.ordem,
        inicio: rodizio.inicio,
        fim: rodizio.fim,
        dias: descreverDias(turnos),
        horas: turnos.length * modulo.horasTurno * rodizio.semanas,
        alunos: alunosDoGrupoNoRodizio(dados, grupo.id, rodizio.id)
          .sort(porNome)
          .map((aluno) => ({ nome: aluno.nome, matricula: aluno.matricula, cpf: aluno.cpf })),
      };
    });
}

// "Matutino: 07:00–11:00; Vespertino: 13:00–17:00"
function descreverHorarios(horario, modulo) {
  return TURNOS
    .filter((turno) => horario.some((slot) => slot.endsWith(`-${turno.id}`)))
    .map((turno) => `${turno.nome}: ${modulo.horarios[turno.id]}`)
    .join('; ');
}

const assinatura = (dados, preceptorId) => resumo(JSON.stringify(relacaoPreceptor(dados, preceptorId)));

// Versões já emitidas da relação do preceptor, da mais antiga para a mais nova.
export const relacoesDo = (dados, preceptorId) => dados.relacoes.filter((r) => r.preceptorId === preceptorId);

// 'sem_grupos', 'nao_emitida', 'em_dia' ou 'desatualizada'.
export function statusRelacao(dados, preceptorId) {
  const emitidas = relacoesDo(dados, preceptorId);
  if (!emitidas.length) {
    const temGrupos = dados.alocacoes.some((a) => a.preceptorId === preceptorId);
    return temGrupos ? 'nao_emitida' : 'sem_grupos';
  }
  return emitidas.at(-1).assinatura === assinatura(dados, preceptorId) ? 'em_dia' : 'desatualizada';
}

// Converte as assinaturas do formato antigo (o texto inteiro da relação, com nomes e CPFs) em resumo.
// A situação de cada relação não muda: o resumo do texto antigo é igual ao resumo da relação, se ela não mudou.
export function atualizarAssinaturas(dados) {
  const antigas = dados.relacoes.filter((r) => String(r.assinatura).startsWith('{')).length;
  if (!antigas) return { ok: true, dados, alteradas: 0 };
  const novosDados = copiar(dados);
  novosDados.relacoes.forEach((r) => {
    if (String(r.assinatura).startsWith('{')) r.assinatura = resumo(r.assinatura);
  });
  return { ok: true, dados: novosDados, alteradas: antigas };
}

export function emitirRelacao(dados, preceptorId, quando) {
  const novosDados = copiar(dados);
  novosDados.relacoes.push({
    preceptorId,
    versao: relacoesDo(dados, preceptorId).length + 1,
    quando,
    assinatura: assinatura(dados, preceptorId),
  });
  return { ok: true, dados: novosDados };
}
