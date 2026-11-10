// Rotação: qual turma faz qual módulo em cada rodízio.
// Cada turma precisa passar uma vez por cada módulo no semestre.

export function turmaNoModulo(dados, rodizioId, moduloId) {
  const linha = dados.rotacao.find((r) => r.rodizioId === rodizioId && r.moduloId === moduloId);
  return linha?.turmaId || null;
}

export function moduloDaTurma(dados, rodizioId, turmaId) {
  const linha = dados.rotacao.find((r) => r.rodizioId === rodizioId && r.turmaId === turmaId);
  return linha?.moduloId || null;
}

// Devolve a lista de problemas da rotação (vazia quando está tudo certo).
export function validarRotacao(dados) {
  const erros = [];

  dados.rodizios.forEach((rodizio) => dados.modulos.forEach((modulo) => {
    const turmas = dados.rotacao.filter((r) => r.rodizioId === rodizio.id && r.moduloId === modulo.id).length;
    if (turmas !== 1) erros.push(`${modulo.nome} está com ${turmas} turmas no rodízio ${rodizio.ordem}.`);
  }));

  dados.turmas.forEach((turma) => dados.modulos.forEach((modulo) => {
    const vezes = dados.rotacao.filter((r) => r.turmaId === turma.id && r.moduloId === modulo.id).length;
    if (vezes > 1) erros.push(`A ${turma.nome} passa ${vezes} vezes por ${modulo.nome}.`);
    if (vezes === 0) erros.push(`A ${turma.nome} não passa por ${modulo.nome} no semestre.`);
  }));

  return erros;
}
