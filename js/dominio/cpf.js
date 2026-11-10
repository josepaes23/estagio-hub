// CPF: validação pelos dígitos verificadores e formatação.
import { digitos } from './comum.js';

// Calcula um dígito verificador a partir dos números que vêm antes dele.
function digitoVerificador(numeros) {
  const soma = numeros.reduce((total, numero, i) => total + numero * (numeros.length + 1 - i), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

export function cpfValido(cpf) {
  const texto = digitos(cpf);
  const todosIguais = /^(\d)\1{10}$/.test(texto); // 111.111.111-11 passa na conta, mas não vale
  if (texto.length !== 11 || todosIguais) return false;

  const numeros = texto.split('').map(Number);
  return digitoVerificador(numeros.slice(0, 9)) === numeros[9]
    && digitoVerificador(numeros.slice(0, 10)) === numeros[10];
}

// Completa 9 números com os 2 dígitos verificadores e formata. Usado para gerar CPFs fictícios.
export function completarCpf(noveNumeros) {
  const numeros = noveNumeros.split('').map(Number);
  const primeiro = digitoVerificador(numeros);
  const segundo = digitoVerificador([...numeros, primeiro]);
  return formatarCpf([...numeros, primeiro, segundo].join(''));
}

// "00000000191" → "000.000.001-91". Se não tiver 11 números, devolve como veio.
export function formatarCpf(cpf) {
  const n = digitos(cpf);
  if (n.length !== 11) return String(cpf || '').trim();
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

// Diz de quem já é o CPF: 'aluno', 'preceptor' ou null (ninguém). Compara só os números.
// ignorarId é o cadastro que está sendo editado, para ele não contar como repetido consigo mesmo.
// CPF vazio nunca é de ninguém.
export function donoDoCpf(dados, cpf, ignorarId) {
  const numeros = digitos(cpf);
  if (!numeros) return null;
  const mesmoCpf = (pessoa) => pessoa.id !== ignorarId && digitos(pessoa.cpf) === numeros;
  if (dados.alunos.some(mesmoCpf)) return 'aluno';
  if (dados.preceptores.some(mesmoCpf)) return 'preceptor';
  return null;
}

// Esconde o começo e o fim: "000.000.001-91" → "***.000.001-**".
export function mascararCpf(cpf) {
  const n = digitos(cpf);
  return n.length === 11 ? `***.${n.slice(3, 6)}.${n.slice(6, 9)}-**` : '';
}
