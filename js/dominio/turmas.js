// Turmas, grupos e alunos. Os grupos têm até 4 alunos e ficam fixos no semestre.
// Se um aluno troca de grupo, a troca vale do rodízio em andamento em diante (veja moverAluno).
import { porId, copiar, novoId } from './comum.js';
import { cpfValido, formatarCpf, donoDoCpf } from './cpf.js';

export const MAX_ALUNOS_GRUPO = 4;

export const alunosDoGrupo = (dados, grupoId) => dados.alunos.filter((aluno) => aluno.grupoId === grupoId);

export const gruposDaTurma = (dados, turmaId) =>
  dados.grupos.filter((grupo) => grupo.turmaId === turmaId).sort((a, b) => a.numero - b.numero);

export const turmaDoGrupo = (dados, grupoId) => porId(dados.grupos, grupoId).turmaId;

// Grupo em que o aluno estava num rodízio. Nos rodízios que terminaram antes de uma troca de grupo,
// vale o que ficou guardado em aluno.gruposAnteriores; nos outros, o grupo de hoje.
export function grupoNoRodizio(aluno, rodizioId) {
  if (aluno.gruposAnteriores && Object.hasOwn(aluno.gruposAnteriores, rodizioId)) {
    return aluno.gruposAnteriores[rodizioId];
  }
  return aluno.grupoId ?? null;
}

export const alunosDoGrupoNoRodizio = (dados, grupoId, rodizioId) =>
  dados.alunos.filter((aluno) => grupoNoRodizio(aluno, rodizioId) === grupoId);

// Divide a turma no menor número de grupos, com tamanhos o mais parecidos possível.
// 31 alunos → [4, 4, 4, 4, 4, 4, 4, 3]
export function sugerirDivisao(totalAlunos, maximo = MAX_ALUNOS_GRUPO) {
  if (totalAlunos <= 0) return [];
  const quantidade = Math.ceil(totalAlunos / maximo);
  const tamanho = Math.floor(totalAlunos / quantidade);
  const sobra = totalAlunos % quantidade;
  return Array.from({ length: quantidade }, (_, i) => tamanho + (i < sobra ? 1 : 0));
}

export function podeEntrarNoGrupo(dados, grupoId) {
  if (alunosDoGrupo(dados, grupoId).length >= MAX_ALUNOS_GRUPO) {
    return { ok: false, motivo: `O grupo ${grupoId} já tem ${MAX_ALUNOS_GRUPO} alunos.` };
  }
  return { ok: true };
}

// Muda o aluno de grupo. Com grupoId vazio, o aluno fica sem grupo.
// A troca vale do rodízio em andamento (dados.rodizioAtual) em diante: nos rodízios que já terminaram,
// o grupo antigo fica guardado em aluno.gruposAnteriores, para a relação de alunos daquela época não mudar.
export function moverAluno(dados, alunoId, grupoId) {
  const aluno = porId(dados.alunos, alunoId);
  const vaiParaOutroGrupo = grupoId && aluno.grupoId !== grupoId;
  if (vaiParaOutroGrupo) {
    const vaga = podeEntrarNoGrupo(dados, grupoId);
    if (!vaga.ok) return { ok: false, dados, motivo: vaga.motivo };
  }
  const novosDados = copiar(dados);
  const movido = porId(novosDados.alunos, alunoId);
  const novoGrupo = grupoId || null;
  if (movido.grupoId !== novoGrupo) guardarGruposAnteriores(novosDados, movido);
  movido.grupoId = novoGrupo;
  return { ok: true, dados: novosDados };
}

// Guarda o grupo de hoje em cada rodízio que já terminou e ainda não tem grupo guardado.
// Altera só o aluno da cópia que moverAluno acabou de fazer.
function guardarGruposAnteriores(dados, aluno) {
  const atual = porId(dados.rodizios, dados.rodizioAtual);
  const terminados = dados.rodizios.filter((rodizio) => rodizio.ordem < atual.ordem);
  if (!terminados.length) return;
  aluno.gruposAnteriores = aluno.gruposAnteriores || {};
  terminados.forEach((rodizio) => {
    if (!Object.hasOwn(aluno.gruposAnteriores, rodizio.id)) aluno.gruposAnteriores[rodizio.id] = aluno.grupoId ?? null;
  });
}

// Cadastra o aluno na turma, ainda sem grupo.
export function adicionarAluno(dados, { nome, matricula, cpf }, turmaId) {
  const nomeLimpo = String(nome || '').trim().replace(/\s+/g, ' ');
  if (!nomeLimpo) return { ok: false, dados, motivo: 'Digite o nome completo do aluno.' };
  if (cpf && !cpfValido(cpf)) return { ok: false, dados, motivo: 'O CPF digitado não é válido.' };
  const dono = donoDoCpf(dados, cpf);
  if (dono === 'aluno') return { ok: false, dados, motivo: 'Já existe um aluno com este CPF.' };
  if (dono === 'preceptor') return { ok: false, dados, motivo: 'Este CPF já está cadastrado para um preceptor.' };
  const matriculaLimpa = String(matricula || '').trim();
  if (matriculaLimpa && dados.alunos.some((a) => a.matricula === matriculaLimpa)) {
    return { ok: false, dados, motivo: 'Já existe um aluno com esta matrícula.' };
  }

  const novosDados = copiar(dados);
  novosDados.alunos.push({
    id: novoId(novosDados.alunos, 'al'),
    nome: nomeLimpo,
    matricula: matriculaLimpa,
    cpf: cpf ? formatarCpf(cpf) : '',
    turmaId,
    grupoId: null,
  });
  return { ok: true, dados: novosDados };
}

// Cria o próximo grupo da turma (A9, A10...), vazio.
export function criarGrupo(dados, turmaId) {
  const novosDados = copiar(dados);
  const ultimoNumero = novosDados.grupos
    .filter((grupo) => grupo.turmaId === turmaId)
    .reduce((maior, grupo) => Math.max(maior, grupo.numero), 0);
  const numero = ultimoNumero + 1;
  const id = `${turmaId}${numero}`;
  novosDados.grupos.push({ id, turmaId, numero });
  return { ok: true, dados: novosDados, grupoId: id };
}
