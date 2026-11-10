// Dados fictícios do protótipo, no formato do modelo da coordenação:
// Internato de Medicina, 9º período, semestre com 3 rodízios de 6 semanas.
// As turmas A, B e C passam pelos 3 módulos, uma por rodízio. Cada preceptor tem um horário fixo
// de preceptoria (dias e turnos), e em cada rodízio os grupos da turma ocupam esses turnos.
//
// Nomes, CPFs, CRMs e contatos são inventados. De propósito, o exemplo já vem com alguns problemas
// para o painel mostrar: choque de horário, horário alterado, grupo abaixo da carga,
// aluno sem grupo e cadastro incompleto.
import { DIAS, SLOTS, completarCpf, statusRelacao, emitirRelacao, trocarPreceptor } from './dominio/index.js';
import { semAcento } from './util.js';

// O curso que aparece no topo da página ("Medicina · Internato") vem daqui.
const CURSO = {
  curso: 'Medicina',
};

export function criarDadosExemplo() {
  const rodizios = [
    { id: 'r1', ordem: 1, inicio: '2026-08-03', fim: '2026-09-11', semanas: 6 },
    { id: 'r2', ordem: 2, inicio: '2026-09-14', fim: '2026-10-23', semanas: 6 },
    { id: 'r3', ordem: 3, inicio: '2026-10-26', fim: '2026-12-04', semanas: 6 },
  ];

  const horarios = { m: '07:00–11:00', t: '13:00–17:00' };
  const modulos = [
    { id: 'go', nome: 'Saúde da Mulher (GO)', horasTurno: 4, metaHoras: 240, horarios, especialidade: 'Ginecologia e Obstetrícia' },
    { id: 'ab1', nome: 'Atenção Básica 1', horasTurno: 4, metaHoras: 220, horarios, especialidade: 'Medicina de Família e Comunidade' },
    { id: 'cm', nome: 'Clínica Médica', horasTurno: 4, metaHoras: 240, horarios, especialidade: 'Clínica Médica' },
  ];

  const unidades = [
    { id: 'u1', nome: 'Maternidade Estadual', municipio: 'São Luís', esfera: 'Estadual', setores: ['Centro obstétrico', 'Alojamento conjunto', 'Ambulatório de pré-natal'] },
    { id: 'u2', nome: 'UBS Centro', municipio: 'São José de Ribamar', esfera: 'Municipal', setores: ['Consultórios', 'Acolhimento'] },
    { id: 'u3', nome: 'UBS Maiobão', municipio: 'Paço do Lumiar', esfera: 'Municipal', setores: ['Consultórios', 'Acolhimento'] },
    { id: 'u4', nome: 'Hospital Estadual', municipio: 'São Luís', esfera: 'Estadual', setores: ['Enfermaria', 'Ambulatório', 'Pronto atendimento'] },
    { id: 'u5', nome: 'Hospital Municipal', municipio: 'Paço do Lumiar', esfera: 'Municipal', setores: ['Enfermaria', 'Ambulatório'] },
  ];

  const turmas = [
    { id: 'A', nome: 'Turma A' },
    { id: 'B', nome: 'Turma B' },
    { id: 'C', nome: 'Turma C' },
  ];
  const { grupos, alunos } = criarGruposEAlunos();

  // Cada turma passa uma vez por cada módulo no semestre.
  const rotacao = [
    { rodizioId: 'r1', moduloId: 'go', turmaId: 'A' },
    { rodizioId: 'r1', moduloId: 'ab1', turmaId: 'B' },
    { rodizioId: 'r1', moduloId: 'cm', turmaId: 'C' },
    { rodizioId: 'r2', moduloId: 'go', turmaId: 'C' },
    { rodizioId: 'r2', moduloId: 'ab1', turmaId: 'A' },
    { rodizioId: 'r2', moduloId: 'cm', turmaId: 'B' },
    { rodizioId: 'r3', moduloId: 'go', turmaId: 'B' },
    { rodizioId: 'r3', moduloId: 'ab1', turmaId: 'C' },
    { rodizioId: 'r3', moduloId: 'cm', turmaId: 'A' },
  ];

  const preceptores = criarPreceptores(modulos, unidades);
  const alocacoes = criarEscalas(rotacao, preceptores, grupos);
  colocarProblemasDeProposito(preceptores, alocacoes);

  return {
    ...CURSO,
    rodizioAtual: 'r3',
    rodizios,
    modulos,
    unidades,
    turmas,
    grupos,
    alunos,
    rotacao,
    preceptores,
    alocacoes,
    trocas: [],
    relacoes: [],
  };
}

// O exemplo que a tela mostra ao abrir: as relações de alunos já emitidas e uma troca feita depois,
// para aparecer uma relação desatualizada.
export function criarExemploInicial() {
  let dados = criarDadosExemplo();
  dados.preceptores.forEach((preceptor) => {
    if (statusRelacao(dados, preceptor.id) === 'nao_emitida') {
      dados = emitirRelacao(dados, preceptor.id, '2026-10-22T10:00').dados;
    }
  });
  const daGo = dados.preceptores.filter((p) => p.moduloId === 'go');
  const turno = { rodizioId: 'r3', preceptorId: daGo[0].id, slot: 'qua-m' };
  return trocarPreceptor(dados, turno, daGo[16].id, '2026-10-27T14:30').dados;
}

// Grupos e alunos

function criarGruposEAlunos() {
  const grupos = [];
  const alunos = [];

  const novoAluno = (turmaId, grupoId) => {
    const i = alunos.length;
    alunos.push({
      id: `al${i + 1}`,
      nome: nomeDeAluno(i),
      matricula: `2022${1001 + i}`,
      cpf: cpfFicticio(200001 + i),
      turmaId,
      grupoId,
    });
  };

  // Cada número da lista é o tamanho de um grupo.
  const montarTurma = (turmaId, tamanhos) => {
    tamanhos.forEach((tamanho, i) => {
      const id = `${turmaId}${i + 1}`;
      grupos.push({ id, turmaId, numero: i + 1 });
      for (let k = 0; k < tamanho; k++) novoAluno(turmaId, id);
    });
  };

  montarTurma('A', [4, 4, 4, 4, 4, 4, 4, 3]); // 31 alunos em 8 grupos
  montarTurma('B', [4, 4, 4, 4, 4, 4, 3, 3]); // 30 alunos em 8 grupos
  montarTurma('C', [4, 4, 4, 4, 4, 4, 3, 3, 3]); // 33 alunos em 9 grupos
  novoAluno('C', null); // matrícula nova, ainda sem grupo

  return { grupos, alunos };
}

// Preceptores

// Por módulo: 16 preceptores com 5 turnos, alternando manhã e tarde (assim sobram 8 livres em cada turno),
// e 2 com horário reduzido, que cobrem o 9º grupo da Turma C.
function criarPreceptores(modulos, unidades) {
  const unidadesDoModulo = { go: ['u1'], ab1: ['u2', 'u3'], cm: ['u4', 'u5'] };
  const horariosReduzidos = [['ter-m', 'qua-m', 'qui-m'], ['seg-t', 'qua-t']];
  const preceptores = [];

  modulos.forEach((modulo) => {
    for (let k = 0; k < 18; k++) {
      const n = preceptores.length;
      const horario = k < 16
        ? DIAS.map((dia, i) => `${dia.id}-${(k + i) % 2 === 0 ? 'm' : 't'}`)
        : [...horariosReduzidos[k - 16]];
      const opcoesDeUnidade = unidadesDoModulo[modulo.id];
      const unidade = unidades.find((u) => u.id === opcoesDeUnidade[k % opcoesDeUnidade.length]);
      const nome = nomeDePreceptor(n);
      const partesDoNome = nome.split(' ');

      preceptores.push({
        id: `p${n + 1}`,
        nome,
        cpf: cpfFicticio(100001 + n),
        crm: String(4100 + n * 37),
        graduacao: 'Medicina',
        especialidade: modulo.especialidade,
        matricula: `D${10200 + n}`,
        // Contatos que não existem, para nenhuma mensagem de teste chegar a uma pessoa de verdade:
        // o final ".test" é reservado para testes, e não existe DDD 00 no Brasil.
        email: `${semAcento(partesDoNome[0])}.${semAcento(partesDoNome.at(-1))}@exemplo.test`,
        celular: `(00) 98800-${String(1000 + n * 13).slice(-4)}`,
        fixo: '',
        endereco: `Rua Exemplo, ${100 + n}`,
        bairro: 'Centro',
        cep: '65000-000',
        cidade: 'São Luís',
        uf: 'MA',
        ses: vinculoComSes(n, unidade),
        moduloId: modulo.id,
        unidadeId: unidade.id,
        setor: unidade.setores[k % unidade.setores.length],
        horario,
      });
    }
  });
  return preceptores;
}

// Um em cada três preceptores também trabalha numa unidade da SES.
function vinculoComSes(n, unidade) {
  if (n % 3 !== 0) return { trabalha: false, unidade: '', dias: '', horario: '' };
  return {
    trabalha: true,
    unidade: unidade.esfera === 'Estadual' ? unidade.nome : 'Hospital Estadual',
    dias: 'Segunda a sexta',
    horario: '07:00–13:00',
  };
}

// Escalas

// Distribui os grupos nos turnos dos preceptores, rodízio por rodízio.
function criarEscalas(rotacao, preceptores, grupos) {
  const alocacoes = [];
  const alocar = (rodizioId, preceptorId, slot, grupoId) =>
    alocacoes.push({ id: `x${alocacoes.length + 1}`, rodizioId, preceptorId, slot, grupoId });

  rotacao.forEach(({ rodizioId, moduloId, turmaId }) => {
    const doModulo = preceptores.filter((p) => p.moduloId === moduloId);
    const regulares = doModulo.slice(0, 16);
    const deHorarioReduzido = doModulo.slice(16);
    const daTurma = grupos.filter((g) => g.turmaId === turmaId);

    // Os 8 primeiros grupos ficam com os preceptores regulares, girando a cada dia da semana.
    SLOTS.forEach((slot, posicao) => {
      const dia = Math.floor(posicao / 2);
      const livres = regulares.filter((p) => p.horario.includes(slot));
      daTurma.slice(0, 8).forEach((grupo, g) => alocar(rodizioId, livres[(g + dia) % livres.length].id, slot, grupo.id));
    });

    // O 9º grupo (só a Turma C tem) fica com os preceptores de horário reduzido.
    if (daTurma.length > 8) {
      deHorarioReduzido.forEach((p) => p.horario.forEach((slot) => alocar(rodizioId, p.id, slot, daTurma[8].id)));
    }
  });
  return alocacoes;
}

// Problemas de propósito no rodízio 3, para o painel ter o que mostrar.
function colocarProblemasDeProposito(preceptores, alocacoes) {
  // 1. Clínica Médica (Turma A): o A2 foi colocado também na quarta de manhã que era do A3 (choque).
  const turnoDoA3 = alocacoes.find((a) => a.rodizioId === 'r3' && a.grupoId === 'A3' && a.slot === 'qua-m');
  turnoDoA3.grupoId = 'A2';

  // 2. Um preceptor de GO deixou de atender sexta de manhã, mas a escala ainda tem grupo nesse turno.
  const daGo = preceptores.filter((p) => p.moduloId === 'go');
  daGo[0].horario = daGo[0].horario.filter((slot) => slot !== 'sex-m');

  // 3. Cadastros incompletos.
  daGo[3].crm = '';
  preceptores.filter((p) => p.moduloId === 'cm')[5].cpf = '';
}

// Nomes e CPFs fictícios

const PRIMEIROS_NOMES = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
  'Karina', 'Lucas', 'Mariana', 'Nícolas', 'Olívia', 'Pedro', 'Rafaela', 'Samuel', 'Tatiane', 'Vinícius', 'Yasmin',
  'André', 'Beatriz', 'Caio', 'Débora', 'Enzo', 'Fernanda', 'Gustavo', 'Helena', 'Igor', 'Júlia'];
const SOBRENOMES = ['Almeida', 'Barros', 'Costa', 'Diniz', 'Ferreira', 'Gomes', 'Lima', 'Martins', 'Nogueira', 'Oliveira',
  'Pereira', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira', 'Moraes', 'Carvalho', 'Sousa', 'Rocha', 'Mendes'];
const PRIMEIROS_NOMES_PRECEPTORES = ['Cláudia', 'Marcos', 'Simone', 'Raimundo', 'Luciana', 'Jorge', 'Patrícia', 'Fernando',
  'Renata', 'Alexandre', 'Márcia', 'Ricardo', 'Vanessa', 'Sérgio', 'Juliana', 'Otávio', 'Carla', 'Paulo'];
const SOBRENOMES_PRECEPTORES = ['Serra', 'Lobato', 'Furtado', 'Belo', 'Araújo', 'Viana', 'Melo', 'Castelo', 'Ramos', 'Sá',
  'Coelho', 'Pinto', 'Duarte', 'Brandão', 'Lago', 'Campos', 'Frota', 'Neves'];

// Combina as listas de um jeito fixo, para o exemplo sair sempre igual.
const nomeDeAluno = (i) => [
  PRIMEIROS_NOMES[i % PRIMEIROS_NOMES.length],
  SOBRENOMES[(i * 7 + 3) % SOBRENOMES.length],
  SOBRENOMES[(i * 3 + 11) % SOBRENOMES.length],
].join(' ');

const nomeDePreceptor = (i) => [
  PRIMEIROS_NOMES_PRECEPTORES[i % PRIMEIROS_NOMES_PRECEPTORES.length],
  SOBRENOMES_PRECEPTORES[(i * 5 + Math.floor(i / PRIMEIROS_NOMES_PRECEPTORES.length)) % SOBRENOMES_PRECEPTORES.length],
].join(' ');

// CPF inventado, mas com dígitos verificadores válidos. Sempre começa com 000.
const cpfFicticio = (numero) => completarCpf(String(numero).padStart(9, '0'));
