// O estado do protótipo tem duas partes:
//  - dados: tudo o que seria o banco de dados (preceptores, turmas, escalas...). Fica salvo no navegador.
//  - ui: o que está na tela agora (aba aberta, filtros, gaveta aberta, mensagem). Não é salvo.
import { criarExemploInicial } from './dados-exemplo.js';
import { atualizarAssinaturas, problemasNosDados } from './dominio/index.js';

const CHAVE_NO_NAVEGADOR = 'ceuma-prototipo-estagios-v2';

const AVISO_DADOS_COM_PROBLEMA = {
  nivel: 'aviso',
  texto: 'Os dados salvos neste navegador estavam com problema e não puderam ser abertos. '
    + 'A página está mostrando os dados de exemplo; a próxima alteração vai gravar por cima dos dados antigos.',
};

// Lê os dados salvos no navegador. Devolve { dados, aviso }: o aviso só aparece se os dados salvos estavam estragados.
function carregarDados() {
  let salvo = null;
  try {
    salvo = localStorage.getItem(CHAVE_NO_NAVEGADOR);
  } catch (erro) {
    // Navegador sem armazenamento: começa do exemplo.
  }
  if (!salvo) return { dados: criarExemploInicial(), aviso: null };

  let lidos = null;
  try {
    lidos = JSON.parse(salvo);
  } catch (erro) {
    // Não é um JSON: conta como dados estragados.
  }
  if (problemasNosDados(lidos).length) return { dados: criarExemploInicial(), aviso: AVISO_DADOS_COM_PROBLEMA };

  // Dados salvos antes de as relações guardarem só um resumo: converte e grava na hora,
  // para as cópias antigas de nomes e CPFs saírem do navegador.
  let convertido;
  try {
    convertido = atualizarAssinaturas(lidos);
  } catch (erro) {
    return { dados: criarExemploInicial(), aviso: AVISO_DADOS_COM_PROBLEMA };
  }
  if (convertido.alteradas) {
    try {
      localStorage.setItem(CHAVE_NO_NAVEGADOR, JSON.stringify(convertido.dados));
    } catch (erro) {
      // Não deu para gravar agora: os dados convertidos ficam na memória e são gravados na próxima alteração.
    }
  }
  return { dados: convertido.dados, aviso: null };
}

const carregado = carregarDados();
const dadosIniciais = carregado.dados;

export const estado = {
  dados: dadosIniciais,
  ui: {
    aba: 'painel', // painel, escalas, cadastros ou relacoes

    // Painel e Escalas
    rodizioId: dadosIniciais.rodizioAtual,
    moduloId: dadosIniciais.modulos[0].id,
    turnoAberto: null, // turno clicado na escala, com a gaveta aberta: { preceptorId, slot }

    // Cadastros
    cadastro: 'preceptores', // sub-aba: preceptores, turmas, unidades ou periodo
    filtroModulo: '', // filtro da lista de preceptores ('' = todos)
    busca: '', // busca da lista de preceptores
    rascunho: null, // ficha de preceptor aberta na gaveta (uma cópia, que só vale ao salvar)
    erros: {}, // erros da ficha, por campo
    turmaId: dadosIniciais.turmas[0].id,

    // Relações de alunos
    moduloDasRelacoes: dadosIniciais.modulos[0].id,
    preceptorDaRelacao: null,

    // Mensagem depois de uma ação: { nivel: 'ok' | 'aviso' | 'erro', texto, naGaveta }
    // Ao abrir, mostra o aviso de dados estragados, se for o caso.
    aviso: carregado.aviso,
  },
};

export function salvarDados() {
  try {
    localStorage.setItem(CHAVE_NO_NAVEGADOR, JSON.stringify(estado.dados));
  } catch (erro) {
    // Sem armazenamento: as mudanças valem só até fechar a página.
  }
}

// Recebe o resultado de uma regra do domínio ({ ok, dados, ... }).
// Se deu certo, guarda os dados novos e mostra a mensagem de sucesso (com os alertas, se houver).
// Se não deu, mostra o motivo.
export function aplicar(resultado, mensagemDeSucesso) {
  const { ui } = estado;
  if (!resultado.ok) {
    ui.aviso = { nivel: 'erro', texto: resultado.motivo || 'Não foi possível fazer a alteração.' };
    return;
  }

  estado.dados = resultado.dados;
  salvarDados();
  const alertas = [resultado.alerta, ...(resultado.avisos || []).map((a) => a.texto)].filter(Boolean);
  ui.aviso = mensagemDeSucesso
    ? { nivel: alertas.length ? 'aviso' : 'ok', texto: [mensagemDeSucesso, ...alertas].join(' ') }
    : null;
}

// Fecha a gaveta que estiver aberta (turno da escala ou ficha de preceptor).
export function fecharGavetas() {
  const { ui } = estado;
  ui.turnoAberto = null;
  ui.rascunho = null;
  ui.erros = {};
  if (ui.aviso && ui.aviso.naGaveta) ui.aviso = null;
}

// Joga fora as mudanças salvas no navegador e volta para o exemplo.
export function restaurarExemplo() {
  estado.dados = criarExemploInicial();
  salvarDados();
  fecharGavetas();
  estado.ui.rodizioId = estado.dados.rodizioAtual;
  estado.ui.aviso = { nivel: 'ok', texto: 'Dados de exemplo restaurados.' };
}
