// Dias da semana e turnos.
// Um "slot" é um turno de um dia: 'seg-m' é segunda de manhã, 'qui-t' é quinta à tarde.

export const DIAS = [
  { id: 'seg', nome: 'Segunda', abreviado: 'Seg' },
  { id: 'ter', nome: 'Terça', abreviado: 'Ter' },
  { id: 'qua', nome: 'Quarta', abreviado: 'Qua' },
  { id: 'qui', nome: 'Quinta', abreviado: 'Qui' },
  { id: 'sex', nome: 'Sexta', abreviado: 'Sex' },
];

// "apelido" é como se fala no dia a dia.
export const TURNOS = [
  { id: 'm', nome: 'Matutino', apelido: 'manhã' },
  { id: 't', nome: 'Vespertino', apelido: 'tarde' },
];

// Todos os slots da semana, em ordem: seg-m, seg-t, ter-m, ter-t...
export const SLOTS = DIAS.flatMap((dia) => TURNOS.map((turno) => `${dia.id}-${turno.id}`));

// 'seg-m' → "Seg manhã"
export function rotuloSlot(slot) {
  const [diaId, turnoId] = slot.split('-');
  const dia = DIAS.find((d) => d.id === diaId);
  const turno = TURNOS.find((t) => t.id === turnoId);
  return `${dia.abreviado} ${turno.apelido}`;
}

// Horário do turno no módulo: 'seg-m' → "07:00–11:00"
export const horarioDoSlot = (modulo, slot) => modulo.horarios[slot.split('-')[1]];

// Descreve os turnos no formato do documento da coordenação:
// ['ter-m', 'sex-m', 'qui-t'] → "Terça e sexta: matutino; Quinta: vespertino"
export function descreverDias(slots) {
  return TURNOS
    .map((turno) => {
      const dias = DIAS
        .filter((dia) => slots.includes(`${dia.id}-${turno.id}`))
        .map((dia) => dia.nome.toLowerCase());
      if (!dias.length) return null;
      return `${primeiraMaiuscula(juntarComE(dias))}: ${turno.nome.toLowerCase()}`;
    })
    .filter(Boolean)
    .join('; ');
}

// ['segunda', 'terça', 'quarta'] → "segunda, terça e quarta"
function juntarComE(itens) {
  if (itens.length === 1) return itens[0];
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`;
}

const primeiraMaiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
