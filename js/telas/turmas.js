// Cadastros > Turmas e grupos: quem está em cada grupo, alunos sem grupo e cadastro de aluno novo.
import { estado, aplicar } from '../estado.js';
import {
  MAX_ALUNOS_GRUPO, porId, porNome, alunosDoGrupo, gruposDaTurma, sugerirDivisao, moduloDaTurma,
  moverAluno, adicionarAluno, criarGrupo,
} from '../dominio/index.js';
import { seletor } from '../componentes.js';
import { escapar, plural } from '../util.js';

export function telaTurmas() {
  const { dados, ui } = estado;
  const turma = porId(dados.turmas, ui.turmaId);
  const alunos = dados.alunos.filter((aluno) => aluno.turmaId === turma.id);
  const grupos = gruposDaTurma(dados, turma.id);
  const semGrupo = alunos.filter((aluno) => !aluno.grupoId);
  const cartoes = grupos.map((grupo) => cartaoDoGrupo(dados, grupo, grupos)).join('');

  return `
    ${secaoResumo(dados, ui, turma, alunos, grupos)}
    ${semGrupo.length ? secaoAlunosSemGrupo(dados, semGrupo, grupos) : ''}
    <section class="secao"><div class="grupos">${cartoes}</div></section>
    ${formularioDeAluno(turma)}`;
}

function secaoResumo(dados, ui, turma, alunos, grupos) {
  const rodizio = porId(dados.rodizios, ui.rodizioId);
  const moduloAtual = porId(dados.modulos, moduloDaTurma(dados, ui.rodizioId, turma.id));
  const sugestao = sugerirDivisao(alunos.length);
  const faltamGrupos = sugestao.length - grupos.length;
  const seletorDeTurma = seletor({
    acao: 'escolher-turma',
    rotulo: 'Turma',
    marcado: turma.id,
    opcoes: dados.turmas.map((t) => ({ id: t.id, texto: escapar(t.nome) })),
  });
  const criarQueFalta = faltamGrupos > 0
    ? `Falta criar ${plural(faltamGrupos, 'grupo', 'grupos')}. <button type="button" class="link" data-acao="criar-grupo">Criar grupo</button>`
    : '';

  return `
    <section class="secao">
      ${seletorDeTurma}
      <div>
        <h2>${escapar(turma.nome)}</h2>
        <p class="mudo">
          ${alunos.length} alunos · ${grupos.length} grupos · no máximo ${MAX_ALUNOS_GRUPO} alunos por grupo, fixos no semestre
          ${moduloAtual ? ` · no rodízio ${rodizio.ordem}: ${escapar(moduloAtual.nome)}` : ''}
        </p>
      </div>
      <p class="sugestao">
        Para ${alunos.length} alunos, o ideal são ${sugestao.length} grupos (${descreverDivisao(sugestao)}).
        ${criarQueFalta}
      </p>
    </section>`;
}

function secaoAlunosSemGrupo(dados, semGrupo, grupos) {
  return `
    <section class="secao destaque">
      <h3>Alunos sem grupo</h3>
      <p class="mudo">Ficam sem escala até entrar num grupo. Grupos cheios aparecem bloqueados na lista.</p>
      <ul class="membros">${semGrupo.map((aluno) => linhaDoAluno(dados, aluno, grupos)).join('')}</ul>
    </section>`;
}

function cartaoDoGrupo(dados, grupo, grupos) {
  const membros = alunosDoGrupo(dados, grupo.id).sort(porNome);
  const linhas = membros.map((aluno) => linhaDoAluno(dados, aluno, grupos)).join('');
  return `
    <article class="grupo">
      <header><h4>Grupo ${escapar(grupo.id)}</h4><span class="mudo">${membros.length} de ${MAX_ALUNOS_GRUPO}</span></header>
      <ul class="membros">${linhas || '<li class="mudo">Grupo vazio</li>'}</ul>
    </article>`;
}

function linhaDoAluno(dados, aluno, grupos) {
  return `
    <li>
      <span class="aluno">
        <span>${escapar(aluno.nome)}</span><span class="sub">Matrícula ${escapar(aluno.matricula || '—')}</span>
      </span>
      ${escolhaDeGrupo(dados, aluno, grupos)}
    </li>`;
}

// Lista para mudar o aluno de grupo. Grupos cheios aparecem bloqueados.
function escolhaDeGrupo(dados, aluno, grupos) {
  const opcoes = grupos.map((grupo) => {
    const ocupados = alunosDoGrupo(dados, grupo.id).length;
    const ehOGrupoDele = aluno.grupoId === grupo.id;
    const cheio = ocupados >= MAX_ALUNOS_GRUPO && !ehOGrupoDele;
    const id = escapar(grupo.id);
    const texto = cheio ? `${id} (cheio)` : `${id} (${ocupados}/${MAX_ALUNOS_GRUPO})`;
    return `<option value="${id}" ${ehOGrupoDele ? 'selected' : ''} ${cheio ? 'disabled' : ''}>${texto}</option>`;
  }).join('');

  return `
    <select data-mudar="mover-aluno" data-aluno="${escapar(aluno.id)}" aria-label="Grupo de ${escapar(aluno.nome)}">
      <option value="">Sem grupo</option>
      ${opcoes}
    </select>`;
}

function formularioDeAluno(turma) {
  return `
    <section class="secao">
      <h3>Cadastrar aluno na ${escapar(turma.nome)}</h3>
      <form class="form-aluno" data-form="cadastrar-aluno">
        <div class="campo"><label for="novo-nome">Nome completo</label><input id="novo-nome" name="nome" autocomplete="off"></div>
        <div class="campo"><label for="novo-matricula">Matrícula</label><input id="novo-matricula" name="matricula" autocomplete="off"></div>
        <div class="campo"><label for="novo-cpf">CPF</label><input id="novo-cpf" name="cpf" inputmode="numeric" autocomplete="off"></div>
        <button type="submit" class="btn">Adicionar</button>
      </form>
    </section>`;
}

// [4, 4, 4, 3] → "3 de 4 e 1 de 3"
function descreverDivisao(tamanhos) {
  const quantos = {};
  tamanhos.forEach((tamanho) => { quantos[tamanho] = (quantos[tamanho] || 0) + 1; });
  return Object.keys(quantos)
    .sort((a, b) => b - a)
    .map((tamanho) => `${quantos[tamanho]} de ${tamanho}`)
    .join(' e ');
}

export const acoes = {
  'escolher-turma'(botao) {
    estado.ui.turmaId = botao.dataset.id;
    estado.ui.aviso = null;
  },
  'mover-aluno'(lista) {
    const aluno = porId(estado.dados.alunos, lista.dataset.aluno);
    const grupoId = lista.value;
    const mensagem = grupoId ? `${aluno.nome} agora está no grupo ${grupoId}.` : `${aluno.nome} ficou sem grupo.`;
    aplicar(moverAluno(estado.dados, aluno.id, grupoId), mensagem);
  },
  'criar-grupo'() {
    const resultado = criarGrupo(estado.dados, estado.ui.turmaId);
    aplicar(resultado, `Grupo ${resultado.grupoId} criado. Mova alunos para ele pela lista de cada aluno.`);
  },
  'cadastrar-aluno'(form) {
    const valores = new FormData(form);
    const nome = String(valores.get('nome') || '').trim();
    const aluno = { nome, matricula: valores.get('matricula'), cpf: valores.get('cpf') };
    aplicar(adicionarAluno(estado.dados, aluno, estado.ui.turmaId), `${nome} cadastrado(a). Escolha o grupo em "Alunos sem grupo".`);
  },
};
