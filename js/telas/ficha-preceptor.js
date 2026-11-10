// Ficha do preceptor: gaveta com o formulário de cadastro, para um preceptor novo ou já existente.
// Enquanto a ficha está aberta, o que a pessoa digita fica em ui.rascunho. Só vai para os dados ao salvar.
import { estado, aplicar } from '../estado.js';
import { DIAS, TURNOS, porId, salvarPreceptor } from '../dominio/index.js';
import { gaveta, caixaDeAviso, opcoesDeModulo } from '../componentes.js';
import { escapar, plural, primeiraMaiuscula } from '../util.js';

// Abre a ficha do preceptor. Sem id, abre uma ficha em branco.
export function abrirFicha(preceptorId) {
  const { dados, ui } = estado;
  ui.rascunho = preceptorId ? structuredClone(porId(dados.preceptores, preceptorId)) : fichaEmBranco();
  ui.erros = {};
  ui.aviso = null;
}

function fichaEmBranco() {
  const { dados, ui } = estado;
  return {
    nome: '', cpf: '', email: '', celular: '', fixo: '',
    graduacao: 'Medicina', crm: '', especialidade: '', matricula: '',
    endereco: '', bairro: '', cep: '', cidade: 'São Luís', uf: 'MA',
    moduloId: ui.filtroModulo || dados.modulos[0].id,
    unidadeId: '',
    setor: '',
    horario: [],
    ses: { trabalha: false, unidade: '', dias: '', horario: '' },
  };
}

export function gavetaDaFicha() {
  const { dados, ui } = estado;
  const ficha = ui.rascunho;
  const erros = ui.erros;
  const existente = ficha.id && porId(dados.preceptores, ficha.id);
  const turnosComGrupo = existente ? dados.alocacoes.filter((a) => a.preceptorId === ficha.id).length : 0;
  const temErros = Object.keys(erros).length > 0;

  return gaveta({
    larga: true,
    sobretitulo: 'Ficha do preceptor',
    titulo: existente ? escapar(existente.nome) : 'Novo preceptor',
    subtitulo: existente ? `${plural(turnosComGrupo, 'turno com grupo', 'turnos com grupo')} no semestre` : '',
    conteudo: `
      ${temErros ? caixaDeAviso({ nivel: 'erro', texto: 'Corrija os campos marcados.' }, 'alert') : ''}
      <form id="form-ficha" data-form="salvar-preceptor" novalidate>
        ${secaoDadosPessoais(ficha, erros)}
        ${secaoFormacao(ficha, erros)}
        ${secaoEndereco(ficha, erros)}
        ${secaoCampoDeEstagio(dados, ficha, erros)}
        ${secaoVinculoComSes(ficha, erros)}
        <div class="acoes-form">
          <button type="submit" class="btn">Salvar ficha</button>
          <button type="button" class="btn sec" data-acao="fechar">Cancelar</button>
        </div>
      </form>`,
  });
}

// Partes do formulário

function secaoDadosPessoais(ficha, erros) {
  return `
    <fieldset>
      <legend>Dados pessoais</legend>
      <div class="campos">
        ${campoDeTexto('nome', 'Nome completo', ficha.nome, erros, 'autocomplete="off" class="largo"')}
        ${campoDeTexto('cpf', 'CPF', ficha.cpf, erros, 'inputmode="numeric" placeholder="000.000.000-00"')}
        ${campoDeTexto('email', 'E-mail para contato', ficha.email, erros, 'type="email"')}
        ${campoDeTexto('celular', 'Telefone celular', ficha.celular, erros, 'inputmode="tel"')}
        ${campoDeTexto('fixo', 'Telefone fixo', ficha.fixo, erros, 'inputmode="tel"')}
      </div>
    </fieldset>`;
}

function secaoFormacao(ficha, erros) {
  return `
    <fieldset>
      <legend>Formação</legend>
      <div class="campos">
        ${campoDeTexto('graduacao', 'Graduação', ficha.graduacao, erros)}
        ${campoDeTexto('crm', 'Registro profissional (CRM-MA)', ficha.crm, erros, 'inputmode="numeric"')}
        ${campoDeTexto('especialidade', 'Especialidade lato sensu', ficha.especialidade, erros)}
        ${campoDeTexto('matricula', 'Matrícula Uniceuma', ficha.matricula, erros)}
      </div>
    </fieldset>`;
}

function secaoEndereco(ficha, erros) {
  return `
    <fieldset>
      <legend>Endereço</legend>
      <div class="campos">
        ${campoDeTexto('endereco', 'Endereço', ficha.endereco, erros, 'class="largo"')}
        ${campoDeTexto('bairro', 'Bairro', ficha.bairro, erros)}
        ${campoDeTexto('cep', 'CEP', ficha.cep, erros, 'inputmode="numeric"')}
        ${campoDeTexto('cidade', 'Cidade', ficha.cidade, erros)}
        ${campoDeTexto('uf', 'UF', ficha.uf, erros, 'maxlength="2"')}
      </div>
    </fieldset>`;
}

// Módulo, unidade, setor e horário de preceptoria.
// Mudar o módulo ou a unidade redesenha a ficha (a lista de setores depende da unidade).
function secaoCampoDeEstagio(dados, ficha, erros) {
  const modulo = porId(dados.modulos, ficha.moduloId) || dados.modulos[0];
  const unidade = porId(dados.unidades, ficha.unidadeId);

  const opcoesDeUnidade = dados.unidades
    .map((u) => opcao(u.id, `${escapar(u.nome)} · ${escapar(u.municipio)}`, ficha.unidadeId === u.id))
    .join('');
  const opcoesDeSetor = unidade
    ? unidade.setores.map((setor) => opcao(setor, escapar(setor), ficha.setor === setor)).join('')
    : '';

  return `
    <fieldset>
      <legend>Campo de estágio</legend>
      <div class="campos">
        ${campo('moduloId', 'Módulo', erros, `
          <select id="f-moduloId" name="moduloId" data-mudar="atualizar-ficha" ${marcarErro('moduloId', erros)}>
            ${opcoesDeModulo(dados, ficha.moduloId)}
          </select>`)}
        ${campo('unidadeId', 'Unidade concedente', erros, `
          <select id="f-unidadeId" name="unidadeId" data-mudar="atualizar-ficha" ${marcarErro('unidadeId', erros)}>
            <option value="">Escolha</option>
            ${opcoesDeUnidade}
          </select>`)}
        ${campo('setor', 'Setor', erros, `
          <select id="f-setor" name="setor" ${unidade ? '' : 'disabled'} ${marcarErro('setor', erros)}>
            <option value="">${unidade ? 'Escolha' : 'Escolha a unidade antes'}</option>
            ${opcoesDeSetor}
          </select>`)}
      </div>
      ${gradeDeHorario(modulo, ficha, erros)}
    </fieldset>`;
}

// Tabela de caixinhas: uma linha por turno (manhã, tarde), uma coluna por dia.
function gradeDeHorario(modulo, ficha, erros) {
  const linhas = TURNOS.map((turno) => {
    const caixas = DIAS.map((dia) => {
      const slot = `${dia.id}-${turno.id}`;
      return `
        <td>
          <label class="marca">
            <input type="checkbox" name="horario" value="${slot}" ${ficha.horario.includes(slot) ? 'checked' : ''}>
            <span class="sr">${dia.nome} ${turno.apelido}</span>
          </label>
        </td>`;
    }).join('');
    return `
      <tr>
        <th scope="row">${primeiraMaiuscula(turno.apelido)}<span class="sub">${escapar(modulo.horarios[turno.id])}</span></th>
        ${caixas}
      </tr>`;
  }).join('');

  return `
    <div class="campo ${erros.horario ? 'com-erro' : ''}">
      <span class="rotulo" id="rotulo-horario">Horário de preceptoria</span>
      <table class="grade-horario" aria-labelledby="rotulo-horario">
        <thead><tr><th></th>${DIAS.map((dia) => `<th scope="col">${dia.abreviado}</th>`).join('')}</tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      ${mensagemDeErro('horario', erros)}
    </div>`;
}

function secaoVinculoComSes(ficha, erros) {
  const trabalha = ficha.ses.trabalha;
  const camposDaSes = `
    <div class="campos">
      ${campoDeTexto('sesUnidade', 'Unidade', ficha.ses.unidade, erros)}
      ${campoDeTexto('sesDias', 'Dias da semana', ficha.ses.dias, erros)}
      ${campoDeTexto('sesHorario', 'Horário de trabalho', ficha.ses.horario, erros)}
    </div>`;

  return `
    <fieldset>
      <legend>Vínculo com a SES</legend>
      <div class="radios">
        <span>Trabalha em unidade de saúde da SES?</span>
        <label><input type="radio" name="ses" value="nao" ${trabalha ? '' : 'checked'} data-mudar="atualizar-ficha"> Não</label>
        <label><input type="radio" name="ses" value="sim" ${trabalha ? 'checked' : ''} data-mudar="atualizar-ficha"> Sim</label>
      </div>
      ${trabalha ? camposDaSes : ''}
    </fieldset>`;
}

// Peças de formulário

// Um campo com rótulo em cima e, se houver, a mensagem de erro embaixo.
function campo(nome, rotulo, erros, controle) {
  return `
    <div class="campo ${erros[nome] ? 'com-erro' : ''}">
      <label for="f-${nome}">${rotulo}</label>
      ${controle}
      ${mensagemDeErro(nome, erros)}
    </div>`;
}

function campoDeTexto(nome, rotulo, valor, erros, atributos = '') {
  const entrada = `<input id="f-${nome}" name="${nome}" value="${escapar(valor)}" ${marcarErro(nome, erros)} ${atributos}>`;
  return campo(nome, rotulo, erros, entrada);
}

// Uma opção de lista. O valor vem dos dados e é protegido aqui; o texto já deve vir escapado.
const opcao = (valor, texto, escolhida) => `<option value="${escapar(valor)}" ${escolhida ? 'selected' : ''}>${texto}</option>`;

const mensagemDeErro = (nome, erros) =>
  (erros[nome] ? `<span class="erro-campo" id="erro-${nome}">${escapar(erros[nome])}</span>` : '');

// Liga o campo à mensagem de erro, para o leitor de tela anunciar o problema.
const marcarErro = (nome, erros) => (erros[nome] ? `aria-invalid="true" aria-describedby="erro-${nome}"` : '');

// Lê o formulário e devolve a ficha preenchida.
function lerFormulario(form) {
  const rascunho = estado.ui.rascunho;
  const valores = new FormData(form);
  const valor = (nome) => String(valores.get(nome) || '').trim();
  // Os campos da SES só aparecem depois de marcar "Sim". Enquanto o campo não está na tela, vale o rascunho;
  // quando está, vale o que está escrito nele, mesmo vazio (assim, apagar um campo apaga de verdade).
  const daSes = (nome, doRascunho) => (valores.has(nome) ? valor(nome) : doRascunho);

  const ficha = {
    ...rascunho,
    nome: valor('nome'),
    cpf: valor('cpf'),
    email: valor('email'),
    celular: valor('celular'),
    fixo: valor('fixo'),
    graduacao: valor('graduacao'),
    crm: valor('crm'),
    especialidade: valor('especialidade'),
    matricula: valor('matricula'),
    endereco: valor('endereco'),
    bairro: valor('bairro'),
    cep: valor('cep'),
    cidade: valor('cidade'),
    uf: valor('uf').toUpperCase(),
    moduloId: valor('moduloId'),
    unidadeId: valor('unidadeId'),
    setor: valor('setor'),
    horario: valores.getAll('horario'),
    ses: valores.get('ses') === 'sim'
      ? {
        trabalha: true,
        unidade: daSes('sesUnidade', rascunho.ses.unidade),
        dias: daSes('sesDias', rascunho.ses.dias),
        horario: daSes('sesHorario', rascunho.ses.horario),
      }
      : { trabalha: false, unidade: '', dias: '', horario: '' },
  };

  // Se trocou de unidade, o setor escolhido antes pode não existir na nova.
  const unidade = porId(estado.dados.unidades, ficha.unidadeId);
  if (!unidade || !unidade.setores.includes(ficha.setor)) ficha.setor = '';
  return ficha;
}

// Depois de redesenhar, leva o cursor para o primeiro campo com erro.
function focarPrimeiroErro() {
  const campoComErro = document.querySelector('.gaveta [aria-invalid="true"]');
  if (campoComErro) campoComErro.focus();
}

export const acoes = {
  'novo-preceptor'() {
    abrirFicha(null);
  },
  'abrir-ficha'(botao) {
    abrirFicha(botao.dataset.id);
  },
  // Módulo, unidade ou SES mudou: guarda o que já foi digitado e redesenha a ficha.
  'atualizar-ficha'(campoAlterado) {
    estado.ui.rascunho = lerFormulario(campoAlterado.form);
  },
  'salvar-preceptor'(form) {
    const ficha = lerFormulario(form);
    const resultado = salvarPreceptor(estado.dados, ficha);
    if (!resultado.ok) {
      estado.ui.rascunho = ficha;
      estado.ui.erros = resultado.erros;
      return focarPrimeiroErro;
    }
    estado.ui.rascunho = null;
    estado.ui.erros = {};
    aplicar(resultado, `Ficha de ${ficha.nome} salva.`);
    return undefined;
  },
};
