// Confere se os dados (por exemplo, os salvos no navegador) têm o formato que o sistema espera.
// Devolve a lista de problemas encontrados; lista vazia quer dizer que os dados podem ser usados.

const LISTAS = ['rodizios', 'modulos', 'unidades', 'turmas', 'grupos', 'alunos', 'rotacao', 'preceptores', 'alocacoes', 'trocas', 'relacoes'];

// Sem rodízio, módulo ou turma, nenhuma tela consegue ser desenhada.
const LISTAS_QUE_NAO_PODEM_FICAR_VAZIAS = ['rodizios', 'modulos', 'turmas'];

export function problemasNosDados(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return ['Os dados não são um objeto.'];

  const problemas = [];
  LISTAS.forEach((nome) => {
    if (!Array.isArray(dados[nome])) problemas.push(`Falta a lista "${nome}".`);
  });
  LISTAS_QUE_NAO_PODEM_FICAR_VAZIAS.forEach((nome) => {
    if (Array.isArray(dados[nome]) && !dados[nome].length) problemas.push(`A lista "${nome}" está vazia.`);
  });
  if (Array.isArray(dados.rodizios) && !dados.rodizios.some((rodizio) => rodizio && rodizio.id === dados.rodizioAtual)) {
    problemas.push('O rodízio em andamento (rodizioAtual) não existe.');
  }
  return problemas;
}
