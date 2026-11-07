/* Dados de exemplo do protótipo, na estrutura do modelo da coordenação:
   Internato de Medicina, 9º período, semestre com 3 rodízios de 6 semanas.
   As turmas A, B e C passam pelos 3 módulos, uma por rodízio. Cada preceptor tem um horário fixo
   de preceptoria (dias e turnos), e em cada rodízio os grupos da turma ocupam esses turnos.
   Nomes, CPFs, CRMs e contatos são fictícios. A semente inclui de propósito alguns problemas
   (choque, horário alterado, grupo abaixo da carga, aluno sem grupo, cadastro incompleto). */
(function (raiz) {
  'use strict';

  const SLOTS = ['seg-m', 'seg-t', 'ter-m', 'ter-t', 'qua-m', 'qua-t', 'qui-m', 'qui-t', 'sex-m', 'sex-t'];
  const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex'];

  const PRIMEIROS = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João',
    'Karina', 'Lucas', 'Mariana', 'Nícolas', 'Olívia', 'Pedro', 'Rafaela', 'Samuel', 'Tatiane', 'Vinícius', 'Yasmin',
    'André', 'Beatriz', 'Caio', 'Débora', 'Enzo', 'Fernanda', 'Gustavo', 'Helena', 'Igor', 'Júlia'];
  const SOBRENOMES = ['Almeida', 'Barros', 'Costa', 'Diniz', 'Ferreira', 'Gomes', 'Lima', 'Martins', 'Nogueira', 'Oliveira',
    'Pereira', 'Ribeiro', 'Santos', 'Teixeira', 'Vieira', 'Moraes', 'Carvalho', 'Sousa', 'Rocha', 'Mendes'];
  const PRIMEIROS_P = ['Cláudia', 'Marcos', 'Simone', 'Raimundo', 'Luciana', 'Jorge', 'Patrícia', 'Fernando', 'Renata',
    'Alexandre', 'Márcia', 'Ricardo', 'Vanessa', 'Sérgio', 'Juliana', 'Otávio', 'Carla', 'Paulo'];
  const SOBRENOMES_P = ['Serra', 'Lobato', 'Furtado', 'Belo', 'Araújo', 'Viana', 'Melo', 'Castelo', 'Ramos', 'Sá',
    'Coelho', 'Pinto', 'Duarte', 'Brandão', 'Lago', 'Campos', 'Frota', 'Neves'];

  // CPF fictício com dígitos verificadores válidos, sempre começando por 000.
  function cpfFicticio(n) {
    const base = String(n).padStart(9, '0').split('').map(Number);
    const dv = (arr) => {
      const soma = arr.reduce((s, d, i) => s + d * (arr.length + 1 - i), 0);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    const d1 = dv(base);
    const t = [...base, d1, dv([...base, d1])].join('');
    return `${t.slice(0, 3)}.${t.slice(3, 6)}.${t.slice(6, 9)}-${t.slice(9)}`;
  }

  const nomeAluno = (i) =>
    `${PRIMEIROS[i % PRIMEIROS.length]} ${SOBRENOMES[(i * 7 + 3) % SOBRENOMES.length]} ${SOBRENOMES[(i * 3 + 11) % SOBRENOMES.length]}`;
  const nomePreceptor = (i) =>
    `${PRIMEIROS_P[i % PRIMEIROS_P.length]} ${SOBRENOMES_P[(i * 5 + Math.floor(i / PRIMEIROS_P.length)) % SOBRENOMES_P.length]}`;
  const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function criarDadosExemplo() {
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
    const unidadesDoModulo = { go: ['u1'], ab1: ['u2', 'u3'], cm: ['u4', 'u5'] };

    const turmas = [{ id: 'A', nome: 'Turma A' }, { id: 'B', nome: 'Turma B' }, { id: 'C', nome: 'Turma C' }];
    const grupos = [];
    const alunos = [];
    const novoAluno = (turmaId, grupoId) => {
      const i = alunos.length;
      alunos.push({ id: `al${i + 1}`, nome: nomeAluno(i), matricula: `2022${String(1001 + i)}`, cpf: cpfFicticio(200001 + i), turmaId, grupoId });
    };
    function montarTurma(turmaId, tamanhos) {
      tamanhos.forEach((tamanho, i) => {
        const id = `${turmaId}${i + 1}`;
        grupos.push({ id, turmaId, numero: i + 1 });
        for (let k = 0; k < tamanho; k++) novoAluno(turmaId, id);
      });
    }
    montarTurma('A', [4, 4, 4, 4, 4, 4, 4, 3]); // 31 alunos, 8 grupos
    montarTurma('B', [4, 4, 4, 4, 4, 4, 3, 3]); // 30 alunos, 8 grupos
    montarTurma('C', [4, 4, 4, 4, 4, 4, 3, 3, 3]); // 33 alunos, 9 grupos
    novoAluno('C', null); // matrícula nova, ainda sem grupo

    // Cada turma passa uma vez por cada módulo no semestre.
    const rotacao = [
      { rodizioId: 'r1', moduloId: 'go', turmaId: 'A' }, { rodizioId: 'r1', moduloId: 'ab1', turmaId: 'B' }, { rodizioId: 'r1', moduloId: 'cm', turmaId: 'C' },
      { rodizioId: 'r2', moduloId: 'go', turmaId: 'C' }, { rodizioId: 'r2', moduloId: 'ab1', turmaId: 'A' }, { rodizioId: 'r2', moduloId: 'cm', turmaId: 'B' },
      { rodizioId: 'r3', moduloId: 'go', turmaId: 'B' }, { rodizioId: 'r3', moduloId: 'ab1', turmaId: 'C' }, { rodizioId: 'r3', moduloId: 'cm', turmaId: 'A' },
    ];

    // Por módulo: 16 preceptores com 5 turnos alternando manhã e tarde (8 livres em cada turno)
    // e 2 com horário reduzido, que cobrem o 9º grupo da Turma C.
    const preceptores = [];
    let n = 0;
    modulos.forEach((m) => {
      const extras = [['ter-m', 'qua-m', 'qui-m'], ['seg-t', 'qua-t']];
      for (let k = 0; k < 18; k++) {
        const horario = k < 16 ? DIAS.map((d, di) => `${d}-${(k + di) % 2 === 0 ? 'm' : 't'}`) : extras[k - 16];
        const unidadeId = unidadesDoModulo[m.id][k % unidadesDoModulo[m.id].length];
        const unidade = unidades.find((u) => u.id === unidadeId);
        const nome = nomePreceptor(n);
        const [primeiro, ultimo] = [nome.split(' ')[0], nome.split(' ').slice(-1)[0]];
        preceptores.push({
          id: `p${n + 1}`,
          nome,
          cpf: cpfFicticio(100001 + n),
          crm: String(4100 + n * 37),
          graduacao: 'Medicina',
          especialidade: m.especialidade,
          matricula: `D${10200 + n}`,
          email: `${semAcento(primeiro)}.${semAcento(ultimo)}@exemplo.com`,
          celular: `(98) 98800-${String(1000 + n * 13).slice(-4)}`,
          fixo: '',
          endereco: `Rua Exemplo, ${100 + n}`,
          bairro: 'Centro',
          cep: '65000-000',
          cidade: 'São Luís',
          uf: 'MA',
          ses: n % 3 === 0 ? { trabalha: true, unidade: unidade.esfera === 'Estadual' ? unidade.nome : 'Hospital Estadual', dias: 'Segunda a sexta', horario: '07:00–13:00' } : { trabalha: false, unidade: '', dias: '', horario: '' },
          moduloId: m.id,
          unidadeId,
          setor: unidade.setores[k % unidade.setores.length],
          horario,
        });
        n++;
      }
    });

    const alocacoes = [];
    const alocar = (rodizioId, preceptorId, slot, grupoId) =>
      alocacoes.push({ id: `x${alocacoes.length + 1}`, rodizioId, preceptorId, slot, grupoId });

    rotacao.forEach(({ rodizioId, moduloId, turmaId }) => {
      const doModulo = preceptores.filter((p) => p.moduloId === moduloId);
      const regulares = doModulo.slice(0, 16);
      const gs = grupos.filter((g) => g.turmaId === turmaId);
      SLOTS.forEach((slot, s) => {
        const dia = Math.floor(s / 2);
        const livres = regulares.filter((p) => p.horario.includes(slot));
        gs.slice(0, 8).forEach((g, gi) => alocar(rodizioId, livres[(gi + dia) % livres.length].id, slot, g.id));
      });
      if (gs.length > 8) doModulo.slice(16).forEach((p) => p.horario.forEach((slot) => alocar(rodizioId, p.id, slot, gs[8].id)));
    });

    // Problemas de propósito no rodízio 3:
    // 1. Clínica Médica (Turma A): o A2 foi colocado também na quarta de manhã que era do A3 (choque).
    const doA3 = alocacoes.find((a) => a.rodizioId === 'r3' && a.grupoId === 'A3' && a.slot === 'qua-m');
    doA3.grupoId = 'A2';
    // 2. Um preceptor de GO deixou de atender sexta de manhã, mas a escala ainda tem grupo nesse turno.
    const goPrimeiro = preceptores.find((p) => p.moduloId === 'go');
    goPrimeiro.horario = goPrimeiro.horario.filter((s) => s !== 'sex-m');
    // 3. Cadastros incompletos.
    preceptores.filter((p) => p.moduloId === 'go')[3].crm = '';
    preceptores.filter((p) => p.moduloId === 'cm')[5].cpf = '';

    return {
      curso: 'Medicina',
      periodoCurso: '9º período',
      semestre: '2026.2',
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

  if (typeof module === 'object' && module.exports) module.exports = { criarDadosExemplo };
  else raiz.criarDadosExemplo = criarDadosExemplo;
})(typeof window !== 'undefined' ? window : globalThis);
