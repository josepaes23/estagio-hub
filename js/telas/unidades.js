// Cadastros > Unidades: as unidades concedentes, com seus setores e quantos preceptores cada uma tem.
import { estado } from '../estado.js';
import { escapar } from '../util.js';

export function telaUnidades() {
  const { dados } = estado;
  const linhas = dados.unidades.map((unidade) => {
    const preceptores = dados.preceptores.filter((p) => p.unidadeId === unidade.id).length;
    return `
      <tr>
        <td><b>${escapar(unidade.nome)}</b></td>
        <td>${escapar(unidade.municipio)}</td>
        <td>${escapar(unidade.esfera)}</td>
        <td>${escapar(unidade.setores.join(', '))}</td>
        <td class="num">${preceptores}</td>
      </tr>`;
  }).join('');

  return `
    <section class="secao">
      <div class="tabela"><table>
        <thead>
          <tr><th>Unidade concedente</th><th>Município</th><th>Esfera</th><th>Setores</th><th class="num">Preceptores</th></tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table></div>
    </section>`;
}
