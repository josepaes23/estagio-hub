// Cadastros > Preceptores: a lista, com filtro por módulo e busca por nome ou CRM.
// A ficha de cada preceptor abre numa gaveta (telas/ficha-preceptor.js).
import { estado } from '../estado.js';
import { porId, porNome, camposFaltando, descreverDias } from '../dominio/index.js';
import { opcoesDeModulo } from '../componentes.js';
import { escapar, plural, semAcento } from '../util.js';

export function telaPreceptores() {
  const { dados, ui } = estado;
  const lista = preceptoresFiltrados(dados, ui);
  const linhas = lista.map((preceptor) => linhaDoPreceptor(dados, preceptor)).join('');

  return `
    <section class="secao">
      <div class="ferramentas">
        <div class="campo-inline">
          <label for="filtro-modulo">Módulo</label>
          <select id="filtro-modulo" data-mudar="filtrar-preceptores">
            <option value="">Todos</option>
            ${opcoesDeModulo(dados, ui.filtroModulo)}
          </select>
        </div>
        <div class="campo-inline cresce">
          <label for="busca">Buscar</label>
          <input id="busca" type="search" autocomplete="off" placeholder="Nome ou CRM" value="${escapar(ui.busca)}"
            data-digitar="buscar-preceptor">
        </div>
        <button type="button" class="btn" data-acao="novo-preceptor">Novo preceptor</button>
      </div>
      <p class="mudo">${plural(lista.length, 'preceptor', 'preceptores')}</p>
      <div class="tabela"><table>
        <thead>
          <tr>
            <th>Preceptor</th><th>Módulo</th><th>Unidade e setor</th><th>Horário de preceptoria</th><th>Cadastro</th>
            <th><span class="sr">Ações</span></th>
          </tr>
        </thead>
        <tbody>${linhas || '<tr><td colspan="6" class="mudo">Nenhum preceptor encontrado.</td></tr>'}</tbody>
      </table></div>
    </section>`;
}

function preceptoresFiltrados(dados, ui) {
  const termo = semAcento(ui.busca);
  return dados.preceptores
    .filter((p) => !ui.filtroModulo || p.moduloId === ui.filtroModulo)
    .filter((p) => !termo || semAcento(p.nome).includes(termo) || String(p.crm).includes(termo))
    .sort(porNome);
}

function linhaDoPreceptor(dados, preceptor) {
  const modulo = porId(dados.modulos, preceptor.moduloId);
  const unidade = porId(dados.unidades, preceptor.unidadeId);
  const faltam = camposFaltando(preceptor);
  const crm = preceptor.crm ? `CRM-MA ${escapar(preceptor.crm)}` : 'Sem CRM';
  const situacao = faltam.length
    ? `<span class="txt-aviso">Falta ${escapar(faltam.join(', '))}</span>`
    : '<span class="mudo">Completo</span>';

  return `
    <tr>
      <td><b>${escapar(preceptor.nome)}</b><span class="sub">${crm}</span></td>
      <td>${escapar(modulo.nome)}</td>
      <td>${unidade ? escapar(unidade.nome) : '—'}<span class="sub">${escapar(preceptor.setor || '')}</span></td>
      <td class="horario-txt">${escapar(descreverDias(preceptor.horario))}</td>
      <td>${situacao}</td>
      <td><button type="button" class="link" data-acao="abrir-ficha" data-id="${escapar(preceptor.id)}">Abrir ficha</button></td>
    </tr>`;
}

export const acoes = {
  'filtrar-preceptores'(campo) {
    estado.ui.filtroModulo = campo.value;
  },
  'buscar-preceptor'(campo) {
    estado.ui.busca = campo.value;
  },
};
