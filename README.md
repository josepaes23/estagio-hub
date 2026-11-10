# Estágio Hub

Protótipo do sistema de gestão dos campos de estágio do internato de Medicina do CEUMA. Ele organiza o semestre em rodízios, cadastra preceptores, turmas e grupos, monta as escalas sem conflito e gera a relação de alunos por grupo de cada preceptor.

> **Protótipo com dados fictícios.** Nomes, CPFs, CRMs e contatos são inventados. Os dados reais de alunos e preceptores são protegidos pela LGPD e não devem ser colocados neste repositório.

## Como abrir

Não precisa instalar nada, mas a página precisa ser aberta por um servidor local. O código está dividido em vários arquivos JavaScript, e o navegador não carrega esses arquivos se o `index.html` for aberto direto do disco.

No VS Code, com a extensão **Live Server**: abra o `index.html` e clique em **Go Live**, no canto inferior direito. A página abre em `http://127.0.0.1:5500` e recarrega sozinha a cada arquivo salvo.

Sem o VS Code, sirva a pasta e acesse `http://localhost:8080`:

```bash
npx serve . -l 8080
```

No PowerShell, se aparecer o erro de "execução de scripts desabilitada", use `npx.cmd` no lugar de `npx`.

As alterações feitas na tela ficam salvas só no navegador (`localStorage`). O link "Restaurar dados de exemplo", no rodapé, volta ao estado inicial. Isso também vale depois de mudar o `js/dados-exemplo.js`: sem restaurar, a página continua com os dados que já estavam salvos.

A proposta de arquitetura vai ficar em `docs/arquitetura.html` (o arquivo ainda não está no repositório).

## Testes

As regras do sistema têm testes com o executor nativo do Node (versão 18 ou mais recente):

```bash
node --test
```

## Estrutura

```
index.html                 a página: só a estrutura (cabeçalho, abas, rodapé)
css/
  base.css                 cores, texto, botões, tabelas, formulários e gavetas
  painel.css               estilos da aba Painel
  escalas.css              grade da escala e gaveta do turno
  cadastros.css            lista e ficha de preceptores, turmas e grupos
  relacoes.css             relação de alunos (o documento)
js/
  app.js                   ponto de partida: desenha a aba aberta e trata cliques e digitação
  estado.js                os dados e o estado da tela; salva no navegador
  componentes.js           pedaços de tela usados em mais de uma aba
  util.js                  datas, textos e proteção do HTML
  dados-exemplo.js         dados fictícios
  telas/                   uma tela por arquivo
    painel.js
    escalas.js             grade da escala
    turno.js               gaveta que abre ao clicar num turno da escala
    cadastros.js           troca entre as sub-abas de Cadastros
    preceptores.js         lista de preceptores
    ficha-preceptor.js     gaveta com o formulário do preceptor
    turmas.js
    unidades.js
    periodo.js
    relacoes.js
  dominio/                 regras do sistema, sem tela, um assunto por arquivo
    index.js               junta tudo; as telas e os testes importam daqui
    calendario.js          dias, turnos e textos de horário
    cpf.js
    turmas.js              grupos e alunos
    rotacao.js             qual turma faz qual módulo em cada rodízio
    preceptores.js         validação e gravação da ficha
    escalas.js             alocação de grupos nos turnos e carga horária
    relacoes.js            relação de alunos e emissão de versões
    pendencias.js          problemas que aparecem no painel
    formato.js             confere se os dados salvos têm o formato esperado
    comum.js               ferramentas pequenas usadas pelas regras
testes/
  dominio.test.js          testes das regras
docs/arquitetura.html      proposta de arquitetura do sistema definitivo (ainda não está no repositório)
```

As regras ficam separadas das telas de propósito. A pasta `js/dominio/` pode ser reaproveitada no sistema definitivo, enquanto as telas do protótipo servem só para validar o fluxo com a coordenação.

### Como o código funciona

1. O `js/estado.js` guarda tudo: os **dados** (preceptores, turmas, escalas...) e o estado da **tela** (aba aberta, filtros, gaveta aberta).
2. O `js/app.js` desenha a aba aberta chamando a função da tela (por exemplo, `telaEscalas()` em `js/telas/escalas.js`).
3. Cada botão diz qual ação dispara, no próprio HTML: `data-acao="abrir-turno"`. A ação fica no arquivo da tela, no objeto `acoes`, com o mesmo nome.
4. A ação muda o estado, usando as regras de `js/dominio/` quando mexe nos dados, e a página é desenhada de novo.

### Onde mudar cada coisa

| Quero mudar... | Arquivo |
|---|---|
| O curso que aparece no topo da página | `js/dados-exemplo.js` (no começo do arquivo) |
| O formato desse texto ("Medicina · Internato") | `descricaoDoCurso` em `js/componentes.js` |
| As cores | `css/base.css`, no começo |
| Uma tela | `js/telas/<nome da tela>.js` e o CSS da aba em `css/` |
| O que acontece ao clicar num botão | `acoes`, no fim do arquivo da tela |
| Uma regra (conflito, carga horária, validação...) | `js/dominio/` |
| Os dados de exemplo | `js/dados-exemplo.js` |

## Como o estágio está modelado

- **Semestre:** 3 rodízios de 6 semanas. As turmas (A, B e C) passam por todos os módulos, um por rodízio, sem repetir.
- **Grupos:** até 4 alunos, fixos no semestre (A1, B8, C9…). Se um aluno troca de grupo, a troca vale do rodízio em andamento em diante: nos rodízios que já terminaram, ele continua no grupo antigo.
- **Preceptor:** tem um horário fixo de preceptoria (dias × turnos), numa unidade e num setor. Em cada rodízio, cada turno desse horário recebe no máximo um grupo.
- **Turnos:** matutino 07:00–11:00 e vespertino 13:00–17:00. A duração e a meta de horas (220 h ou 240 h) são definidas por módulo.
- **Carga horária do grupo:** turnos na semana × horas do turno × semanas do rodízio.

## Regras implementadas

- Um grupo não pode estar com dois preceptores no mesmo horário.
- Só entram na escala grupos da turma que faz aquele módulo no rodízio.
- A rotação confere se cada turma passa uma vez por cada módulo.
- Um grupo tem no máximo 4 alunos.
- A troca de grupo de um aluno não muda a relação de alunos dos rodízios que já terminaram.
- Na troca, o grupo só passa para um preceptor do módulo livre naquele horário.
- O CPF é validado pelos dígitos verificadores e não pode repetir entre alunos e preceptores. A matrícula do aluno e o CRM do preceptor também não podem repetir.
- O painel avisa sobre turnos fora do horário do preceptor, grupos abaixo da meta de horas, cadastros incompletos e relações de alunos que mudaram depois da emissão.

## Próximos passos

1. Validar o fluxo e as perguntas em aberto com a coordenação (ver `docs/arquitetura.html`, quando estiver no repositório).
2. Escolher o backend definitivo (Django ou NestJS + PostgreSQL) e a hospedagem aprovada pela CEUMA.
3. Gerar a relação de alunos em PDF a partir do modelo `.docx` da coordenação.
4. Login com perfis e registro de acesso aos dados pessoais.
