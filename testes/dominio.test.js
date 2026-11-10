// Testes das regras do sistema. Para rodar, na pasta do projeto: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sugerirDivisao, cpfValido, mascararCpf, moverAluno, adicionarAluno, validarRotacao,
  choques, foraDoHorario, alunosSemEscala, cargaGrupo, pendencias, alocacoesDoGrupo,
  preceptoresLivres, trocarPreceptor, alocacaoEm, definirGrupo, gruposParaSlot,
  validarPreceptor, salvarPreceptor, camposFaltando,
  relacaoPreceptor, descreverDias, emitirRelacao, statusRelacao, relacoesDo,
  porId, alunosDoGrupo, grupoNoRodizio, alunosDoGrupoNoRodizio, donoDoCpf, atualizarAssinaturas,
  problemasNosDados,
} from '../js/dominio/index.js';
import { criarDadosExemplo, criarExemploInicial } from '../js/dados-exemplo.js';

const contar = (lista) => lista.reduce((c, n) => ({ ...c, [n]: (c[n] || 0) + 1 }), {});
const doModulo = (d, moduloId) => d.preceptores.filter((p) => p.moduloId === moduloId);

test('divide a turma em grupos de no máximo 4', () => {
  assert.deepEqual(contar(sugerirDivisao(31)), { 4: 7, 3: 1 });
  assert.deepEqual(contar(sugerirDivisao(34)), { 4: 7, 3: 2 });
  assert.deepEqual(sugerirDivisao(0), []);
});

test('os dados de exemplo usam e-mails e telefones que não existem', () => {
  const d = criarDadosExemplo();
  assert.ok(d.preceptores.every((p) => p.email.endsWith('@exemplo.test')));
  assert.ok(d.preceptores.every((p) => p.celular.startsWith('(00) ')));
  assert.ok(d.preceptores.every((p) => !p.fixo || p.fixo.startsWith('(00) ')));
});

test('valida CPF pelos dígitos verificadores', () => {
  const d = criarDadosExemplo();
  assert.ok(d.alunos.every((a) => cpfValido(a.cpf)));
  assert.ok(cpfValido('000.000.001-91'));
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido('000.000.001-92'), false);
  assert.equal(mascararCpf('000.000.001-91'), '***.000.001-**');
});

test('não deixa um grupo passar de 4 alunos', () => {
  const d = criarDadosExemplo();
  const semGrupo = d.alunos.find((a) => !a.grupoId);
  assert.equal(moverAluno(d, semGrupo.id, 'C1').ok, false);
  assert.equal(moverAluno(d, semGrupo.id, 'C9').ok, true);
  assert.equal(adicionarAluno(d, { nome: 'Teste', cpf: '123' }, 'A').ok, false);
});

test('não aceita CPF ou matrícula repetidos no cadastro de aluno', () => {
  const d = criarDadosExemplo();
  const outro = d.alunos[0];
  const novo = { nome: 'Aluno Novo', matricula: '20269999', cpf: '000.000.001-91' };
  assert.equal(adicionarAluno(d, { ...novo, cpf: outro.cpf }, 'A').motivo, 'Já existe um aluno com este CPF.');
  assert.equal(adicionarAluno(d, { ...novo, cpf: outro.cpf.replace(/\D/g, '') }, 'A').motivo, 'Já existe um aluno com este CPF.');
  assert.equal(adicionarAluno(d, { ...novo, cpf: d.preceptores[0].cpf }, 'A').motivo, 'Este CPF já está cadastrado para um preceptor.');
  assert.equal(adicionarAluno(d, { ...novo, matricula: outro.matricula }, 'A').motivo, 'Já existe um aluno com esta matrícula.');
  assert.equal(adicionarAluno(d, novo, 'A').ok, true);
  assert.equal(adicionarAluno(d, { ...novo, matricula: '', cpf: '' }, 'A').ok, true); // vazio não conta como repetido
});

test('a troca de grupo vale do rodízio em andamento em diante', () => {
  const inicial = criarDadosExemplo(); // rodízio em andamento: r3
  const aluno = inicial.alunos.find((a) => a.grupoId === 'A1');
  const antes = JSON.stringify(inicial);
  const d = moverAluno(inicial, aluno.id, 'A8').dados; // A8 tem 3 alunos: há vaga
  assert.equal(JSON.stringify(inicial), antes); // não alterou os dados recebidos
  const movido = porId(d.alunos, aluno.id);
  assert.equal(grupoNoRodizio(movido, 'r1'), 'A1');
  assert.equal(grupoNoRodizio(movido, 'r2'), 'A1');
  assert.equal(grupoNoRodizio(movido, 'r3'), 'A8');
  const nomes = (grupoId, rodizioId) => alunosDoGrupoNoRodizio(d, grupoId, rodizioId).map((a) => a.nome);
  assert.ok(nomes('A1', 'r1').includes(aluno.nome));
  assert.ok(!nomes('A8', 'r1').includes(aluno.nome));
  assert.ok(nomes('A8', 'r3').includes(aluno.nome));
  // Na relação do preceptor que teve o A1 no rodízio 1, o aluno continua lá.
  const preceptorDoA1 = d.alocacoes.find((a) => a.rodizioId === 'r1' && a.grupoId === 'A1').preceptorId;
  const a1NoRodizio1 = relacaoPreceptor(d, preceptorDoA1).grupos.find((g) => g.rodizio === 1 && g.grupo === 'A1');
  assert.ok(a1NoRodizio1.alunos.some((a) => a.nome === aluno.nome));
});

test('trocar duas vezes no mesmo rodízio guarda o grupo de antes da primeira troca', () => {
  let d = criarDadosExemplo();
  const aluno = d.alunos.find((a) => a.grupoId === 'A1');
  d = moverAluno(d, aluno.id, 'A8').dados;
  d = moverAluno(d, aluno.id, '').dados;
  const movido = porId(d.alunos, aluno.id);
  assert.equal(grupoNoRodizio(movido, 'r1'), 'A1');
  assert.equal(grupoNoRodizio(movido, 'r2'), 'A1');
  assert.equal(grupoNoRodizio(movido, 'r3'), null);
});

test('aluno novo colocado num grupo não aparece nos rodízios que já terminaram', () => {
  let d = criarDadosExemplo();
  const novo = d.alunos.find((a) => !a.grupoId); // matrícula nova da Turma C
  d = moverAluno(d, novo.id, 'C9').dados;
  const colocado = porId(d.alunos, novo.id);
  assert.equal(grupoNoRodizio(colocado, 'r1'), null);
  assert.equal(grupoNoRodizio(colocado, 'r2'), null);
  assert.equal(grupoNoRodizio(colocado, 'r3'), 'C9');
  assert.ok(!alunosDoGrupoNoRodizio(d, 'C9', 'r1').some((a) => a.id === novo.id));
});

test('no primeiro rodízio, a troca de grupo não guarda histórico', () => {
  let d = criarDadosExemplo();
  d.rodizioAtual = 'r1';
  const aluno = d.alunos.find((a) => a.grupoId === 'A1');
  d = moverAluno(d, aluno.id, 'A8').dados;
  assert.equal(porId(d.alunos, aluno.id).gruposAnteriores, undefined);
});

test('dados sem histórico: o grupo de cada rodízio é o grupo de hoje', () => {
  const d = criarExemploInicial();
  assert.ok(d.alunos.every((a) => a.gruposAnteriores === undefined));
  for (const rodizio of d.rodizios) {
    for (const grupo of d.grupos) {
      const daEpoca = alunosDoGrupoNoRodizio(d, grupo.id, rodizio.id).map((a) => a.id);
      const deHoje = alunosDoGrupo(d, grupo.id).map((a) => a.id);
      assert.deepEqual(daEpoca, deHoje);
    }
  }
  assert.ok(d.preceptores.every((p) => statusRelacao(d, p.id) !== 'nao_emitida'));
});

test('cada turma passa uma vez por cada módulo', () => {
  const d = criarDadosExemplo();
  assert.deepEqual(validarRotacao(d), []);
  d.rotacao.find((x) => x.rodizioId === 'r2' && x.moduloId === 'go').turmaId = 'A';
  const erros = validarRotacao(d);
  assert.ok(erros.some((e) => e.includes('Turma A passa 2 vezes por Saúde da Mulher')));
  assert.ok(erros.some((e) => e.includes('Turma C não passa por Saúde da Mulher')));
});

test('o rodízio 3 de exemplo traz os problemas esperados', () => {
  const d = criarDadosExemplo();
  const ch = choques(d, 'r3');
  assert.equal(ch.length, 1);
  assert.equal(ch[0].grupoId, 'A2');
  assert.equal(foraDoHorario(d, 'r3').length, 1);
  assert.equal(alunosSemEscala(d, 'r3').length, 1);
  assert.equal(cargaGrupo(d, 'r3', 'C9').total, 120);
  assert.equal(cargaGrupo(d, 'r3', 'A3').falta, 24);
  assert.equal(cargaGrupo(d, 'r3', 'B1').total, 240);
  assert.deepEqual(contar(pendencias(d, 'r3').map((p) => p.nivel)), { erro: 2, aviso: 5 });
});

test('a carga conta cada turno uma vez, mesmo com o grupo em dois preceptores', () => {
  const d = criarDadosExemplo();
  // No exemplo, o A2 está com dois preceptores na qua-m do rodízio 3 (choque): são 10 turnos diferentes.
  assert.equal(cargaGrupo(d, 'r3', 'A2').turnos, 10);
  assert.equal(cargaGrupo(d, 'r3', 'A2').total, 240);
  // Sem a seg-m, sobram 9 turnos de verdade: 216 h, faltam 24 h, e o painel avisa.
  const segM = alocacoesDoGrupo(d, 'r3', 'A2').find((a) => a.slot === 'seg-m');
  const semSegM = definirGrupo(d, { rodizioId: 'r3', preceptorId: segM.preceptorId, slot: 'seg-m' }, '', 'agora').dados;
  assert.equal(cargaGrupo(semSegM, 'r3', 'A2').total, 216);
  assert.equal(cargaGrupo(semSegM, 'r3', 'A2').falta, 24);
  assert.ok(pendencias(semSegM, 'r3').some((p) => p.texto.startsWith('O grupo A2 fecha 216 h')));
});

test('mostra os preceptores livres e passa o grupo para um deles', () => {
  const d = criarDadosExemplo();
  const [regular] = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'));
  const [extraManha, extraTarde] = doModulo(d, 'go').slice(16);
  assert.deepEqual(preceptoresLivres(d, 'r3', 'go', 'ter-m').map((p) => p.id), [extraManha.id]);

  const cel = { rodizioId: 'r3', preceptorId: regular.id, slot: 'ter-m' };
  assert.equal(trocarPreceptor(d, cel, extraTarde.id, 'agora').ok, false);
  const outroRegular = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'))[1];
  assert.equal(trocarPreceptor(d, cel, outroRegular.id, 'agora').ok, false);

  const grupo = alocacaoEm(d, 'r3', regular.id, 'ter-m').grupoId;
  const r = trocarPreceptor(d, cel, extraManha.id, 'agora');
  assert.equal(r.ok, true);
  assert.equal(alocacaoEm(r.dados, 'r3', extraManha.id, 'ter-m').grupoId, grupo);
  assert.equal(alocacaoEm(r.dados, 'r3', regular.id, 'ter-m'), undefined);
  assert.equal(r.dados.trocas[0].tipo, 'preceptor');
});

test('só aceita grupo da turma do módulo e sem outro preceptor no horário', () => {
  let d = criarDadosExemplo();
  const [regular] = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'));
  const extra = doModulo(d, 'go')[16];
  const celExtra = { rodizioId: 'r3', preceptorId: extra.id, slot: 'ter-m' };

  const outraTurma = definirGrupo(d, celExtra, 'A1', 'agora');
  assert.equal(outraTurma.ok, false);
  assert.match(outraTurma.avisos[0].texto, /Turma A está em Clínica Médica/);

  const grupo = alocacaoEm(d, 'r3', regular.id, 'ter-m').grupoId;
  assert.equal(definirGrupo(d, celExtra, grupo, 'agora').ok, false);

  d = definirGrupo(d, { rodizioId: 'r3', preceptorId: regular.id, slot: 'ter-m' }, null, 'agora').dados;
  const r = definirGrupo(d, celExtra, grupo, 'agora');
  assert.equal(r.ok, true);
  assert.equal(r.dados.trocas.length, 2);
  assert.ok(gruposParaSlot(d, 'r3', regular.id, 'ter-m').every((o) => o.grupo.turmaId === 'B'));
});

test('quando recusa um grupo, definirGrupo explica o motivo', () => {
  const d = criarDadosExemplo();
  const [regular] = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'));
  const outroDoMesmoHorario = doModulo(d, 'go').filter((p) => p.horario.includes('ter-m'))[1];
  const grupoDoOutro = alocacaoEm(d, 'r3', outroDoMesmoHorario.id, 'ter-m').grupoId;
  // O A1 tem dois motivos: a Turma A está em outro módulo, e o A1 já está com um preceptor de Clínica Médica na ter-m.
  const doisMotivos = definirGrupo(d, { rodizioId: 'r3', preceptorId: regular.id, slot: 'ter-m' }, 'A1', 'agora');
  assert.equal(doisMotivos.ok, false);
  assert.match(doisMotivos.motivo, /^A Turma A está em Clínica Médica neste rodízio\. Já está com .+ neste horário\.$/);
  // Grupo da turma certa, mas já com outro preceptor no horário.
  const ocupado = definirGrupo(d, { rodizioId: 'r3', preceptorId: regular.id, slot: 'ter-m' }, grupoDoOutro, 'agora');
  assert.equal(ocupado.motivo, `Já está com ${outroDoMesmoHorario.nome} neste horário.`);
});

test('valida o cadastro do preceptor', () => {
  const d = criarDadosExemplo();
  const p1 = d.preceptores[0];
  const base = { ...p1, id: undefined, cpf: '000.000.001-91', crm: '999999' };

  assert.ok(validarPreceptor(d, { ...base, cpf: '123' }).cpf);
  assert.equal(validarPreceptor(d, { ...base, cpf: p1.cpf }).cpf, 'Já existe um preceptor com este CPF.');
  assert.ok(validarPreceptor(d, { ...base, crm: '' }).crm);
  assert.ok(validarPreceptor(d, { ...base, setor: 'Enfermaria' }).setor);
  assert.ok(validarPreceptor(d, { ...base, horario: [] }).horario);
  assert.ok(validarPreceptor(d, { ...p1, moduloId: 'cm' }).moduloId);

  const novo = salvarPreceptor(d, base);
  assert.equal(novo.ok, true);
  assert.equal(novo.dados.preceptores.length, d.preceptores.length + 1);

  const editado = salvarPreceptor(d, { ...p1, horario: p1.horario.filter((s) => s !== 'seg-m') });
  assert.equal(editado.ok, true);
  assert.match(editado.alerta, /ficaram fora do novo horário/);
  assert.deepEqual(camposFaltando(doModulo(d, 'go')[3]), ['CRM']);
});

test('não aceita CRM repetido nem CPF de aluno no cadastro de preceptor', () => {
  const d = criarDadosExemplo();
  const [p1, p2] = d.preceptores;
  const base = { ...p1, id: undefined, cpf: '000.000.001-91', crm: '999999' };
  assert.equal(validarPreceptor(d, { ...base, crm: p2.crm }).crm, 'Já existe um preceptor com este CRM.');
  assert.equal(validarPreceptor(d, { ...base, cpf: d.alunos[0].cpf }).cpf, 'Este CPF já está cadastrado para um aluno.');
  assert.deepEqual(validarPreceptor(d, p1), {}); // editar sem mudar CPF e CRM continua valendo
  assert.equal(donoDoCpf(d, ''), null);
});

test('monta a relação de alunos por grupo do preceptor no semestre', () => {
  const d = criarDadosExemplo();
  const p = doModulo(d, 'go')[0];
  const rel = relacaoPreceptor(d, p.id);
  assert.equal(rel.inicio, '2026-08-03');
  assert.equal(rel.fim, '2026-12-04');
  assert.equal(rel.semanas, 18);
  assert.equal(rel.cargaTotal, 5 * 4 * 6 * 3);
  assert.deepEqual([...new Set(rel.grupos.map((g) => g.rodizio))], [1, 2, 3]);
  assert.ok(rel.grupos.every((g) => g.dias && g.alunos.every((a) => a.matricula && a.cpf)));
  assert.equal(descreverDias(['ter-m', 'sex-m', 'qui-t', 'sex-t']), 'Terça e sexta: matutino; Quinta e sexta: vespertino');
  assert.equal(descreverDias(['seg-m', 'ter-m', 'qua-m']), 'Segunda, terça e quarta: matutino');
});

test('a relação fica desatualizada quando a escala muda', () => {
  let d = criarDadosExemplo();
  const p = doModulo(d, 'go')[0];
  const extra = doModulo(d, 'go')[16];
  d = emitirRelacao(d, p.id, 'ontem').dados;
  assert.equal(statusRelacao(d, p.id), 'em_dia');
  d = trocarPreceptor(d, { rodizioId: 'r3', preceptorId: p.id, slot: 'qua-m' }, extra.id, 'hoje').dados;
  assert.equal(statusRelacao(d, p.id), 'desatualizada');
  d = emitirRelacao(d, p.id, 'hoje').dados;
  assert.equal(statusRelacao(d, p.id), 'em_dia');
  assert.equal(relacoesDo(d, p.id).at(-1).versao, 2);
});

test('a relação emitida guarda só um resumo, sem dados pessoais', () => {
  let d = criarDadosExemplo();
  const p = doModulo(d, 'go')[1];
  d = emitirRelacao(d, p.id, 'agora').dados;
  const { assinatura } = relacoesDo(d, p.id).at(-1);
  assert.ok(assinatura.length <= 11);
  const alunos = relacaoPreceptor(d, p.id).grupos.flatMap((g) => g.alunos);
  assert.ok(alunos.every((a) => !assinatura.includes(a.nome) && !assinatura.includes(a.cpf)));
  assert.equal(statusRelacao(d, p.id), 'em_dia');
});

test('assinatura antiga, com o texto da relação, vira resumo sem mudar a situação', () => {
  let d = criarDadosExemplo();
  const p = doModulo(d, 'go')[1];
  d = emitirRelacao(d, p.id, 'ontem').dados;
  d.relacoes.at(-1).assinatura = JSON.stringify(relacaoPreceptor(d, p.id)); // como era guardado antes
  assert.equal(statusRelacao(d, p.id), 'desatualizada'); // sem converter, o código novo não reconhece
  const antes = JSON.stringify(d);
  const r = atualizarAssinaturas(d);
  assert.equal(JSON.stringify(d), antes); // não alterou os dados recebidos
  assert.equal(r.alteradas, 1);
  assert.equal(statusRelacao(r.dados, p.id), 'em_dia');
  assert.ok(r.dados.relacoes.at(-1).assinatura.length <= 11);
  assert.equal(atualizarAssinaturas(r.dados).alteradas, 0); // na segunda vez, nada muda
});

test('confere se os dados salvos têm o formato esperado', () => {
  assert.deepEqual(problemasNosDados(criarExemploInicial()), []);
  assert.ok(problemasNosDados(null).length);
  assert.ok(problemasNosDados([]).length);
  assert.ok(problemasNosDados({ a: 1 }).length);
  const semAlocacoes = { ...criarDadosExemplo(), alocacoes: undefined };
  assert.ok(problemasNosDados(semAlocacoes).some((p) => p.includes('alocacoes')));
  assert.ok(problemasNosDados({ ...criarDadosExemplo(), modulos: [] }).some((p) => p.includes('modulos')));
  assert.ok(problemasNosDados({ ...criarDadosExemplo(), rodizioAtual: 'r9' }).some((p) => p.includes('rodizioAtual')));
});

test('o exemplo da tela já abre com as relações emitidas e uma troca depois', () => {
  const d = criarExemploInicial();
  const situacoes = contar(d.preceptores.map((p) => statusRelacao(d, p.id)));
  assert.equal(situacoes.nao_emitida, undefined);
  assert.ok(situacoes.desatualizada >= 1);
  assert.equal(d.trocas.length, 1);
});
