// Aba "Painel": o que precisa de atenção no rodízio, o resumo das escalas e as últimas alterações.
import { estado, fecharGavetas } from '../estado.js';
import { porId, pendencias, resumoEscalas, rotuloSlot } from '../dominio/index.js';
import { seletorDeRodizio, nomeDoPreceptor, descreverTroca } from '../componentes.js';
import { escapar, plural, somar, formatarData, formatarDataHora, primeiraMaiuscula } from '../util.js';
import { abrirFicha } from './ficha-preceptor.js';

export function telaPainel() {
  const { dados, ui } = estado;
  const rodizio = porId(dados.rodizios, ui.rodizioId);
  const escalas = resumoEscalas(dados, rodizio.id);
  const emAndamento = rodizio.id === dados.rodizioAtual;
  const totalGrupos = somar(escalas, (escala) => escala.grupos);
  const totalAlunos = somar(escalas, (escala) => escala.alunos);

  return `
    <section class="secao">
      <div class="cab-secao">
        <div>
          <h2>Rodízio ${rodizio.ordem}${emAndamento ? ' <span class="selo">em andamento</span>' : ''}</h2>
          <p class="mudo">
            ${escapar(formatarData(rodizio.inicio))} a ${escapar(formatarData(rodizio.fim))} · ${rodizio.semanas} semanas ·
            ${escalas.length} escalas · ${totalGrupos} grupos · ${totalAlunos} alunos
          </p>
        </div>
        ${seletorDeRodizio(dados, rodizio.id)}
      </div>
    </section>
    ${secaoPendencias(dados, rodizio)}
    ${secaoEscalas(escalas, rodizio)}
    ${secaoUltimasAlteracoes(dados)}`;
}

// Erros e avisos do rodízio, com os erros primeiro.
function secaoPendencias(dados, rodizio) {
  const ORDEM = { erro: 0, aviso: 1 };
  const lista = pendencias(dados, rodizio.id).sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel]);
  const itens = lista.map((pendencia) => `
    <li>
      <span class="nivel ${pendencia.nivel}">${pendencia.nivel === 'erro' ? 'Erro' : 'Aviso'}</span>
      <span class="txt">${escapar(pendencia.texto)}</span>
      ${botaoIr('Abrir', pendencia.alvo)}
    </li>`).join('');

  return `
    <section class="secao">
      <h3>Precisa de atenção</h3>
      ${itens ? `<ul class="pendencias">${itens}</ul>` : '<p class="mudo">Nada pendente neste rodízio.</p>'}
    </section>`;
}

function secaoEscalas(escalas, rodizio) {
  const linhas = escalas.map((escala) => {
    const alvo = { aba: 'escalas', rodizioId: rodizio.id, moduloId: escala.modulo.id };
    const carga = escala.abaixo
      ? `<span class="txt-aviso">${plural(escala.abaixo, 'grupo', 'grupos')} abaixo da carga</span>`
      : '<span class="mudo">Em dia</span>';
    return `
      <tr>
        <td>${escala.numero}</td>
        <td>${botaoIr(escapar(escala.modulo.nome), alvo)}</td>
        <td>${escala.turma ? escapar(escala.turma.nome) : '—'}</td>
        <td class="num">${escala.grupos}</td>
        <td class="num">${escala.alunos}</td>
        <td class="num">${escala.turnosOcupados} de ${escala.turnosOferecidos}</td>
        <td>${carga}</td>
      </tr>`;
  }).join('');

  return `
    <section class="secao">
      <h3>Escalas do rodízio</h3>
      <div class="tabela"><table>
        <thead>
          <tr>
            <th>Nº</th><th>Módulo</th><th>Turma</th><th class="num">Grupos</th><th class="num">Alunos</th>
            <th class="num">Turnos ocupados</th><th>Carga horária</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </section>`;
}

// As 5 alterações mais recentes, da mais nova para a mais antiga.
function secaoUltimasAlteracoes(dados) {
  const itens = dados.trocas.slice(-5).reverse().map((troca) => {
    const rodizio = porId(dados.rodizios, troca.rodizioId);
    return `
      <li>
        <span class="mudo">${escapar(formatarDataHora(troca.quando))} · Rodízio ${rodizio.ordem}, ${rotuloSlot(troca.slot)}</span>
        <span>${textoDaTroca(dados, troca)}</span>
      </li>`;
  }).join('');

  return `
    <section class="secao">
      <h3>Últimas alterações nas escalas</h3>
      ${itens ? `<ul class="historico">${itens}</ul>` : '<p class="mudo">Nenhuma alteração registrada.</p>'}
    </section>`;
}

// No painel, a frase começa com maiúscula e, na troca de grupo, leva o nome do preceptor na frente.
function textoDaTroca(dados, troca) {
  const descricao = descreverTroca(dados, troca);
  if (troca.tipo === 'preceptor') return primeiraMaiuscula(descricao);
  return `${escapar(nomeDoPreceptor(dados, troca.preceptorId))}: ${descricao}`;
}

// Botão que leva para outra parte do sistema. O alvo diz para onde: aba, rodízio, módulo, turno, ficha...
const botaoIr = (texto, alvo) =>
  `<button type="button" class="link" data-acao="ir" data-alvo="${escapar(JSON.stringify(alvo))}">${texto}</button>`;

export const acoes = {
  // Leva para o lugar indicado no botão (por exemplo, abre o turno com conflito na escala).
  ir(botao) {
    const { dados, ui } = estado;
    const alvo = JSON.parse(botao.dataset.alvo);
    fecharGavetas();
    ui.aba = alvo.aba;
    ui.aviso = null;
    if (alvo.rodizioId) ui.rodizioId = alvo.rodizioId;
    if (alvo.moduloId) ui.moduloId = alvo.moduloId;
    if (alvo.sub) ui.cadastro = alvo.sub;
    if (alvo.turmaId) ui.turmaId = alvo.turmaId;
    if (alvo.aba === 'relacoes' && alvo.preceptorId) {
      ui.preceptorDaRelacao = alvo.preceptorId;
      ui.moduloDasRelacoes = porId(dados.preceptores, alvo.preceptorId).moduloId;
    }
    if (alvo.slot) ui.turnoAberto = { preceptorId: alvo.preceptorId, slot: alvo.slot };
    if (alvo.ficha) abrirFicha(alvo.ficha);
    window.scrollTo(0, 0);
  },
};
