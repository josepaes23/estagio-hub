/* Regras do sistema como funções puras sobre o objeto de dados.
   Nenhuma função altera os dados recebidos: as que mudam algo devolvem { ok, dados, ... } com uma cópia nova.
   Estrutura: semestre → 3 rodízios; cada turma faz um módulo por rodízio; cada preceptor tem um horário fixo
   de preceptoria, e cada turno desse horário recebe no máximo um grupo por rodízio.
   Funcionam no navegador (window.Dominio) e no Node (require), para os testes. */
(function (raiz) {
  'use strict';

  const DIAS = [['seg', 'Segunda', 'Seg'], ['ter', 'Terça', 'Ter'], ['qua', 'Quarta', 'Qua'], ['qui', 'Quinta', 'Qui'], ['sex', 'Sexta', 'Sex']];
  const TURNOS = [['m', 'Matutino', 'manhã'], ['t', 'Vespertino', 'tarde']];
  const SLOTS = DIAS.flatMap(([dia]) => TURNOS.map(([turno]) => `${dia}-${turno}`));
  const MAX_ALUNOS_GRUPO = 4;

  const porId = (lista, id) => lista.find((x) => x.id === id);
  const copiar = (d) => JSON.parse(JSON.stringify(d));
  const porNome = (a, b) => a.localeCompare(b, 'pt-BR');
  const digitos = (s) => String(s || '').replace(/\D/g, '');

  function novoId(lista, prefixo) {
    const maior = lista.reduce((m, x) => Math.max(m, Number(digitos(x.id)) || 0), 0);
    return `${prefixo}${maior + 1}`;
  }

  function rotuloSlot(slot) {
    const [dia, turno] = slot.split('-');
    return `${DIAS.find((x) => x[0] === dia)[2]} ${TURNOS.find((x) => x[0] === turno)[2]}`;
  }

  const horarioDoSlot = (modulo, slot) => modulo.horarios[slot.split('-')[1]];

  // No formato do documento da coordenação: "Terça e sexta: matutino; Quinta: vespertino".
  function descreverDias(slots) {
    return TURNOS.map(([t, nomeTurno]) => {
      const dias = DIAS.filter(([d]) => slots.includes(`${d}-${t}`)).map((x) => x[1].toLowerCase());
      if (!dias.length) return null;
      const lista = dias.length > 1 ? `${dias.slice(0, -1).join(', ')} e ${dias[dias.length - 1]}` : dias[0];
      return `${lista[0].toUpperCase()}${lista.slice(1)}: ${nomeTurno.toLowerCase()}`;
    }).filter(Boolean).join('; ');
  }

  // CPF

  function cpfValido(cpf) {
    const n = digitos(cpf);
    if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
    const dv = (tam) => {
      let soma = 0;
      for (let i = 0; i < tam; i++) soma += Number(n[i]) * (tam + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(n[9]) && dv(10) === Number(n[10]);
  }

  function formatarCpf(cpf) {
    const n = digitos(cpf);
    return n.length === 11 ? `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}` : String(cpf || '').trim();
  }

  const mascararCpf = (cpf) => {
    const n = digitos(cpf);
    return n.length === 11 ? `***.${n.slice(3, 6)}.${n.slice(6, 9)}-**` : '';
  };

  // Turmas, alunos e grupos

  function sugerirDivisao(totalAlunos, max = MAX_ALUNOS_GRUPO) {
    if (totalAlunos <= 0) return [];
    const grupos = Math.ceil(totalAlunos / max);
    const base = Math.floor(totalAlunos / grupos);
    const sobra = totalAlunos % grupos;
    return Array.from({ length: grupos }, (_, i) => base + (i < sobra ? 1 : 0));
  }

  const alunosDoGrupo = (d, grupoId) => d.alunos.filter((a) => a.grupoId === grupoId);
  const gruposDaTurma = (d, turmaId) => d.grupos.filter((g) => g.turmaId === turmaId).sort((a, b) => a.numero - b.numero);

  function podeEntrarNoGrupo(d, grupoId) {
    if (alunosDoGrupo(d, grupoId).length >= MAX_ALUNOS_GRUPO) {
      return { ok: false, motivo: `O grupo ${grupoId} já tem ${MAX_ALUNOS_GRUPO} alunos.` };
    }
    return { ok: true };
  }

  function moverAluno(d, alunoId, grupoId) {
    const aluno = porId(d.alunos, alunoId);
    if (grupoId && aluno.grupoId !== grupoId) {
      const r = podeEntrarNoGrupo(d, grupoId);
      if (!r.ok) return { ok: false, dados: d, motivo: r.motivo };
    }
    const novo = copiar(d);
    porId(novo.alunos, alunoId).grupoId = grupoId || null;
    return { ok: true, dados: novo };
  }

  function adicionarAluno(d, { nome, matricula, cpf }, turmaId) {
    const limpo = String(nome || '').trim().replace(/\s+/g, ' ');
    if (!limpo) return { ok: false, dados: d, motivo: 'Digite o nome completo do aluno.' };
    if (cpf && !cpfValido(cpf)) return { ok: false, dados: d, motivo: 'O CPF digitado não é válido.' };
    const novo = copiar(d);
    novo.alunos.push({ id: novoId(novo.alunos, 'al'), nome: limpo, matricula: String(matricula || '').trim(), cpf: cpf ? formatarCpf(cpf) : '', turmaId, grupoId: null });
    return { ok: true, dados: novo };
  }

  function criarGrupo(d, turmaId) {
    const novo = copiar(d);
    const numero = novo.grupos.filter((g) => g.turmaId === turmaId).reduce((m, g) => Math.max(m, g.numero), 0) + 1;
    const id = `${turmaId}${numero}`;
    novo.grupos.push({ id, turmaId, numero });
    return { ok: true, dados: novo, grupoId: id };
  }

  // Rotação: qual turma faz qual módulo em cada rodízio

  const turmaNoModulo = (d, rodizioId, moduloId) => (d.rotacao.find((x) => x.rodizioId === rodizioId && x.moduloId === moduloId) || {}).turmaId || null;
  const moduloDaTurma = (d, rodizioId, turmaId) => (d.rotacao.find((x) => x.rodizioId === rodizioId && x.turmaId === turmaId) || {}).moduloId || null;
  const turmaDoGrupo = (d, grupoId) => porId(d.grupos, grupoId).turmaId;

  function validarRotacao(d) {
    const erros = [];
    d.rodizios.forEach((r) => d.modulos.forEach((m) => {
      const n = d.rotacao.filter((x) => x.rodizioId === r.id && x.moduloId === m.id).length;
      if (n !== 1) erros.push(`${m.nome} está com ${n} turmas no rodízio ${r.ordem}.`);
    }));
    d.turmas.forEach((t) => d.modulos.forEach((m) => {
      const n = d.rotacao.filter((x) => x.turmaId === t.id && x.moduloId === m.id).length;
      if (n > 1) erros.push(`A ${t.nome} passa ${n} vezes por ${m.nome}.`);
      if (n === 0) erros.push(`A ${t.nome} não passa por ${m.nome} no semestre.`);
    }));
    return erros;
  }

  // Escalas: rodízio × módulo

  const preceptoresDoModulo = (d, moduloId) => d.preceptores.filter((p) => p.moduloId === moduloId).sort((a, b) => porNome(a.nome, b.nome));
  const alocacaoEm = (d, rodizioId, preceptorId, slot) =>
    d.alocacoes.find((a) => a.rodizioId === rodizioId && a.preceptorId === preceptorId && a.slot === slot);
  const alocacoesDoGrupo = (d, rodizioId, grupoId) => d.alocacoes.filter((a) => a.rodizioId === rodizioId && a.grupoId === grupoId);

  function numeroEscala(d, rodizioId, moduloId) {
    const r = porId(d.rodizios, rodizioId);
    return (r.ordem - 1) * d.modulos.length + d.modulos.findIndex((m) => m.id === moduloId) + 1;
  }

  function avaliarGrupo(d, rodizioId, preceptorId, slot, grupoId, ignorarAlocacaoId) {
    const p = porId(d.preceptores, preceptorId);
    const avisos = [];
    const turmaId = turmaDoGrupo(d, grupoId);
    if (turmaId !== turmaNoModulo(d, rodizioId, p.moduloId)) {
      const outro = porId(d.modulos, moduloDaTurma(d, rodizioId, turmaId) || '');
      avisos.push({ nivel: 'bloqueia', texto: `A ${porId(d.turmas, turmaId).nome} está em ${outro ? outro.nome : 'outro módulo'} neste rodízio.` });
    }
    const ocupado = d.alocacoes.find((a) => a.rodizioId === rodizioId && a.grupoId === grupoId && a.slot === slot && a.id !== ignorarAlocacaoId);
    if (ocupado) avisos.push({ nivel: 'bloqueia', texto: `Já está com ${porId(d.preceptores, ocupado.preceptorId).nome} neste horário.` });
    if (!p.horario.includes(slot)) avisos.push({ nivel: 'alerta', texto: 'Fora do horário de preceptoria cadastrado.' });
    return avisos;
  }

  // Grupos da turma que pode ocupar o turno: sem conflito primeiro, e entre eles os que mais precisam de horas.
  function gruposParaSlot(d, rodizioId, preceptorId, slot) {
    const p = porId(d.preceptores, preceptorId);
    const atual = alocacaoEm(d, rodizioId, preceptorId, slot);
    return gruposDaTurma(d, turmaNoModulo(d, rodizioId, p.moduloId))
      .map((g) => {
        const avisos = avaliarGrupo(d, rodizioId, preceptorId, slot, g.id, atual && atual.id);
        return { grupo: g, avisos, bloqueado: avisos.some((a) => a.nivel === 'bloqueia'), carga: cargaGrupo(d, rodizioId, g.id) };
      })
      .sort((a, b) => (a.bloqueado - b.bloqueado) || (b.carga.falta - a.carga.falta) || (a.grupo.numero - b.grupo.numero));
  }

  const preceptoresLivres = (d, rodizioId, moduloId, slot) =>
    preceptoresDoModulo(d, moduloId).filter((p) => p.horario.includes(slot) && !alocacaoEm(d, rodizioId, p.id, slot));

  // Coloca, troca ou retira (grupoId vazio) o grupo de um turno do preceptor.
  function definirGrupo(d, { rodizioId, preceptorId, slot }, grupoId, quando) {
    const atual = alocacaoEm(d, rodizioId, preceptorId, slot);
    const de = atual ? atual.grupoId : null;
    const para = grupoId || null;
    if (de === para) return { ok: true, dados: d, avisos: [] };
    const avisos = para ? avaliarGrupo(d, rodizioId, preceptorId, slot, para, atual && atual.id) : [];
    if (avisos.some((a) => a.nivel === 'bloqueia')) return { ok: false, dados: d, avisos };
    const novo = copiar(d);
    if (!para) novo.alocacoes = novo.alocacoes.filter((a) => a.id !== atual.id);
    else if (atual) porId(novo.alocacoes, atual.id).grupoId = para;
    else novo.alocacoes.push({ id: novoId(novo.alocacoes, 'x'), rodizioId, preceptorId, slot, grupoId: para });
    novo.trocas.push({ quando, rodizioId, slot, tipo: 'grupo', preceptorId, de, para });
    return { ok: true, dados: novo, avisos };
  }

  // Passa o grupo de um turno para outro preceptor do módulo que esteja livre no mesmo horário.
  function trocarPreceptor(d, { rodizioId, preceptorId, slot }, novoPreceptorId, quando) {
    const atual = alocacaoEm(d, rodizioId, preceptorId, slot);
    if (!atual) return { ok: false, dados: d, motivo: 'Este turno não tem grupo.' };
    const novoP = porId(d.preceptores, novoPreceptorId);
    if (novoP.moduloId !== porId(d.preceptores, preceptorId).moduloId) return { ok: false, dados: d, motivo: `${novoP.nome} é de outro módulo.` };
    if (!novoP.horario.includes(slot)) return { ok: false, dados: d, motivo: `${novoP.nome} não atende neste horário.` };
    if (alocacaoEm(d, rodizioId, novoPreceptorId, slot)) return { ok: false, dados: d, motivo: `${novoP.nome} já tem grupo neste horário.` };
    const novo = copiar(d);
    porId(novo.alocacoes, atual.id).preceptorId = novoPreceptorId;
    novo.trocas.push({ quando, rodizioId, slot, tipo: 'preceptor', grupoId: atual.grupoId, de: preceptorId, para: novoPreceptorId });
    return { ok: true, dados: novo };
  }

  // Carga horária: turnos na semana × horas do turno × semanas do rodízio.

  function cargaGrupo(d, rodizioId, grupoId) {
    const modulo = porId(d.modulos, moduloDaTurma(d, rodizioId, turmaDoGrupo(d, grupoId)) || '');
    const rodizio = porId(d.rodizios, rodizioId);
    const turnos = alocacoesDoGrupo(d, rodizioId, grupoId).length;
    if (!modulo) return { turnos, horasSemana: 0, total: 0, meta: 0, falta: 0 };
    const horasSemana = turnos * modulo.horasTurno;
    const total = horasSemana * rodizio.semanas;
    return { turnos, horasSemana, total, meta: modulo.metaHoras, falta: Math.max(0, modulo.metaHoras - total) };
  }

  function resumoEscalas(d, rodizioId) {
    return d.modulos.map((m) => {
      const turmaId = turmaNoModulo(d, rodizioId, m.id);
      const grupos = turmaId ? gruposDaTurma(d, turmaId) : [];
      const ps = preceptoresDoModulo(d, m.id);
      const alocs = d.alocacoes.filter((a) => a.rodizioId === rodizioId && ps.some((p) => p.id === a.preceptorId));
      return {
        modulo: m,
        numero: numeroEscala(d, rodizioId, m.id),
        turma: turmaId && porId(d.turmas, turmaId),
        grupos: grupos.length,
        alunos: grupos.reduce((s, g) => s + alunosDoGrupo(d, g.id).length, 0),
        preceptoresComGrupo: new Set(alocs.map((a) => a.preceptorId)).size,
        turnosOcupados: alocs.length,
        turnosOferecidos: ps.reduce((s, p) => s + p.horario.length, 0),
        abaixo: grupos.filter((g) => cargaGrupo(d, rodizioId, g.id).falta > 0).length,
      };
    });
  }

  // Problemas

  function choques(d, rodizioId) {
    const mapa = new Map();
    d.alocacoes.filter((a) => a.rodizioId === rodizioId).forEach((a) => {
      const chave = `${a.grupoId}|${a.slot}`;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave).push(a);
    });
    return [...mapa.values()].filter((l) => l.length > 1).map((l) => ({ grupoId: l[0].grupoId, slot: l[0].slot, alocacoes: l }));
  }

  const foraDoHorario = (d, rodizioId) =>
    d.alocacoes.filter((a) => a.rodizioId === rodizioId && !porId(d.preceptores, a.preceptorId).horario.includes(a.slot));
  const preceptoresOciosos = (d, rodizioId) =>
    d.preceptores.filter((p) => !d.alocacoes.some((a) => a.rodizioId === rodizioId && a.preceptorId === p.id));
  const alunosSemEscala = (d, rodizioId) =>
    d.alunos.filter((a) => !a.grupoId || !alocacoesDoGrupo(d, rodizioId, a.grupoId).length);

  // Cadastro de preceptores

  const CAMPOS_OBRIGATORIOS = [['nome', 'nome'], ['cpf', 'CPF'], ['crm', 'CRM'], ['email', 'e-mail'], ['celular', 'celular'], ['unidadeId', 'unidade'], ['setor', 'setor']];
  const camposFaltando = (p) => CAMPOS_OBRIGATORIOS.filter(([k]) => !String(p[k] || '').trim()).map(([, rotulo]) => rotulo);

  function validarPreceptor(d, p) {
    const erros = {};
    const obrig = (campo, msg) => { if (!String(p[campo] || '').trim()) erros[campo] = msg; };
    obrig('nome', 'Informe o nome completo.');
    if (!String(p.cpf || '').trim()) erros.cpf = 'Informe o CPF.';
    else if (!cpfValido(p.cpf)) erros.cpf = 'CPF inválido. Confira os números.';
    else if (d.preceptores.some((x) => x.id !== p.id && digitos(x.cpf) === digitos(p.cpf))) erros.cpf = 'Já existe um preceptor com este CPF.';
    if (!String(p.crm || '').trim()) erros.crm = 'Informe o número do CRM-MA.';
    else if (!/^\d{3,7}$/.test(digitos(p.crm)) || digitos(p.crm) !== String(p.crm).trim()) erros.crm = 'Use só números.';
    if (!String(p.email || '').trim()) erros.email = 'Informe o e-mail.';
    else if (!/^\S+@\S+\.\S+$/.test(p.email)) erros.email = 'E-mail inválido.';
    obrig('celular', 'Informe o celular.');
    if (p.cep && digitos(p.cep).length !== 8) erros.cep = 'O CEP tem 8 números.';
    obrig('moduloId', 'Escolha o módulo.');
    obrig('unidadeId', 'Escolha a unidade.');
    const unidade = porId(d.unidades, p.unidadeId);
    if (!p.setor) erros.setor = 'Escolha o setor.';
    else if (unidade && !unidade.setores.includes(p.setor)) erros.setor = 'Este setor não é da unidade escolhida.';
    if (!p.horario || !p.horario.length) erros.horario = 'Marque pelo menos um turno.';
    if (p.ses && p.ses.trabalha && !String(p.ses.unidade || '').trim()) erros.sesUnidade = 'Informe a unidade da SES.';
    const anterior = p.id && porId(d.preceptores, p.id);
    if (anterior && anterior.moduloId !== p.moduloId && d.alocacoes.some((a) => a.preceptorId === p.id)) {
      erros.moduloId = 'Este preceptor tem grupos nas escalas. Retire os grupos antes de mudar o módulo.';
    }
    return erros;
  }

  function salvarPreceptor(d, dados) {
    const erros = validarPreceptor(d, dados);
    if (Object.keys(erros).length) return { ok: false, dados: d, erros, motivo: 'Corrija os campos marcados.' };
    const novo = copiar(d);
    const registro = { ...copiar(dados), cpf: formatarCpf(dados.cpf), crm: String(dados.crm).trim() };
    if (registro.id) novo.preceptores[novo.preceptores.findIndex((p) => p.id === registro.id)] = registro;
    else {
      registro.id = novoId(novo.preceptores, 'p');
      novo.preceptores.push(registro);
    }
    const fora = novo.alocacoes.filter((a) => a.preceptorId === registro.id && !registro.horario.includes(a.slot)).length;
    return { ok: true, dados: novo, id: registro.id, alerta: fora ? `${fora} turno(s) com grupo ficaram fora do novo horário. Eles aparecem no painel.` : null };
  }

  // Relação de alunos por grupo: um documento por preceptor, cobrindo o semestre.

  function relacaoPreceptor(d, preceptorId) {
    const p = porId(d.preceptores, preceptorId);
    const modulo = porId(d.modulos, p.moduloId);
    const unidade = porId(d.unidades, p.unidadeId);
    const grupos = d.rodizios.flatMap((r) => {
      const alocs = d.alocacoes.filter((a) => a.rodizioId === r.id && a.preceptorId === p.id);
      return [...new Set(alocs.map((a) => a.grupoId))]
        .map((gid) => porId(d.grupos, gid))
        .sort((a, b) => a.numero - b.numero)
        .map((g) => {
          const slots = alocs.filter((a) => a.grupoId === g.id).map((a) => a.slot);
          return {
            grupo: g.id, rodizio: r.ordem, inicio: r.inicio, fim: r.fim,
            dias: descreverDias(slots), horas: slots.length * modulo.horasTurno * r.semanas,
            alunos: alunosDoGrupo(d, g.id).sort((a, b) => porNome(a.nome, b.nome)).map((a) => ({ nome: a.nome, matricula: a.matricula, cpf: a.cpf })),
          };
        });
    });
    const usados = d.rodizios.filter((r) => grupos.some((g) => g.rodizio === r.ordem));
    const horas = grupos.map((g) => g.horas);
    return {
      preceptor: p.nome, crm: p.crm, modulo: modulo.nome, unidade: unidade.nome, municipio: unidade.municipio, setor: p.setor,
      curso: d.curso, periodo: d.periodoCurso, semestre: d.semestre,
      inicio: usados.length ? usados[0].inicio : null, fim: usados.length ? usados[usados.length - 1].fim : null,
      grupos,
      totalGrupos: grupos.length,
      totalAlunos: grupos.reduce((s, g) => s + g.alunos.length, 0),
      dias: descreverDias(p.horario),
      horarios: TURNOS.filter(([t]) => p.horario.some((s) => s.endsWith(`-${t}`))).map(([t, nome]) => `${nome}: ${modulo.horarios[t]}`).join('; '),
      cargaIndividual: horas.length ? { min: Math.min(...horas), max: Math.max(...horas) } : null,
      cargaTotal: horas.reduce((s, h) => s + h, 0),
      semanas: usados.reduce((s, r) => s + r.semanas, 0),
    };
  }

  const assinaturaRelacao = (d, preceptorId) => JSON.stringify(relacaoPreceptor(d, preceptorId));
  const relacoesDo = (d, preceptorId) => d.relacoes.filter((o) => o.preceptorId === preceptorId);

  function statusRelacao(d, preceptorId) {
    const emitidas = relacoesDo(d, preceptorId);
    if (!emitidas.length) return d.alocacoes.some((a) => a.preceptorId === preceptorId) ? 'nao_emitida' : 'sem_grupos';
    return emitidas[emitidas.length - 1].assinatura === assinaturaRelacao(d, preceptorId) ? 'em_dia' : 'desatualizada';
  }

  function emitirRelacao(d, preceptorId, quando) {
    const novo = copiar(d);
    novo.relacoes.push({ preceptorId, versao: relacoesDo(d, preceptorId).length + 1, quando, assinatura: assinaturaRelacao(d, preceptorId) });
    return { ok: true, dados: novo };
  }

  // Pendências do rodízio, para o painel. nivel: 'erro' impede fechar a escala; 'aviso' pede revisão.

  function pendencias(d, rodizioId) {
    const nome = (id) => porId(d.preceptores, id).nome;
    const moduloDe = (preceptorId) => porId(d.preceptores, preceptorId).moduloId;
    const lista = [];
    validarRotacao(d).forEach((texto) => lista.push({ nivel: 'erro', texto, alvo: { aba: 'cadastros', sub: 'periodo' } }));
    choques(d, rodizioId).forEach((c) => {
      const ultima = c.alocacoes[c.alocacoes.length - 1];
      lista.push({
        nivel: 'erro',
        texto: `O grupo ${c.grupoId} está com ${c.alocacoes.map((a) => nome(a.preceptorId)).join(' e ')} ao mesmo tempo (${rotuloSlot(c.slot)}).`,
        alvo: { aba: 'escalas', rodizioId, moduloId: moduloDe(ultima.preceptorId), preceptorId: ultima.preceptorId, slot: c.slot },
      });
    });
    const sem = alunosSemEscala(d, rodizioId);
    if (sem.length) {
      lista.push({ nivel: 'erro', texto: `${sem.length === 1 ? '1 aluno está' : `${sem.length} alunos estão`} sem escala: ${sem.map((a) => a.nome).join(', ')}.`, alvo: { aba: 'cadastros', sub: 'turmas', turmaId: sem[0].turmaId } });
    }
    foraDoHorario(d, rodizioId).forEach((a) => lista.push({
      nivel: 'aviso',
      texto: `${nome(a.preceptorId)} tem o grupo ${a.grupoId} num turno que saiu do horário de preceptoria (${rotuloSlot(a.slot)}).`,
      alvo: { aba: 'escalas', rodizioId, moduloId: moduloDe(a.preceptorId), preceptorId: a.preceptorId, slot: a.slot },
    }));
    d.modulos.forEach((m) => {
      const turmaId = turmaNoModulo(d, rodizioId, m.id);
      if (!turmaId) return;
      gruposDaTurma(d, turmaId).forEach((g) => {
        const c = cargaGrupo(d, rodizioId, g.id);
        if (c.falta > 0) lista.push({ nivel: 'aviso', texto: `O grupo ${g.id} fecha ${c.total} h de ${c.meta} h em ${m.nome} (faltam ${c.falta} h).`, alvo: { aba: 'escalas', rodizioId, moduloId: m.id } });
      });
    });
    d.preceptores.forEach((p) => {
      const faltam = camposFaltando(p);
      if (faltam.length) lista.push({ nivel: 'aviso', texto: `Cadastro de ${p.nome} incompleto: falta ${faltam.join(', ')}.`, alvo: { aba: 'cadastros', sub: 'preceptores', ficha: p.id } });
      if (statusRelacao(d, p.id) === 'desatualizada') lista.push({ nivel: 'aviso', texto: `A relação de alunos de ${p.nome} mudou depois da última emissão.`, alvo: { aba: 'relacoes', preceptorId: p.id } });
    });
    return lista;
  }

  const api = {
    DIAS, TURNOS, SLOTS, MAX_ALUNOS_GRUPO,
    rotuloSlot, horarioDoSlot, descreverDias, cpfValido, formatarCpf, mascararCpf,
    sugerirDivisao, alunosDoGrupo, gruposDaTurma, podeEntrarNoGrupo, moverAluno, adicionarAluno, criarGrupo,
    turmaNoModulo, moduloDaTurma, validarRotacao,
    preceptoresDoModulo, alocacaoEm, alocacoesDoGrupo, numeroEscala, avaliarGrupo, gruposParaSlot, preceptoresLivres,
    definirGrupo, trocarPreceptor, cargaGrupo, resumoEscalas,
    choques, foraDoHorario, preceptoresOciosos, alunosSemEscala,
    camposFaltando, validarPreceptor, salvarPreceptor,
    relacaoPreceptor, statusRelacao, emitirRelacao, relacoesDo, pendencias,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Dominio = api;
})(typeof window !== 'undefined' ? window : globalThis);
