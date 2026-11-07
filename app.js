/* Telas do protótipo. O estado fica num único objeto (d) e cada ação troca o objeto inteiro
   pelo que as regras do Dominio devolvem; depois a tela é redesenhada. */
(function () {
  'use strict';

  const R = window.Dominio;
  const CHAVE = 'ceuma-prototipo-estagios-v2';
  const ABAS = [['painel', 'Painel'], ['escalas', 'Escalas'], ['cadastros', 'Cadastros'], ['relacoes', 'Relações de alunos']];
  const SUBS = [['preceptores', 'Preceptores'], ['turmas', 'Turmas e grupos'], ['unidades', 'Unidades'], ['periodo', 'Período e rodízios']];
  const porId = (lista, id) => lista.find((x) => x.id === id);

  let d = carregar();
  const ui = {
    aba: abaDoEndereco(), rodizioId: d.rodizioAtual, moduloId: d.modulos[0].id, sub: 'preceptores', turmaId: d.turmas[0].id,
    filtroModulo: '', busca: '', ficha: null, rascunho: null, erros: {}, celula: null, filtroRel: d.modulos[0].id, preceptorRel: null, aviso: null,
  };

  function exemploInicial() {
    let dados = window.criarDadosExemplo();
    dados.preceptores.forEach((p) => {
      if (R.statusRelacao(dados, p.id) === 'nao_emitida') dados = R.emitirRelacao(dados, p.id, '2026-10-22T10:00').dados;
    });
    // Uma troca depois da emissão, para mostrar uma relação desatualizada.
    const go = dados.preceptores.filter((p) => p.moduloId === 'go');
    return R.trocarPreceptor(dados, { rodizioId: 'r3', preceptorId: go[0].id, slot: 'qua-m' }, go[16].id, '2026-10-27T14:30').dados;
  }

  function carregar() {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo) return JSON.parse(salvo);
    } catch (e) { /* sem armazenamento: começa do exemplo */ }
    return exemploInicial();
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) { /* segue só na memória */ }
  }

  function abaDoEndereco() {
    const h = location.hash.slice(1);
    return ABAS.some(([id]) => id === h) ? h : 'painel';
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const data = (iso) => iso.slice(0, 10).split('-').reverse().join('/');
  const dataCurta = (iso) => data(iso).slice(0, 5);
  const dataHora = (iso) => `${dataCurta(iso)} às ${iso.slice(11, 16)}`;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const agora = () => {
    const t = new Date();
    const z = (n) => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${z(t.getMonth() + 1)}-${z(t.getDate())}T${z(t.getHours())}:${z(t.getMinutes())}`;
  };
  const nomeP = (id) => (id ? porId(d.preceptores, id).nome : 'ninguém');
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function aplicar(r, sucesso) {
    if (r.ok) {
      d = r.dados;
      salvar();
      const extra = [r.alerta, ...(r.avisos || []).map((a) => a.texto)].filter(Boolean);
      ui.aviso = sucesso ? { nivel: extra.length ? 'aviso' : 'ok', texto: [sucesso, ...extra].join(' ') } : null;
    } else {
      ui.aviso = { nivel: 'erro', texto: r.motivo || r.avisos.filter((a) => a.nivel === 'bloqueia').map((a) => a.texto).join(' ') };
    }
    render();
  }

  function seletor(acao, itens, atual, rotulo) {
    return `<div class="segmentos" role="group" aria-label="${esc(rotulo)}">${itens.map(([id, texto]) =>
      `<button type="button" aria-pressed="${id === atual}" data-acao="${acao}" data-id="${id}">${texto}</button>`).join('')}</div>`;
  }

  const seletorRodizio = () => seletor('rodizio', d.rodizios.map((r) => [r.id, `Rodízio ${r.ordem} <span>${dataCurta(r.inicio)}–${dataCurta(r.fim)}</span>`]), ui.rodizioId, 'Rodízio');

  // Painel

  function vPainel() {
    const r = porId(d.rodizios, ui.rodizioId);
    const ordem = { erro: 0, aviso: 1 };
    const pend = R.pendencias(d, r.id).sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
    const resumo = R.resumoEscalas(d, r.id);
    const nGrupos = resumo.reduce((s, x) => s + x.grupos, 0);
    const nAlunos = resumo.reduce((s, x) => s + x.alunos, 0);

    const itens = pend.map((p) => `
      <li>
        <span class="nivel ${p.nivel}">${p.nivel === 'erro' ? 'Erro' : 'Aviso'}</span>
        <span class="txt">${esc(p.texto)}</span>
        <button type="button" class="link" data-acao="ir" data-alvo="${esc(JSON.stringify(p.alvo))}">Abrir</button>
      </li>`).join('');

    const linhas = resumo.map((x) => `
      <tr>
        <td>${x.numero}</td>
        <td><button type="button" class="link" data-acao="ir" data-alvo="${esc(JSON.stringify({ aba: 'escalas', rodizioId: r.id, moduloId: x.modulo.id }))}">${esc(x.modulo.nome)}</button></td>
        <td>${x.turma ? esc(x.turma.nome) : '—'}</td>
        <td class="num">${x.grupos}</td>
        <td class="num">${x.alunos}</td>
        <td class="num">${x.turnosOcupados} de ${x.turnosOferecidos}</td>
        <td>${x.abaixo ? `<span class="txt-aviso">${plural(x.abaixo, 'grupo', 'grupos')} abaixo da carga</span>` : '<span class="mudo">Em dia</span>'}</td>
      </tr>`).join('');

    const trocas = d.trocas.slice(-5).reverse().map((t) => {
      const desc = t.tipo === 'preceptor'
        ? `Grupo ${t.grupoId} passou de ${esc(nomeP(t.de))} para ${esc(nomeP(t.para))}`
        : `${esc(nomeP(t.preceptorId))}: ${t.de ? `grupo ${t.de}` : 'turno livre'} → ${t.para ? `grupo ${t.para}` : 'turno livre'}`;
      return `<li><span class="mudo">${dataHora(t.quando)} · Rodízio ${porId(d.rodizios, t.rodizioId).ordem}, ${R.rotuloSlot(t.slot)}</span><span>${desc}</span></li>`;
    }).join('');

    return `
      <section class="secao">
        <div class="cab-secao">
          <div>
            <h2>Rodízio ${r.ordem}${r.id === d.rodizioAtual ? ' <span class="selo">em andamento</span>' : ''}</h2>
            <p class="mudo">${data(r.inicio)} a ${data(r.fim)} · ${r.semanas} semanas · ${resumo.length} escalas · ${nGrupos} grupos · ${nAlunos} alunos</p>
          </div>
          ${seletorRodizio()}
        </div>
      </section>
      <section class="secao">
        <h3>Precisa de atenção</h3>
        ${itens ? `<ul class="pendencias">${itens}</ul>` : '<p class="mudo">Nada pendente neste rodízio.</p>'}
      </section>
      <section class="secao">
        <h3>Escalas do rodízio</h3>
        <div class="tabela"><table>
          <thead><tr><th>Nº</th><th>Módulo</th><th>Turma</th><th class="num">Grupos</th><th class="num">Alunos</th><th class="num">Turnos ocupados</th><th>Carga horária</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table></div>
      </section>
      <section class="secao">
        <h3>Últimas alterações nas escalas</h3>
        ${trocas ? `<ul class="historico">${trocas}</ul>` : '<p class="mudo">Nenhuma alteração registrada.</p>'}
      </section>`;
  }

  // Escalas

  function vEscalas() {
    const r = porId(d.rodizios, ui.rodizioId);
    const m = porId(d.modulos, ui.moduloId);
    const turma = porId(d.turmas, R.turmaNoModulo(d, r.id, m.id) || '');
    const grupos = turma ? R.gruposDaTurma(d, turma.id) : [];
    const nAlunos = grupos.reduce((s, g) => s + R.alunosDoGrupo(d, g.id).length, 0);
    const ps = R.preceptoresDoModulo(d, m.id);
    const idsChoque = new Set(R.choques(d, r.id).flatMap((c) => c.alocacoes.map((a) => a.id)));
    const idsFora = new Set(R.foraDoHorario(d, r.id).map((a) => a.id));

    const cab1 = R.DIAS.map(([, nome]) => `<th colspan="2" scope="colgroup" class="dia">${nome}</th>`).join('');
    const cab2 = R.DIAS.map(() => '<th scope="col" class="turno">Manhã</th><th scope="col" class="turno">Tarde</th>').join('');

    const linhas = ps.map((p) => {
      const u = porId(d.unidades, p.unidadeId);
      const celulas = R.SLOTS.map((slot) => {
        const a = R.alocacaoEm(d, r.id, p.id, slot);
        const atende = p.horario.includes(slot);
        const borda = slot.endsWith('-t') ? ' fim-dia' : '';
        if (!atende && !a) return `<td class="nao-atende${borda}"><span class="sr">Não atende</span></td>`;
        let cls = a ? 'cel' : 'cel livre';
        if (a && idsChoque.has(a.id)) cls += ' conflito';
        else if (a && idsFora.has(a.id)) cls += ' fora';
        if (ui.celula && ui.celula.preceptorId === p.id && ui.celula.slot === slot) cls += ' sel';
        const rotulo = `${p.nome}, ${R.rotuloSlot(slot)}: ${a ? `grupo ${a.grupoId}` : 'livre'}`;
        return `<td class="${borda.trim()}"><button type="button" class="${cls}" data-acao="celula" data-p="${p.id}" data-slot="${slot}" aria-label="${esc(rotulo)}">${a ? a.grupoId : 'livre'}</button></td>`;
      }).join('');
      return `<tr><th scope="row" class="preceptor"><b>${esc(p.nome)}</b><span>${esc(u.nome)} · ${esc(p.setor)}</span></th>${celulas}</tr>`;
    }).join('');

    const linhasGrupos = grupos.map((g) => {
      const c = R.cargaGrupo(d, r.id, g.id);
      const slots = R.alocacoesDoGrupo(d, r.id, g.id).map((a) => a.slot);
      return `<tr>
        <td><b>${g.id}</b></td>
        <td class="num">${R.alunosDoGrupo(d, g.id).length}</td>
        <td>${slots.length ? esc(R.descreverDias(slots)) : '<span class="txt-erro">Sem turnos</span>'}</td>
        <td class="num">${c.falta ? `<span class="txt-aviso">${c.total} h de ${c.meta} h</span>` : `${c.total} h`}</td>
      </tr>`;
    }).join('');

    return `
      <section class="secao">
        <div class="cab-secao">
          ${seletorRodizio()}
          ${seletor('modulo', d.modulos.map((x) => [x.id, esc(x.nome)]), m.id, 'Módulo')}
        </div>
        <div>
          <h2>Escala ${R.numeroEscala(d, r.id, m.id)} · ${esc(m.nome)}</h2>
          <p class="mudo">${turma ? `${esc(turma.nome)} · ${grupos.length} grupos · ${nAlunos} alunos` : 'Nenhuma turma neste rodízio'} ·
            turnos de ${m.horasTurno} h (manhã ${m.horarios.m}, tarde ${m.horarios.t}) · meta de ${m.metaHoras} h no rodízio</p>
        </div>
        <p class="dica">Cada linha é o horário fixo de um preceptor. Clique num turno para colocar, trocar ou retirar o grupo, ou para passar o grupo a outro preceptor livre.</p>
        <div class="tabela rola">
          <table class="grade">
            <thead>
              <tr><th rowspan="2" scope="col" class="col-preceptor">Preceptor</th>${cab1}</tr>
              <tr>${cab2}</tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
        <p class="legenda"><span class="amostra cel-a">A1</span> turno com grupo <span class="amostra livre-a">livre</span> turno sem grupo
          <span class="amostra nao-a"></span> não atende <span class="amostra conflito-a">A2</span> conflito</p>
      </section>
      <section class="secao">
        <h3>Grupos da ${turma ? esc(turma.nome) : 'turma'}</h3>
        <div class="tabela"><table>
          <thead><tr><th>Grupo</th><th class="num">Alunos</th><th>Dias na semana</th><th class="num">Carga no rodízio</th></tr></thead>
          <tbody>${linhasGrupos}</tbody>
        </table></div>
      </section>`;
  }

  function vGavetaCelula() {
    const { preceptorId, slot } = ui.celula;
    const r = porId(d.rodizios, ui.rodizioId);
    const p = porId(d.preceptores, preceptorId);
    const m = porId(d.modulos, p.moduloId);
    const u = porId(d.unidades, p.unidadeId);
    const a = R.alocacaoEm(d, r.id, p.id, slot);
    const problemas = a ? R.avaliarGrupo(d, r.id, p.id, slot, a.grupoId, a.id) : [];
    const opcoes = R.gruposParaSlot(d, r.id, p.id, slot).map(({ grupo: g, avisos, bloqueado, carga }) => {
      const eAtual = a && a.grupoId === g.id;
      const motivo = !eAtual && avisos.length ? `<span class="${bloqueado ? 'txt-erro' : 'txt-aviso'}">${esc(avisos.map((x) => x.texto).join(' '))}</span>` : '';
      return `<li class="${bloqueado && !eAtual ? 'bloqueado' : ''}">
        <div class="opcao-info"><b>Grupo ${g.id}</b>
          <span class="mudo">${R.alunosDoGrupo(d, g.id).length} alunos · ${carga.total} h de ${carga.meta} h no rodízio</span>${motivo}</div>
        ${eAtual ? '<span class="atual">Neste turno</span>' : `<button type="button" class="btn sec pequeno" data-acao="escolher-grupo" data-id="${g.id}" ${bloqueado ? 'disabled' : ''}>Colocar</button>`}
      </li>`;
    }).join('');
    const livres = a ? R.preceptoresLivres(d, r.id, m.id, slot).filter((x) => x.id !== p.id) : [];
    const listaLivres = livres.map((x) => {
      const ux = porId(d.unidades, x.unidadeId);
      return `<li><div class="opcao-info"><b>${esc(x.nome)}</b><span class="mudo">${esc(ux.nome)} · ${esc(x.setor)}</span></div>
        <button type="button" class="btn sec pequeno" data-acao="passar" data-id="${x.id}">Passar</button></li>`;
    }).join('');

    return `
      <div class="fundo" data-acao="fechar"></div>
      <aside class="gaveta" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">
        <div class="gaveta-cab">
          <div>
            <p class="mudo">Escala ${R.numeroEscala(d, r.id, m.id)} · ${esc(m.nome)} · Rodízio ${r.ordem}</p>
            <h2 id="gaveta-titulo">${esc(p.nome)}</h2>
            <p class="mudo">${R.rotuloSlot(slot)}, ${R.horarioDoSlot(m, slot)} · ${esc(u.nome)} · ${esc(p.setor)}</p>
          </div>
          <button type="button" class="fechar" id="fechar-gaveta" data-acao="fechar" aria-label="Fechar">×</button>
        </div>
        ${ui.aviso && ui.aviso.naGaveta ? `<div class="aviso ${ui.aviso.nivel}" role="alert">${esc(ui.aviso.texto)}</div>` : ''}
        ${problemas.length ? `<div class="aviso ${problemas.some((x) => x.nivel === 'bloqueia') ? 'erro' : 'aviso'}">${esc(problemas.map((x) => x.texto).join(' '))}</div>` : ''}
        <section class="gaveta-secao">
          <h3>Grupo neste turno</h3>
          <ul class="opcoes">${opcoes}</ul>
          ${a ? '<button type="button" class="link perigo" data-acao="escolher-grupo" data-id="">Deixar o turno livre</button>' : ''}
        </section>
        ${a ? `<section class="gaveta-secao">
          <h3>Passar o grupo ${a.grupoId} para outro preceptor</h3>
          ${listaLivres ? `<ul class="opcoes">${listaLivres}</ul>` : '<p class="mudo">Nenhum preceptor deste módulo está livre neste horário.</p>'}
        </section>` : ''}
      </aside>`;
  }

  // Cadastros

  function vCadastros() {
    const corpo = { preceptores: vPreceptores, turmas: vTurmas, unidades: vUnidades, periodo: vPeriodo }[ui.sub]();
    return `
      <section class="secao">
        ${seletor('sub', SUBS.map(([id, nome]) => [id, nome]), ui.sub, 'Cadastro')}
      </section>
      ${corpo}`;
  }

  function vPreceptores() {
    const termo = norm(ui.busca);
    const lista = d.preceptores
      .filter((p) => (!ui.filtroModulo || p.moduloId === ui.filtroModulo) && (!termo || norm(p.nome).includes(termo) || String(p.crm).includes(termo)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const linhas = lista.map((p) => {
      const u = porId(d.unidades, p.unidadeId);
      const faltam = R.camposFaltando(p);
      return `<tr>
        <td><b>${esc(p.nome)}</b><span class="sub">${p.crm ? `CRM-MA ${esc(p.crm)}` : 'Sem CRM'}</span></td>
        <td>${esc(porId(d.modulos, p.moduloId).nome)}</td>
        <td>${u ? esc(u.nome) : '—'}<span class="sub">${esc(p.setor || '')}</span></td>
        <td class="horario-txt">${esc(R.descreverDias(p.horario))}</td>
        <td>${faltam.length ? `<span class="txt-aviso">Falta ${esc(faltam.join(', '))}</span>` : '<span class="mudo">Completo</span>'}</td>
        <td><button type="button" class="link" data-acao="editar-preceptor" data-id="${p.id}">Abrir ficha</button></td>
      </tr>`;
    }).join('');
    return `
      <section class="secao">
        <div class="ferramentas">
          <div class="campo-inline">
            <label for="filtro-modulo">Módulo</label>
            <select id="filtro-modulo" data-mudar="filtro-modulo">
              <option value="">Todos</option>
              ${d.modulos.map((m) => `<option value="${m.id}" ${ui.filtroModulo === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="campo-inline cresce">
            <label for="busca">Buscar</label>
            <input id="busca" type="search" autocomplete="off" placeholder="Nome ou CRM" value="${esc(ui.busca)}" data-mudar="busca">
          </div>
          <button type="button" class="btn" data-acao="novo-preceptor">Novo preceptor</button>
        </div>
        <p class="mudo">${plural(lista.length, 'preceptor', 'preceptores')}</p>
        <div class="tabela"><table>
          <thead><tr><th>Preceptor</th><th>Módulo</th><th>Unidade e setor</th><th>Horário de preceptoria</th><th>Cadastro</th><th><span class="sr">Ações</span></th></tr></thead>
          <tbody>${linhas || '<tr><td colspan="6" class="mudo">Nenhum preceptor encontrado.</td></tr>'}</tbody>
        </table></div>
      </section>`;
  }

  function novoRascunho() {
    return {
      nome: '', cpf: '', email: '', celular: '', fixo: '', graduacao: 'Medicina', crm: '', especialidade: '', matricula: '',
      endereco: '', bairro: '', cep: '', cidade: 'São Luís', uf: 'MA',
      moduloId: ui.filtroModulo || d.modulos[0].id, unidadeId: '', setor: '', horario: [],
      ses: { trabalha: false, unidade: '', dias: '', horario: '' },
    };
  }

  function vFicha() {
    const p = ui.rascunho;
    const e = ui.erros;
    const m = porId(d.modulos, p.moduloId) || d.modulos[0];
    const unidade = porId(d.unidades, p.unidadeId);
    const erro = (k) => (e[k] ? `<span class="erro-campo" id="erro-${k}">${esc(e[k])}</span>` : '');
    const campo = (k, rotulo, valor, extra = '') => `
      <div class="campo ${e[k] ? 'com-erro' : ''}">
        <label for="f-${k}">${rotulo}</label>
        <input id="f-${k}" name="${k}" value="${esc(valor)}" ${e[k] ? `aria-invalid="true" aria-describedby="erro-${k}"` : ''} ${extra}>
        ${erro(k)}
      </div>`;
    const turnosGrade = R.TURNOS.map(([t, , curto]) => `
      <tr><th scope="row">${curto[0].toUpperCase()}${curto.slice(1)}<span class="sub">${m.horarios[t]}</span></th>
        ${R.DIAS.map(([dia, nomeDia]) => {
          const s = `${dia}-${t}`;
          return `<td><label class="marca"><input type="checkbox" name="horario" value="${s}" ${p.horario.includes(s) ? 'checked' : ''}><span class="sr">${nomeDia} ${curto}</span></label></td>`;
        }).join('')}</tr>`).join('');
    const turnosNoSemestre = p.id ? d.alocacoes.filter((a) => a.preceptorId === p.id).length : 0;

    return `
      <div class="fundo" data-acao="fechar"></div>
      <aside class="gaveta larga" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">
        <div class="gaveta-cab">
          <div>
            <p class="mudo">Ficha do preceptor</p>
            <h2 id="gaveta-titulo">${p.id ? esc(porId(d.preceptores, p.id).nome) : 'Novo preceptor'}</h2>
            ${p.id ? `<p class="mudo">${plural(turnosNoSemestre, 'turno com grupo', 'turnos com grupo')} no semestre</p>` : ''}
          </div>
          <button type="button" class="fechar" id="fechar-gaveta" data-acao="fechar" aria-label="Fechar">×</button>
        </div>
        ${Object.keys(e).length ? '<div class="aviso erro" role="alert">Corrija os campos marcados.</div>' : ''}
        <form id="form-ficha" data-form="preceptor" novalidate>
          <fieldset>
            <legend>Dados pessoais</legend>
            <div class="campos">
              ${campo('nome', 'Nome completo', p.nome, 'autocomplete="off" class="largo"')}
              ${campo('cpf', 'CPF', p.cpf, 'inputmode="numeric" placeholder="000.000.000-00"')}
              ${campo('email', 'E-mail para contato', p.email, 'type="email"')}
              ${campo('celular', 'Telefone celular', p.celular, 'inputmode="tel"')}
              ${campo('fixo', 'Telefone fixo', p.fixo, 'inputmode="tel"')}
            </div>
          </fieldset>
          <fieldset>
            <legend>Formação</legend>
            <div class="campos">
              ${campo('graduacao', 'Graduação', p.graduacao)}
              ${campo('crm', 'Registro profissional (CRM-MA)', p.crm, 'inputmode="numeric"')}
              ${campo('especialidade', 'Especialidade lato sensu', p.especialidade)}
              ${campo('matricula', 'Matrícula Uniceuma', p.matricula)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Endereço</legend>
            <div class="campos">
              ${campo('endereco', 'Endereço', p.endereco, 'class="largo"')}
              ${campo('bairro', 'Bairro', p.bairro)}
              ${campo('cep', 'CEP', p.cep, 'inputmode="numeric"')}
              ${campo('cidade', 'Cidade', p.cidade)}
              ${campo('uf', 'UF', p.uf, 'maxlength="2"')}
            </div>
          </fieldset>
          <fieldset>
            <legend>Campo de estágio</legend>
            <div class="campos">
              <div class="campo ${e.moduloId ? 'com-erro' : ''}">
                <label for="f-moduloId">Módulo</label>
                <select id="f-moduloId" name="moduloId" data-mudar="ficha">
                  ${d.modulos.map((x) => `<option value="${x.id}" ${p.moduloId === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}
                </select>${erro('moduloId')}
              </div>
              <div class="campo ${e.unidadeId ? 'com-erro' : ''}">
                <label for="f-unidadeId">Unidade concedente</label>
                <select id="f-unidadeId" name="unidadeId" data-mudar="ficha">
                  <option value="">Escolha</option>
                  ${d.unidades.map((u) => `<option value="${u.id}" ${p.unidadeId === u.id ? 'selected' : ''}>${esc(u.nome)} · ${esc(u.municipio)}</option>`).join('')}
                </select>${erro('unidadeId')}
              </div>
              <div class="campo ${e.setor ? 'com-erro' : ''}">
                <label for="f-setor">Setor</label>
                <select id="f-setor" name="setor" ${unidade ? '' : 'disabled'}>
                  <option value="">${unidade ? 'Escolha' : 'Escolha a unidade antes'}</option>
                  ${unidade ? unidade.setores.map((s) => `<option ${p.setor === s ? 'selected' : ''}>${esc(s)}</option>`).join('') : ''}
                </select>${erro('setor')}
              </div>
            </div>
            <div class="campo ${e.horario ? 'com-erro' : ''}">
              <span class="rotulo" id="rotulo-horario">Horário de preceptoria</span>
              <table class="grade-horario" aria-labelledby="rotulo-horario">
                <thead><tr><th></th>${R.DIAS.map(([, , abrev]) => `<th scope="col">${abrev}</th>`).join('')}</tr></thead>
                <tbody>${turnosGrade}</tbody>
              </table>
              ${erro('horario')}
            </div>
          </fieldset>
          <fieldset>
            <legend>Vínculo com a SES</legend>
            <div class="radios">
              <span>Trabalha em unidade de saúde da SES?</span>
              <label><input type="radio" name="ses" value="nao" ${p.ses.trabalha ? '' : 'checked'} data-mudar="ficha"> Não</label>
              <label><input type="radio" name="ses" value="sim" ${p.ses.trabalha ? 'checked' : ''} data-mudar="ficha"> Sim</label>
            </div>
            ${p.ses.trabalha ? `<div class="campos">
              ${campo('sesUnidade', 'Unidade', p.ses.unidade)}
              ${campo('sesDias', 'Dias da semana', p.ses.dias)}
              ${campo('sesHorario', 'Horário de trabalho', p.ses.horario)}
            </div>` : ''}
          </fieldset>
          <div class="acoes-form">
            <button type="submit" class="btn">Salvar ficha</button>
            <button type="button" class="btn sec" data-acao="fechar">Cancelar</button>
          </div>
        </form>
      </aside>`;
  }

  function lerFicha(form) {
    const f = new FormData(form);
    const v = (k) => String(f.get(k) || '').trim();
    const dados = {
      ...ui.rascunho,
      nome: v('nome'), cpf: v('cpf'), email: v('email'), celular: v('celular'), fixo: v('fixo'),
      graduacao: v('graduacao'), crm: v('crm'), especialidade: v('especialidade'), matricula: v('matricula'),
      endereco: v('endereco'), bairro: v('bairro'), cep: v('cep'), cidade: v('cidade'), uf: v('uf').toUpperCase(),
      moduloId: v('moduloId'), unidadeId: v('unidadeId'), setor: v('setor'), horario: f.getAll('horario'),
      ses: f.get('ses') === 'sim'
        ? { trabalha: true, unidade: v('sesUnidade') || ui.rascunho.ses.unidade, dias: v('sesDias') || ui.rascunho.ses.dias, horario: v('sesHorario') || ui.rascunho.ses.horario }
        : { trabalha: false, unidade: '', dias: '', horario: '' },
    };
    const u = porId(d.unidades, dados.unidadeId);
    if (!u || !u.setores.includes(dados.setor)) dados.setor = u && u.setores.includes(dados.setor) ? dados.setor : '';
    return dados;
  }

  function descreverDivisao(tamanhos) {
    const qtd = {};
    tamanhos.forEach((n) => { qtd[n] = (qtd[n] || 0) + 1; });
    return Object.keys(qtd).sort((a, b) => b - a).map((n) => `${qtd[n]} de ${n}`).join(' e ');
  }

  function vTurmas() {
    const t = porId(d.turmas, ui.turmaId);
    const alunos = d.alunos.filter((a) => a.turmaId === t.id);
    const grupos = R.gruposDaTurma(d, t.id);
    const sugestao = R.sugerirDivisao(alunos.length);
    const semGrupo = alunos.filter((a) => !a.grupoId);
    const modAtual = porId(d.modulos, R.moduloDaTurma(d, ui.rodizioId, t.id) || '');

    const opcoes = (aluno) => `
      <select data-mudar="mover" data-aluno="${aluno.id}" aria-label="Grupo de ${esc(aluno.nome)}">
        <option value="">Sem grupo</option>
        ${grupos.map((g) => {
          const n = R.alunosDoGrupo(d, g.id).length;
          const cheio = n >= R.MAX_ALUNOS_GRUPO && aluno.grupoId !== g.id;
          return `<option value="${g.id}" ${aluno.grupoId === g.id ? 'selected' : ''} ${cheio ? 'disabled' : ''}>${g.id}${cheio ? ' (cheio)' : ` (${n}/${R.MAX_ALUNOS_GRUPO})`}</option>`;
        }).join('')}
      </select>`;
    const linhaAluno = (a) => `<li><span class="aluno"><span>${esc(a.nome)}</span><span class="sub">Matrícula ${esc(a.matricula || '—')}</span></span>${opcoes(a)}</li>`;

    const cartoes = grupos.map((g) => {
      const membros = R.alunosDoGrupo(d, g.id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return `<article class="grupo">
        <header><h4>Grupo ${g.id}</h4><span class="mudo">${membros.length} de ${R.MAX_ALUNOS_GRUPO}</span></header>
        <ul class="membros">${membros.map(linhaAluno).join('') || '<li class="mudo">Grupo vazio</li>'}</ul>
      </article>`;
    }).join('');

    return `
      <section class="secao">
        ${seletor('turma', d.turmas.map((x) => [x.id, esc(x.nome)]), t.id, 'Turma')}
        <div>
          <h2>${esc(t.nome)}</h2>
          <p class="mudo">${alunos.length} alunos · ${grupos.length} grupos · no máximo ${R.MAX_ALUNOS_GRUPO} alunos por grupo, fixos no semestre${modAtual ? ` · no rodízio ${porId(d.rodizios, ui.rodizioId).ordem}: ${esc(modAtual.nome)}` : ''}</p>
        </div>
        <p class="sugestao">Para ${alunos.length} alunos, o ideal são ${sugestao.length} grupos (${descreverDivisao(sugestao)}).
          ${grupos.length < sugestao.length ? `Falta criar ${plural(sugestao.length - grupos.length, 'grupo', 'grupos')}. <button type="button" class="link" data-acao="criar-grupo">Criar grupo</button>` : ''}</p>
      </section>
      ${semGrupo.length ? `<section class="secao destaque">
        <h3>Alunos sem grupo</h3>
        <p class="mudo">Ficam sem escala até entrar num grupo. Grupos cheios aparecem bloqueados na lista.</p>
        <ul class="membros">${semGrupo.map(linhaAluno).join('')}</ul>
      </section>` : ''}
      <section class="secao"><div class="grupos">${cartoes}</div></section>
      <section class="secao">
        <h3>Cadastrar aluno na ${esc(t.nome)}</h3>
        <form class="form-aluno" data-form="aluno">
          <div class="campo"><label for="novo-nome">Nome completo</label><input id="novo-nome" name="nome" autocomplete="off"></div>
          <div class="campo"><label for="novo-matricula">Matrícula</label><input id="novo-matricula" name="matricula" autocomplete="off"></div>
          <div class="campo"><label for="novo-cpf">CPF</label><input id="novo-cpf" name="cpf" inputmode="numeric" autocomplete="off"></div>
          <button type="submit" class="btn">Adicionar</button>
        </form>
      </section>`;
  }

  function vUnidades() {
    const linhas = d.unidades.map((u) => `
      <tr>
        <td><b>${esc(u.nome)}</b></td><td>${esc(u.municipio)}</td><td>${esc(u.esfera)}</td>
        <td>${esc(u.setores.join(', '))}</td>
        <td class="num">${d.preceptores.filter((p) => p.unidadeId === u.id).length}</td>
      </tr>`).join('');
    return `
      <section class="secao">
        <div class="tabela"><table>
          <thead><tr><th>Unidade concedente</th><th>Município</th><th>Esfera</th><th>Setores</th><th class="num">Preceptores</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table></div>
      </section>`;
  }

  function vPeriodo() {
    const erros = R.validarRotacao(d);
    const rotacao = d.turmas.map((t) => `
      <tr><th scope="row">${esc(t.nome)}</th>
        ${d.rodizios.map((r) => `<td>${esc((porId(d.modulos, R.moduloDaTurma(d, r.id, t.id) || '') || { nome: '—' }).nome)}</td>`).join('')}</tr>`).join('');
    return `
      <section class="secao">
        <h2>${esc(d.curso)} · Internato · ${esc(d.periodoCurso)} · Semestre ${esc(d.semestre)}</h2>
      </section>
      <section class="secao">
        <h3>Rodízios</h3>
        <div class="tabela"><table>
          <thead><tr><th>Rodízio</th><th>Início</th><th>Fim</th><th class="num">Semanas</th></tr></thead>
          <tbody>${d.rodizios.map((r) => `<tr><td>Rodízio ${r.ordem}</td><td>${data(r.inicio)}</td><td>${data(r.fim)}</td><td class="num">${r.semanas}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>
      <section class="secao">
        <h3>Rotação das turmas</h3>
        <div class="tabela"><table>
          <thead><tr><th>Turma</th>${d.rodizios.map((r) => `<th>Rodízio ${r.ordem}</th>`).join('')}</tr></thead>
          <tbody>${rotacao}</tbody>
        </table></div>
        ${erros.length ? `<div class="aviso erro">${erros.map(esc).join('<br>')}</div>` : '<p class="mudo">Cada turma passa uma vez por cada módulo no semestre.</p>'}
      </section>
      <section class="secao">
        <h3>Módulos</h3>
        <div class="tabela"><table>
          <thead><tr><th>Módulo</th><th class="num">Horas por turno</th><th>Manhã</th><th>Tarde</th><th class="num">Meta no rodízio</th></tr></thead>
          <tbody>${d.modulos.map((m) => `<tr><td>${esc(m.nome)}</td><td class="num">${m.horasTurno} h</td><td>${m.horarios.m}</td><td>${m.horarios.t}</td><td class="num">${m.metaHoras} h</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;
  }

  // Relações de alunos por grupo

  function vRelacoes() {
    const STATUS = { em_dia: ['', 'Em dia'], desatualizada: ['txt-aviso', 'Mudou'], nao_emitida: ['mudo', 'Não emitida'] };
    const lista = R.preceptoresDoModulo(d, ui.filtroRel).filter((p) => R.statusRelacao(d, p.id) !== 'sem_grupos');
    if (!lista.some((p) => p.id === ui.preceptorRel)) {
      const primeiro = lista.find((p) => R.statusRelacao(d, p.id) === 'desatualizada') || lista[0];
      ui.preceptorRel = primeiro && primeiro.id;
    }
    const itens = lista.map((p) => {
      const [cls, rot] = STATUS[R.statusRelacao(d, p.id)];
      return `<li><button type="button" class="item-lista" aria-pressed="${p.id === ui.preceptorRel}" data-acao="relacao" data-id="${p.id}">
        <span>${esc(p.nome)}</span><span class="${cls} pequeno">${rot}</span></button></li>`;
    }).join('');

    let doc = '<p class="mudo">Nenhum preceptor com grupos neste módulo.</p>';
    const p = ui.preceptorRel && porId(d.preceptores, ui.preceptorRel);
    if (p) {
      const rel = R.relacaoPreceptor(d, p.id);
      const emitidas = R.relacoesDo(d, p.id);
      const ultima = emitidas[emitidas.length - 1];
      const st = R.statusRelacao(d, p.id);
      const mudancas = ultima ? d.trocas.filter((t) => t.quando > ultima.quando && (t.preceptorId === p.id || t.de === p.id || t.para === p.id)) : [];
      const carga = rel.cargaIndividual ? (rel.cargaIndividual.min === rel.cargaIndividual.max ? `${rel.cargaIndividual.max} h` : `de ${rel.cargaIndividual.min} a ${rel.cargaIndividual.max} h`) : '—';
      const ficha = [
        ['Preceptor(a)', rel.preceptor], ['CRM-MA', rel.crm || '—'], ['Disciplina', rel.modulo],
        ['Unidade concedente', `${rel.unidade}, ${rel.municipio}`], ['Setor', rel.setor],
        ['Curso', `${rel.curso}, ${rel.periodo}`], ['Semestre', rel.semestre],
        ['Data inicial e final', rel.inicio ? `${data(rel.inicio)} a ${data(rel.fim)}` : '—'],
        ['Nº de grupos', rel.totalGrupos], ['Nº de alunos', rel.totalAlunos],
        ['Dias da semana', rel.dias], ['Horário', rel.horarios],
        ['Carga horária individual', carga], ['Carga horária total', `${rel.cargaTotal} h`], ['Nº de semanas', rel.semanas],
      ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
      const grupos = rel.grupos.map((g) => `
        <section class="doc-grupo">
          <h4>Grupo ${g.grupo}</h4>
          <p>${data(g.inicio)} a ${data(g.fim)} · ${esc(g.dias)}</p>
          <table>
            <thead><tr><th class="num">Nº</th><th>Nome completo</th><th>Matrícula</th><th>CPF</th></tr></thead>
            <tbody>${g.alunos.map((a, i) => `<tr><td class="num">${i + 1}</td><td>${esc(a.nome)}</td><td>${esc(a.matricula)}</td><td>${esc(a.cpf)}</td></tr>`).join('')}</tbody>
          </table>
        </section>`).join('');

      doc = `
        <div class="barra-doc">
          <p>${st === 'em_dia' ? `Versão ${ultima.versao}, emitida em ${dataHora(ultima.quando)}.`
            : st === 'desatualizada' ? `<span class="txt-aviso">A escala mudou depois da versão ${ultima.versao}.</span>`
              : 'Ainda não emitida.'}</p>
          ${st !== 'em_dia' ? `<button type="button" class="btn" data-acao="emitir" data-id="${p.id}">Emitir versão ${emitidas.length + 1}</button>` : ''}
        </div>
        ${mudancas.length ? `<ul class="mudancas">${mudancas.map((t) => `<li>${dataHora(t.quando)} · Rodízio ${porId(d.rodizios, t.rodizioId).ordem}, ${R.rotuloSlot(t.slot)}: ${
          t.tipo === 'preceptor' ? `grupo ${t.grupoId} passou de ${esc(nomeP(t.de))} para ${esc(nomeP(t.para))}` : `${t.de ? `grupo ${t.de}` : 'turno livre'} → ${t.para ? `grupo ${t.para}` : 'turno livre'}`}</li>`).join('')}</ul>` : ''}
        <article class="doc" aria-label="Relação de alunos por grupo">
          <header class="doc-cab">
            <p>Coordenação de Estágio · Coordenação de Medicina</p>
            <h3>Relação de alunos por grupo</h3>
          </header>
          <dl class="doc-ficha">${ficha}</dl>
          ${grupos}
          <div class="assinaturas"><span>Coordenador de Estágio</span><span>Coordenador do Curso</span></div>
        </article>
        <p class="dica">No sistema final, esta relação sai em PDF a partir do modelo .docx da coordenação.</p>`;
    }

    return `
      <div class="duas-colunas">
        <section class="secao">
          <div class="campo-inline">
            <label for="filtro-rel">Módulo</label>
            <select id="filtro-rel" data-mudar="filtro-rel">
              ${d.modulos.map((m) => `<option value="${m.id}" ${ui.filtroRel === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}
            </select>
          </div>
          <ul class="lista-lateral">${itens}</ul>
        </section>
        <section class="secao doc-area">${doc}</section>
      </div>`;
  }

  // Desenho e eventos

  const VISTAS = { painel: vPainel, escalas: vEscalas, cadastros: vCadastros, relacoes: vRelacoes };

  function render() {
    const nErros = R.pendencias(d, d.rodizioAtual).filter((p) => p.nivel === 'erro').length;
    document.getElementById('abas').innerHTML = ABAS.map(([id, nome]) => `
      <button type="button" role="tab" aria-selected="${ui.aba === id}" data-acao="aba" data-id="${id}">
        ${nome}${id === 'painel' && nErros ? `<span class="contador" aria-label="${nErros} erros">${nErros}</span>` : ''}</button>`).join('');
    document.getElementById('contexto').textContent = `${d.curso} · Internato · ${d.periodoCurso} · Semestre ${d.semestre}`;
    const aviso = ui.aviso && !ui.aviso.naGaveta ? `<div class="aviso ${ui.aviso.nivel}" role="status">${esc(ui.aviso.texto)}</div>` : '';
    document.getElementById('conteudo').innerHTML = aviso + VISTAS[ui.aba]();
    const gavetaAberta = Boolean(document.querySelector('.gaveta'));
    document.getElementById('gaveta').innerHTML = ui.ficha ? vFicha() : ui.celula ? vGavetaCelula() : '';
    document.body.classList.toggle('travado', Boolean(ui.ficha || ui.celula));
    if (!gavetaAberta && (ui.ficha || ui.celula)) document.getElementById('fechar-gaveta').focus();
  }

  function abrirFicha(id) {
    ui.ficha = id || 'novo';
    ui.rascunho = id ? JSON.parse(JSON.stringify(porId(d.preceptores, id))) : novoRascunho();
    ui.erros = {};
    ui.aviso = null;
  }

  const acoes = {
    aba({ id }) {
      ui.aba = id; ui.celula = null; ui.ficha = null; ui.aviso = null;
      try { history.replaceState(null, '', `#${id}`); } catch (e) { /* sem histórico */ }
      window.scrollTo(0, 0);
    },
    ir({ alvo }) {
      const a = JSON.parse(alvo);
      Object.assign(ui, { aba: a.aba, aviso: null, celula: null, ficha: null });
      if (a.rodizioId) ui.rodizioId = a.rodizioId;
      if (a.moduloId) ui.moduloId = a.moduloId;
      if (a.sub) ui.sub = a.sub;
      if (a.turmaId) ui.turmaId = a.turmaId;
      if (a.preceptorId && a.aba === 'relacoes') {
        ui.preceptorRel = a.preceptorId;
        ui.filtroRel = porId(d.preceptores, a.preceptorId).moduloId;
      }
      if (a.slot) ui.celula = { preceptorId: a.preceptorId, slot: a.slot };
      if (a.ficha) abrirFicha(a.ficha);
      window.scrollTo(0, 0);
    },
    rodizio({ id }) { ui.rodizioId = id; ui.celula = null; ui.aviso = null; },
    modulo({ id }) { ui.moduloId = id; ui.celula = null; ui.aviso = null; },
    sub({ id }) { ui.sub = id; ui.aviso = null; },
    turma({ id }) { ui.turmaId = id; ui.aviso = null; },
    relacao({ id }) { ui.preceptorRel = id; ui.aviso = null; },
    celula({ p, slot }) { ui.celula = { preceptorId: p, slot }; ui.aviso = null; },
    fechar() { ui.celula = null; ui.ficha = null; ui.erros = {}; if (ui.aviso && ui.aviso.naGaveta) ui.aviso = null; },
    'escolher-grupo'({ id }) {
      const cel = { rodizioId: ui.rodizioId, ...ui.celula };
      const r = R.definirGrupo(d, cel, id, agora());
      if (!r.ok) { ui.aviso = { nivel: 'erro', naGaveta: true, texto: r.avisos.map((a) => a.texto).join(' ') }; return; }
      ui.celula = null;
      aplicar(r, `${nomeP(cel.preceptorId)}, ${R.rotuloSlot(cel.slot)}: ${id ? `grupo ${id}` : 'turno livre'}.`);
      return true;
    },
    passar({ id }) {
      const cel = { rodizioId: ui.rodizioId, ...ui.celula };
      const grupo = R.alocacaoEm(d, cel.rodizioId, cel.preceptorId, cel.slot).grupoId;
      const r = R.trocarPreceptor(d, cel, id, agora());
      if (!r.ok) { ui.aviso = { nivel: 'erro', naGaveta: true, texto: r.motivo }; return; }
      ui.celula = null;
      aplicar(r, `O grupo ${grupo} passou para ${nomeP(id)} (${R.rotuloSlot(cel.slot)}).`);
      return true;
    },
    'novo-preceptor'() { abrirFicha(null); },
    'editar-preceptor'({ id }) { abrirFicha(id); },
    'criar-grupo'() {
      const r = R.criarGrupo(d, ui.turmaId);
      aplicar(r, `Grupo ${r.grupoId} criado. Mova alunos para ele pela lista de cada aluno.`);
      return true;
    },
    emitir({ id }) {
      const versao = R.relacoesDo(d, id).length + 1;
      aplicar(R.emitirRelacao(d, id, agora()), `Versão ${versao} da relação de ${nomeP(id)} emitida.`);
      return true;
    },
    restaurar() {
      d = exemploInicial();
      salvar();
      Object.assign(ui, { celula: null, ficha: null, rodizioId: d.rodizioAtual, aviso: { nivel: 'ok', texto: 'Dados de exemplo restaurados.' } });
    },
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT') return; // rádios da ficha são tratados no change
    const feito = acoes[el.dataset.acao](el.dataset);
    if (!feito) render();
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    const tipo = el.dataset && el.dataset.mudar;
    if (tipo === 'mover') {
      const aluno = porId(d.alunos, el.dataset.aluno);
      aplicar(R.moverAluno(d, aluno.id, el.value), el.value ? `${aluno.nome} agora está no grupo ${el.value}.` : `${aluno.nome} ficou sem grupo.`);
    } else if (tipo === 'filtro-modulo') {
      ui.filtroModulo = el.value; render();
    } else if (tipo === 'filtro-rel') {
      ui.filtroRel = el.value; ui.preceptorRel = null; render();
    } else if (tipo === 'ficha') {
      ui.rascunho = lerFicha(document.getElementById('form-ficha'));
      render();
    }
  });

  document.addEventListener('input', (ev) => {
    if (ev.target.id !== 'busca') return;
    ui.busca = ev.target.value;
    render();
    const campo = document.getElementById('busca');
    campo.focus();
    campo.setSelectionRange(campo.value.length, campo.value.length);
  });

  document.addEventListener('submit', (ev) => {
    const form = ev.target;
    ev.preventDefault();
    if (form.dataset.form === 'aluno') {
      const f = new FormData(form);
      const nome = String(f.get('nome') || '').trim();
      aplicar(R.adicionarAluno(d, { nome, matricula: f.get('matricula'), cpf: f.get('cpf') }, ui.turmaId), `${nome} cadastrado(a). Escolha o grupo em "Alunos sem grupo".`);
    } else if (form.dataset.form === 'preceptor') {
      const dados = lerFicha(form);
      const r = R.salvarPreceptor(d, dados);
      if (!r.ok) {
        ui.rascunho = dados;
        ui.erros = r.erros;
        render();
        const primeiro = document.querySelector('.gaveta [aria-invalid="true"]');
        if (primeiro) primeiro.focus();
        return;
      }
      ui.ficha = null; ui.erros = {};
      aplicar(r, `Ficha de ${dados.nome} salva.`);
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && (ui.celula || ui.ficha)) { acoes.fechar(); render(); }
  });

  render();
})();
