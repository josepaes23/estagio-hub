// Rodar com: node --test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('./dominio.js');
const { criarDadosExemplo } = require('./dados.js');

const contar = (lista) => lista.reduce((c, n) => ({ ...c, [n]: (c[n] || 0) + 1 }), {});
const doModulo = (d, moduloId) => d.preceptores.filter((p) => p.moduloId === moduloId);

test('divide a turma em grupos de no máximo 4', () => {
  assert.deepEqual(contar(R.sugerirDivisao(31)), { 4: 7, 3: 1 });
  assert.deepEqual(contar(R.sugerirDivisao(34)), { 4: 7, 3: 2 });
  assert.deepEqual(R.sugerirDivisao(0), []);
});

test('valida CPF pelos dígitos verificadores', () => {
  const d = criarDadosExemplo();
  assert.ok(d.alunos.every((a) => R.cpfValido(a.cpf)));
  assert.ok(R.cpfValido('000.000.001-91'));
  assert.equal(R.cpfValido('111.111.111-11'), false);
  assert.equal(R.cpfValido('000.000.001-92'), false);
  assert.equal(R.mascararCpf('000.000.001-91'), '***.000.001-**');
});

test('não deixa um grupo passar de 4 alunos', () => {
  const d = criarDadosExemplo();
  const semGrupo = d.alunos.find((a) => !a.grupoId);
  assert.equal(R.moverAluno(d, semGrupo.id, 'C1').ok, false);
  assert.equal(R.moverAluno(d, semGrupo.id, 'C9').ok, true);
  assert.equal(R.adicionarAluno(d, { nome: 'Teste', cpf: '123' }, 'A').ok, false);
});

test('cada turma passa uma vez por cada módulo', () => {
  const d = criarDadosExemplo();
  assert.deepEqual(R.validarRotacao(d), []);
  d.rotacao.find((x) => x.rodizioId === 'r2' && x.moduloId === 'go').turmaId = 'A';
  const erros = R.validarRotacao(d);
  assert.ok(erros.some((e) => e.includes('Turma A passa 2 vezes por Saúde da Mulher')));
  assert.ok(erros.some((e) => e.includes('Turma C não passa por Saúde da Mulher')));
});

test('o rodízio 3 de exemplo traz os problemas esperados', () => {
  const d = criarDadosExemplo();
  const ch = R.choques(d, 'r3');
  assert.equal(ch.length, 1);
  assert.equal(ch[0].grupoId, 'A2');
  assert.equal(R.foraDoHorario(d, 'r3').length, 1);
  assert.equal(R.alunosSemEscala(d, 'r3').length, 1);
  assert.equal(R.cargaGrupo(d, 'r3', 'C9').total, 120);
  assert.equal(R.cargaGrupo(d, 'r3', 'A3').falta, 24);
  assert.equal(R.cargaGrupo(d, 'r3', 'B1').total, 240);
  assert.deepEqual(contar(R.pendencias(d, 'r3').map((p) => p.nivel)), { erro: 2, aviso: 5 });
});

test('mostra os preceptores livres e passa o grupo para um deles', () => {
  const d = criarDadosExemplo();
  const [regular] = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'));
  const [extraManha, extraTarde] = doModulo(d, 'go').slice(16);
  assert.deepEqual(R.preceptoresLivres(d, 'r3', 'go', 'ter-m').map((p) => p.id), [extraManha.id]);

  const cel = { rodizioId: 'r3', preceptorId: regular.id, slot: 'ter-m' };
  assert.equal(R.trocarPreceptor(d, cel, extraTarde.id, 'agora').ok, false);
  const outroRegular = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'))[1];
  assert.equal(R.trocarPreceptor(d, cel, outroRegular.id, 'agora').ok, false);

  const grupo = R.alocacaoEm(d, 'r3', regular.id, 'ter-m').grupoId;
  const r = R.trocarPreceptor(d, cel, extraManha.id, 'agora');
  assert.equal(r.ok, true);
  assert.equal(R.alocacaoEm(r.dados, 'r3', extraManha.id, 'ter-m').grupoId, grupo);
  assert.equal(R.alocacaoEm(r.dados, 'r3', regular.id, 'ter-m'), undefined);
  assert.equal(r.dados.trocas[0].tipo, 'preceptor');
});

test('só aceita grupo da turma do módulo e sem outro preceptor no horário', () => {
  let d = criarDadosExemplo();
  const [regular] = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'));
  const extra = doModulo(d, 'go')[16];
  const celExtra = { rodizioId: 'r3', preceptorId: extra.id, slot: 'ter-m' };

  const outraTurma = R.definirGrupo(d, celExtra, 'A1', 'agora');
  assert.equal(outraTurma.ok, false);
  assert.match(outraTurma.avisos[0].texto, /Turma A está em Clínica Médica/);

  const grupo = R.alocacaoEm(d, 'r3', regular.id, 'ter-m').grupoId;
  assert.equal(R.definirGrupo(d, celExtra, grupo, 'agora').ok, false);

  d = R.definirGrupo(d, { rodizioId: 'r3', preceptorId: regular.id, slot: 'ter-m' }, null, 'agora').dados;
  const r = R.definirGrupo(d, celExtra, grupo, 'agora');
  assert.equal(r.ok, true);
  assert.equal(r.dados.trocas.length, 2);
  assert.ok(R.gruposParaSlot(d, 'r3', regular.id, 'ter-m').every((o) => o.grupo.turmaId === 'B'));
});

test('valida o cadastro do preceptor', () => {
  const d = criarDadosExemplo();
  const p1 = d.preceptores[0];
  const base = { ...p1, id: undefined, cpf: '000.000.001-91' };

  assert.ok(R.validarPreceptor(d, { ...base, cpf: '123' }).cpf);
  assert.equal(R.validarPreceptor(d, { ...base, cpf: p1.cpf }).cpf, 'Já existe um preceptor com este CPF.');
  assert.ok(R.validarPreceptor(d, { ...base, crm: '' }).crm);
  assert.ok(R.validarPreceptor(d, { ...base, setor: 'Enfermaria' }).setor);
  assert.ok(R.validarPreceptor(d, { ...base, horario: [] }).horario);
  assert.ok(R.validarPreceptor(d, { ...p1, moduloId: 'cm' }).moduloId);

  const novo = R.salvarPreceptor(d, base);
  assert.equal(novo.ok, true);
  assert.equal(novo.dados.preceptores.length, d.preceptores.length + 1);

  const editado = R.salvarPreceptor(d, { ...p1, horario: p1.horario.filter((s) => s !== 'seg-m') });
  assert.equal(editado.ok, true);
  assert.match(editado.alerta, /ficaram fora do novo horário/);
  assert.deepEqual(R.camposFaltando(doModulo(d, 'go')[3]), ['CRM']);
});

test('monta a relação de alunos por grupo do preceptor no semestre', () => {
  const d = criarDadosExemplo();
  const p = doModulo(d, 'go')[0];
  const rel = R.relacaoPreceptor(d, p.id);
  assert.equal(rel.inicio, '2026-08-03');
  assert.equal(rel.fim, '2026-12-04');
  assert.equal(rel.semanas, 18);
  assert.equal(rel.cargaTotal, 5 * 4 * 6 * 3);
  assert.deepEqual([...new Set(rel.grupos.map((g) => g.rodizio))], [1, 2, 3]);
  assert.ok(rel.grupos.every((g) => g.dias && g.alunos.every((a) => a.matricula && a.cpf)));
  assert.equal(R.descreverDias(['ter-m', 'sex-m', 'qui-t', 'sex-t']), 'Terça e sexta: matutino; Quinta e sexta: vespertino');
  assert.equal(R.descreverDias(['seg-m', 'ter-m', 'qua-m']), 'Segunda, terça e quarta: matutino');
});

test('a relação fica desatualizada quando a escala muda', () => {
  let d = criarDadosExemplo();
  const p = doModulo(d, 'go')[0];
  const extra = doModulo(d, 'go')[16];
  d = R.emitirRelacao(d, p.id, 'ontem').dados;
  assert.equal(R.statusRelacao(d, p.id), 'em_dia');
  d = R.trocarPreceptor(d, { rodizioId: 'r3', preceptorId: p.id, slot: 'qua-m' }, extra.id, 'hoje').dados;
  assert.equal(R.statusRelacao(d, p.id), 'desatualizada');
  d = R.emitirRelacao(d, p.id, 'hoje').dados;
  assert.equal(R.statusRelacao(d, p.id), 'em_dia');
  assert.equal(R.relacoesDo(d, p.id).at(-1).versao, 2);
});
