// Pedaços de tela que aparecem em mais de uma aba.
import { porId } from './dominio/index.js';
import { escapar, formatarDiaMes } from './util.js';

// "Medicina · Internato"
// Aparece no topo da página e em Cadastros > Período e rodízios. O curso vem de dados-exemplo.js.
export const descricaoDoCurso = (dados) => `${dados.curso} · Internato`;

export const nomeDoPreceptor = (dados, preceptorId) =>
  (preceptorId ? porId(dados.preceptores, preceptorId).nome : 'ninguém');

// "grupo A1" ou, sem grupo, "turno livre". Devolve texto comum: no HTML, passe por escapar().
export const grupoOuLivre = (grupoId) => (grupoId ? `grupo ${grupoId}` : 'turno livre');

// Uma troca de escala em palavras, já protegida para o HTML:
// "grupo A1 passou de Fulano para Beltrano" (troca de preceptor) ou "grupo A1 → turno livre" (troca de grupo).
export function descreverTroca(dados, troca) {
  if (troca.tipo === 'preceptor') {
    const de = escapar(nomeDoPreceptor(dados, troca.de));
    const para = escapar(nomeDoPreceptor(dados, troca.para));
    return `grupo ${escapar(troca.grupoId)} passou de ${de} para ${para}`;
  }
  return `${escapar(grupoOuLivre(troca.de))} → ${escapar(grupoOuLivre(troca.para))}`;
}

// As opções de uma lista de módulos (<option>), com o módulo escolhido marcado.
export const opcoesDeModulo = (dados, escolhidoId) => dados.modulos
  .map((m) => `<option value="${escapar(m.id)}" ${m.id === escolhidoId ? 'selected' : ''}>${escapar(m.nome)}</option>`)
  .join('');

// Fileira de botões em que só um fica marcado (rodízio, módulo, turma...).
// Cada opção é { id, texto }. O texto pode ter HTML, então escape antes o que vier dos dados.
export function seletor({ acao, rotulo, opcoes, marcado }) {
  const botoes = opcoes.map((opcao) =>
    `<button type="button" aria-pressed="${opcao.id === marcado}" data-acao="${acao}" data-id="${escapar(opcao.id)}">${opcao.texto}</button>`,
  ).join('');
  return `<div class="segmentos" role="group" aria-label="${escapar(rotulo)}">${botoes}</div>`;
}

// Seletor de rodízio, usado no Painel e nas Escalas.
export function seletorDeRodizio(dados, rodizioId) {
  return seletor({
    acao: 'escolher-rodizio',
    rotulo: 'Rodízio',
    marcado: rodizioId,
    opcoes: dados.rodizios.map((r) => ({
      id: r.id,
      texto: `Rodízio ${r.ordem} <span>${escapar(formatarDiaMes(r.inicio))}–${escapar(formatarDiaMes(r.fim))}</span>`,
    })),
  });
}

// Caixa de mensagem colorida. aviso = { nivel: 'ok' | 'aviso' | 'erro', texto }.
// papel: 'status' para mensagens comuns, 'alert' para erros que o leitor de tela deve anunciar na hora.
export function caixaDeAviso(aviso, papel) {
  const role = papel ? ` role="${papel}"` : '';
  return `<div class="aviso ${aviso.nivel}"${role}>${escapar(aviso.texto)}</div>`;
}

// Painel que abre pela direita, por cima da página. Os textos já devem vir escapados.
export function gaveta({ larga = false, sobretitulo, titulo, subtitulo = '', conteudo }) {
  return `
    <div class="fundo" data-acao="fechar"></div>
    <aside class="gaveta${larga ? ' larga' : ''}" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">
      <div class="gaveta-cab">
        <div>
          <p class="mudo">${sobretitulo}</p>
          <h2 id="gaveta-titulo">${titulo}</h2>
          ${subtitulo ? `<p class="mudo">${subtitulo}</p>` : ''}
        </div>
        <button type="button" class="fechar" id="fechar-gaveta" data-acao="fechar" aria-label="Fechar">×</button>
      </div>
      ${conteudo}
    </aside>`;
}
