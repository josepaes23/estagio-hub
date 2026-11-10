// Cadastros > Período e rodízios: datas dos rodízios, rotação das turmas e módulos do semestre.
import { estado } from '../estado.js';
import { porId, moduloDaTurma, validarRotacao } from '../dominio/index.js';
import { descricaoDoCurso } from '../componentes.js';
import { escapar, formatarData } from '../util.js';

export function telaPeriodo() {
  const { dados } = estado;
  return `
    <section class="secao">
      <h2>${escapar(descricaoDoCurso(dados))}</h2>
    </section>
    ${secaoRodizios(dados)}
    ${secaoRotacao(dados)}
    ${secaoModulos(dados)}`;
}

function secaoRodizios(dados) {
  const linhas = dados.rodizios.map((rodizio) => `
    <tr>
      <td>Rodízio ${rodizio.ordem}</td>
      <td>${escapar(formatarData(rodizio.inicio))}</td>
      <td>${escapar(formatarData(rodizio.fim))}</td>
      <td class="num">${rodizio.semanas}</td>
    </tr>`).join('');

  return `
    <section class="secao">
      <h3>Rodízios</h3>
      <div class="tabela"><table>
        <thead><tr><th>Rodízio</th><th>Início</th><th>Fim</th><th class="num">Semanas</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </section>`;
}

// Tabela turma × rodízio, com o módulo que cada turma faz em cada rodízio.
function secaoRotacao(dados) {
  const erros = validarRotacao(dados);
  const cabecalho = dados.rodizios.map((rodizio) => `<th>Rodízio ${rodizio.ordem}</th>`).join('');
  const linhas = dados.turmas.map((turma) => {
    const celulas = dados.rodizios.map((rodizio) => {
      const modulo = porId(dados.modulos, moduloDaTurma(dados, rodizio.id, turma.id));
      return `<td>${modulo ? escapar(modulo.nome) : '—'}</td>`;
    }).join('');
    return `<tr><th scope="row">${escapar(turma.nome)}</th>${celulas}</tr>`;
  }).join('');
  const situacao = erros.length
    ? `<div class="aviso erro">${erros.map(escapar).join('<br>')}</div>`
    : '<p class="mudo">Cada turma passa uma vez por cada módulo no semestre.</p>';

  return `
    <section class="secao">
      <h3>Rotação das turmas</h3>
      <div class="tabela"><table>
        <thead><tr><th>Turma</th>${cabecalho}</tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>
      ${situacao}
    </section>`;
}

function secaoModulos(dados) {
  const linhas = dados.modulos.map((modulo) => `
    <tr>
      <td>${escapar(modulo.nome)}</td>
      <td class="num">${modulo.horasTurno} h</td>
      <td>${escapar(modulo.horarios.m)}</td>
      <td>${escapar(modulo.horarios.t)}</td>
      <td class="num">${modulo.metaHoras} h</td>
    </tr>`).join('');

  return `
    <section class="secao">
      <h3>Módulos</h3>
      <div class="tabela"><table>
        <thead>
          <tr><th>Módulo</th><th class="num">Horas por turno</th><th>Manhã</th><th>Tarde</th><th class="num">Meta no rodízio</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </section>`;
}
