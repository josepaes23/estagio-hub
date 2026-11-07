# Estágio Hub

Protótipo do sistema de gestão dos campos de estágio do internato de Medicina do CEUMA. Ele organiza o semestre em rodízios, cadastra preceptores, turmas e grupos, monta as escalas sem conflito e gera a relação de alunos por grupo de cada preceptor.

> **Protótipo com dados fictícios.** Nomes, CPFs, CRMs e contatos são inventados. Os dados reais de alunos e preceptores são protegidos pela LGPD e não devem ser colocados neste repositório.

## Como abrir

Não precisa instalar nada. Abra o `index.html` no navegador, ou sirva a pasta:

```bash
npx serve .
```

As alterações feitas na tela ficam salvas só no navegador (`localStorage`). O link "Restaurar dados de exemplo", no rodapé, volta ao estado inicial.

A proposta de arquitetura está em [`docs/arquitetura.html`](docs/arquitetura.html).

## Testes

As regras do sistema têm testes com o executor nativo do Node (versão 18 ou mais recente):

```bash
node --test
```

## Estrutura

| Arquivo | O que faz |
|---|---|
| `index.html` | Página do protótipo e estilos |
| `app.js` | Telas: painel, escalas, cadastros e relações de alunos |
| `dominio.js` | Regras do sistema, em funções puras (sem tela) |
| `dados.js` | Dados de exemplo |
| `dominio.test.js` | Testes das regras |
| `docs/arquitetura.html` | Proposta de arquitetura do sistema definitivo |

As regras ficam separadas das telas de propósito. O `dominio.js` pode ser reaproveitado no sistema definitivo, enquanto as telas do protótipo servem só para validar o fluxo com a coordenação.

## Como o estágio está modelado

- **Semestre:** 3 rodízios de 6 semanas. As turmas (A, B e C) passam por todos os módulos, um por rodízio, sem repetir.
- **Grupos:** até 4 alunos, fixos no semestre (A1, B8, C9…).
- **Preceptor:** tem um horário fixo de preceptoria (dias × turnos), numa unidade e num setor. Em cada rodízio, cada turno desse horário recebe no máximo um grupo.
- **Turnos:** matutino 07:00–11:00 e vespertino 13:00–17:00. A duração e a meta de horas (220 h ou 240 h) são definidas por módulo.
- **Carga horária do grupo:** turnos na semana × horas do turno × semanas do rodízio.

## Regras implementadas

- Um grupo não pode estar com dois preceptores no mesmo horário.
- Só entram na escala grupos da turma que faz aquele módulo no rodízio.
- A rotação confere se cada turma passa uma vez por cada módulo.
- Um grupo tem no máximo 4 alunos.
- Na troca, o grupo só passa para um preceptor do módulo livre naquele horário.
- O CPF é validado pelos dígitos verificadores e não pode repetir.
- O painel avisa sobre turnos fora do horário do preceptor, grupos abaixo da meta de horas, cadastros incompletos e relações de alunos que mudaram depois da emissão.

## Próximos passos

1. Validar o fluxo e as perguntas em aberto com a coordenação (ver `docs/arquitetura.html`).
2. Escolher o backend definitivo (Django ou NestJS + PostgreSQL) e a hospedagem aprovada pela CEUMA.
3. Gerar a relação de alunos em PDF a partir do modelo `.docx` da coordenação.
4. Login com perfis e registro de acesso aos dados pessoais.
