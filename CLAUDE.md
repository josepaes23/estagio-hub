# Estágio Hub: regras para o Claude

Protótipo do sistema de escalas do internato de Medicina do CEUMA. O [README.md](README.md) explica a estrutura das pastas, como o código funciona e onde mudar cada coisa. Leia o README antes de mexer no projeto.

## Como falar comigo

- Responda em português, com linguagem simples. Estou aprendendo: quando eu precisar rodar algo, diga o comando exato e onde rodar.
- Uso Windows, com o terminal do VS Code (PowerShell).
- Antes de uma mudança grande, mostre o plano e espere eu concordar.

## Rodar e testar

- **Abrir a página:** extensão Live Server do VS Code (`index.html` → **Go Live**, em `http://127.0.0.1:5500`). Sem o VS Code: `npx.cmd serve . -l 8080`.
- **Testes:** `node --test`. Rode os testes depois de mexer em `js/dominio/` ou em `js/dados-exemplo.js`, e sempre antes de dizer que terminou.
- **Nada para instalar:** é HTML, CSS e JavaScript puro, com módulos (`type="module"`). Não adicione pacotes npm, frameworks, bibliotecas ou etapa de build sem me perguntar antes.

## Organização do código

- **Telas:** uma tela por arquivo em `js/telas/`, com o CSS da aba em `css/<aba>.css`.
- **Regras:** as regras do sistema ficam em `js/dominio/`, um assunto por arquivo, exportadas pelo `js/dominio/index.js`. Elas não mexem na página nem no `localStorage`, e não alteram os dados que recebem: devolvem `{ ok: true, dados }` com uma cópia nova, ou `{ ok: false, motivo }`.
- **Testes das regras:** toda regra nova ou alterada ganha teste em `testes/dominio.test.js`.
- **Botões e campos:** usam `data-acao`, `data-mudar`, `data-digitar` ou `data-form`. A ação fica no objeto `acoes` do arquivo da tela e é registrada no `js/app.js`.
- **Estado:** fica só em `js/estado.js`. Os dados mudam por `aplicar()`, que já salva no navegador.
- **Partes reaproveitadas:** antes de criar uma, veja se já existe em `js/componentes.js` (gaveta, seletor, caixa de aviso) ou em `js/util.js`.
- **Nomes:** variáveis, funções e comentários em português, como no resto do código.
- **Mudanças:** pequenas e focadas no que eu pedi. Não reescreva arquivos inteiros nem mude o que não foi pedido.
- **README:** se a estrutura mudar (arquivo novo, arquivo renomeado), atualize o README, inclusive a tabela "Onde mudar cada coisa".

## Segurança e dados pessoais (LGPD)

- **Só dados fictícios.** Nunca coloque no projeto nomes, CPFs, matrículas, CRMs, telefones ou e-mails reais de alunos ou preceptores. Arquivos `.pdf`, `.docx`, `.xlsx`, `.csv` e a pasta `dados-reais/` ficam fora do git (estão no `.gitignore`). Não mude isso.
- **Proteger o HTML:** todo texto que vem dos dados passa por `escapar()` (de `js/util.js`) antes de entrar no HTML. Nunca coloque um dado direto num `${...}` sem `escapar()`.
- **CPF:** não mostre o CPF em telas novas. Se precisar exibir, use `mascararCpf()`. Hoje o CPF completo não aparece em nenhuma tela: a relação de alunos (`js/telas/relacoes.js`) mostra só nome e R.A. Ele só aparece dentro do campo CPF da ficha do preceptor, onde é digitado.
- **Segredos:** nunca escreva senhas, chaves de API ou tokens no código.
- **Scripts de fora:** não carregue scripts de outros sites (CDN) sem me perguntar. Hoje só a fonte vem de fora (Google Fonts).

## Design

- **Visual:** ferramenta de trabalho, parecida com uma planilha bem arrumada. Uma fonte só (Public Sans) e o azul CEUMA como única cor de destaque. Vermelho só para erro e âmbar só para aviso.
- **Cores:** use as variáveis do começo do `css/base.css` (`--accent`, `--erro`, `--line`...), nunca cores soltas. Toda cor nova precisa funcionar também no modo escuro, que fica no mesmo arquivo.
- **Classes:** reaproveite as que já existem antes de criar outras.
- **Acessibilidade:** botões de verdade (`<button type="button">`), `<label>` em todo campo, foco visível e `aria-` onde fizer falta.
- **Telas pequenas:** confira se a tela funciona também na largura de um celular.

## Git

- O repositório é compartilhado (`github.com/josepaes23/estagio-hub`). Trabalhamos na branch `development`.
- Não faça commit, push, merge nem troque de branch sem eu pedir.
- Antes de mexer, rode `git status`: pode haver mudanças minhas que ainda não foram commitadas, e elas não podem se perder.
