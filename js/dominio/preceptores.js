// Cadastro de preceptores: campos obrigatórios, validação da ficha e gravação.
import { porId, porNome, copiar, novoId, digitos, vazio } from './comum.js';
import { cpfValido, formatarCpf, donoDoCpf } from './cpf.js';

export const preceptoresDoModulo = (dados, moduloId) =>
  dados.preceptores.filter((p) => p.moduloId === moduloId).sort(porNome);

// Campos que o painel cobra quando estão vazios.
const CAMPOS_OBRIGATORIOS = [
  { campo: 'nome', rotulo: 'nome' },
  { campo: 'cpf', rotulo: 'CPF' },
  { campo: 'crm', rotulo: 'CRM' },
  { campo: 'email', rotulo: 'e-mail' },
  { campo: 'celular', rotulo: 'celular' },
  { campo: 'unidadeId', rotulo: 'unidade' },
  { campo: 'setor', rotulo: 'setor' },
];

export const camposFaltando = (preceptor) =>
  CAMPOS_OBRIGATORIOS.filter(({ campo }) => vazio(preceptor[campo])).map(({ rotulo }) => rotulo);

// Confere a ficha. Devolve { nomeDoCampo: 'mensagem de erro' } para cada campo com problema.
export function validarPreceptor(dados, ficha) {
  const erros = {};

  if (vazio(ficha.nome)) erros.nome = 'Informe o nome completo.';

  const donoDoMesmoCpf = donoDoCpf(dados, ficha.cpf, ficha.id);
  if (vazio(ficha.cpf)) erros.cpf = 'Informe o CPF.';
  else if (!cpfValido(ficha.cpf)) erros.cpf = 'CPF inválido. Confira os números.';
  else if (donoDoMesmoCpf === 'preceptor') erros.cpf = 'Já existe um preceptor com este CPF.';
  else if (donoDoMesmoCpf === 'aluno') erros.cpf = 'Este CPF já está cadastrado para um aluno.';

  if (vazio(ficha.crm)) erros.crm = 'Informe o número do CRM-MA.';
  else if (!/^\d{3,7}$/.test(String(ficha.crm).trim())) erros.crm = 'Use só números.';
  else if (crmJaUsado(dados, ficha)) erros.crm = 'Já existe um preceptor com este CRM.';

  if (vazio(ficha.email)) erros.email = 'Informe o e-mail.';
  else if (!/^\S+@\S+\.\S+$/.test(ficha.email)) erros.email = 'E-mail inválido.';

  if (vazio(ficha.celular)) erros.celular = 'Informe o celular.';
  if (ficha.cep && digitos(ficha.cep).length !== 8) erros.cep = 'O CEP tem 8 números.';

  if (vazio(ficha.moduloId)) erros.moduloId = 'Escolha o módulo.';
  if (vazio(ficha.unidadeId)) erros.unidadeId = 'Escolha a unidade.';

  const unidade = porId(dados.unidades, ficha.unidadeId);
  if (!ficha.setor) erros.setor = 'Escolha o setor.';
  else if (unidade && !unidade.setores.includes(ficha.setor)) erros.setor = 'Este setor não é da unidade escolhida.';

  if (!ficha.horario || !ficha.horario.length) erros.horario = 'Marque pelo menos um turno.';
  if (ficha.ses && ficha.ses.trabalha && vazio(ficha.ses.unidade)) erros.sesUnidade = 'Informe a unidade da SES.';

  if (mudouDeModuloComGrupos(dados, ficha)) {
    erros.moduloId = 'Este preceptor tem grupos nas escalas. Retire os grupos antes de mudar o módulo.';
  }
  return erros;
}

const crmJaUsado = (dados, ficha) =>
  dados.preceptores.some((outro) => outro.id !== ficha.id && String(outro.crm).trim() === String(ficha.crm).trim());

function mudouDeModuloComGrupos(dados, ficha) {
  const anterior = ficha.id && porId(dados.preceptores, ficha.id);
  if (!anterior || anterior.moduloId === ficha.moduloId) return false;
  return dados.alocacoes.some((a) => a.preceptorId === ficha.id);
}

// Grava a ficha (nova ou editada). Se o horário mudou e deixou turnos com grupo de fora, avisa.
export function salvarPreceptor(dados, ficha) {
  const erros = validarPreceptor(dados, ficha);
  if (Object.keys(erros).length) return { ok: false, dados, erros, motivo: 'Corrija os campos marcados.' };

  const novosDados = copiar(dados);
  const registro = { ...copiar(ficha), cpf: formatarCpf(ficha.cpf), crm: String(ficha.crm).trim() };
  if (registro.id) {
    const posicao = novosDados.preceptores.findIndex((p) => p.id === registro.id);
    novosDados.preceptores[posicao] = registro;
  } else {
    registro.id = novoId(novosDados.preceptores, 'p');
    novosDados.preceptores.push(registro);
  }

  const turnosFora = novosDados.alocacoes
    .filter((a) => a.preceptorId === registro.id && !registro.horario.includes(a.slot))
    .length;
  return {
    ok: true,
    dados: novosDados,
    id: registro.id,
    alerta: turnosFora ? `${turnosFora} turno(s) com grupo ficaram fora do novo horário. Eles aparecem no painel.` : null,
  };
}
