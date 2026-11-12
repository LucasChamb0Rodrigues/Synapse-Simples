# Synapse — versão simplificada

Sistema web para cadastrar as **fichas técnicas** dos produtos da Gebon Sorvetes e calcular o **custo** de cada produto.

**Tecnologias:** Node.js + Express (back-end), MySQL (banco de dados), HTML + Bootstrap (só o CSS) + JavaScript puro (front-end).

O projeto é dividido em duas partes, publicadas separadamente:

```
frontend/  (telas)       ──pede dados (fetch)──►  backend/  (API Express, MVC)  ──SQL──►  MySQL
 HTML, CSS e JS puro      ◄──responde em JSON──    regras e permissões          ◄──────   tabelas
 arquivos estáticos                                 precisa de Node.js 22+
```

---

## Como rodar no seu computador

1. Instale o **Node.js 22 ou mais novo** e o **MySQL 8**.
2. Crie o banco: abra o arquivo `backend/banco.sql` no MySQL Workbench e execute. Outra opção é rodar no Prompt de Comando:
   ```bat
   mysql -u root -p < backend/banco.sql
   ```
3. Em `backend/`, copie `.env.example` para `.env` e preencha a senha do MySQL (`DB_PASSWORD`) e uma frase secreta (`SESSION_SECRET`).
4. Na pasta do projeto (a raiz), ligue tudo com um só comando:
   ```bat
   npm start
   ```
   Isso liga a **API** em <http://localhost:3000/api> e as **telas** em <http://localhost:5500> (na primeira vez, instala as dependências da API).
5. Se preferir ligar separado: a API com `cd backend` + `npm start`, e as telas pelo VS Code, clicando com o botão direito em `frontend/index.html` → **Open with Live Server**. Não use os dois jeitos ao mesmo tempo: os dois usam a porta 5500.
6. Abra <http://localhost:5500>. No primeiro acesso, o sistema pede para criar o usuário **Admin** (administrador).

O endereço da API que as telas usam fica em `frontend/config.js` (classe `Configuracao`). No computador ele já aponta para a porta 3000.

---

## Como publicar num servidor (Vercel + Aiven)

| Parte | Onde |
|---|---|
| Telas (`frontend/`) | projeto **synapse** na Vercel |
| API (`backend/`) | projeto **synapse-api** na Vercel |
| Banco MySQL | **Aiven** (plano grátis) |

As telas repassam os pedidos `/api/...` para a API (arquivo `frontend/vercel.json`). Para o navegador fica tudo no mesmo endereço: o login funciona em todos os navegadores e não é preciso CORS. O login fica guardado no MySQL (tabela `sessao`), por isso funciona na Vercel, onde a API liga e desliga a cada pedido.

### 1. Banco no Aiven
1. Crie uma conta em **aiven.io** → **Create service** → **MySQL** → plano **Free**. Escolha a região mais perto do Brasil disponível.
2. Na página do serviço (*Overview*), anote **Host**, **Port**, **User** (`avnadmin`) e **Password**, e baixe o **CA certificate** (`ca.pem`).
3. No MySQL Workbench, crie uma conexão com esses dados. Na aba **SSL**: *Use SSL* = **Require and Verify CA** e, em *SSL CA File*, escolha o `ca.pem`.
4. Conectado, abra e execute o `backend/banco.sql`.
   Para levar os dados do seu computador: no banco local, *Server → Data Export* do `synapse_simples`; no Aiven, *Server → Data Import* desse arquivo (em vez de rodar o `banco.sql`).

### 2. API na Vercel
1. Em **vercel.com** → **Add New → Project** → importe este repositório do GitHub.
2. **Project Name**: `synapse-api` · **Root Directory**: `backend` · **Framework Preset**: `Other`.
3. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `DB_HOST` | Host do Aiven |
   | `DB_PORT` | Port do Aiven |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | Password do Aiven |
   | `DB_NAME` | `synapse_simples` |
   | `DB_SSL` | `true` |
   | `DB_SSL_CA` | todo o conteúdo do `ca.pem` (de `-----BEGIN CERTIFICATE-----` até `-----END CERTIFICATE-----`) |
   | `DB_TIMEZONE` | `-03:00` |
   | `SESSION_SECRET` | uma frase longa e nova: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

4. **Deploy**. Abra o endereço do projeto: deve aparecer `{"sistema":"Synapse API","ok":true}`.

### 3. Telas na Vercel
1. Confira o endereço da API (passo 2). Se for diferente de `https://synapse-simples-backend.vercel.app`, corrija em `frontend/vercel.json` e faça `git push`.
2. Na Vercel → **Add New → Project** → importe **o mesmo repositório** de novo.
3. **Project Name**: `synapse` · **Root Directory**: `frontend` · **Framework Preset**: `Other` · sem variáveis de ambiente.
4. **Deploy**. O sistema abre em `https://synapse.vercel.app` (ou o nome que a Vercel der). Com o banco vazio, o primeiro acesso pede para criar o Admin.

Depois disso, cada `git push` na `main` atualiza as telas e a API sozinho.

---

## Organização dos arquivos (MVC, orientado a objetos)

```
backend/             A API (Model + Controller)
  aplicacao.js         classe Aplicacao: monta a API (middlewares, sessão no MySQL e rotas)
  servidor.js          classe Servidor: liga a API no computador (npm start)
  api/index.js         Entrada da API na Vercel
  vercel.json          Na Vercel, manda todos os endereços para o api/index.js
  rotas.js             classe Rotas: liga cada endereço a um método de controller, em 3 blocos: aberto, logado e só Admin
  banco.sql            Criação das tabelas
  .env.example         Modelo das configurações (copie para .env)

iniciar.js           classe Iniciador (só para o computador): "npm start" na raiz liga a API e as telas juntas

  config/              Configuração
    ambiente.js          classe Ambiente: lê o arquivo .env e confere o SESSION_SECRET
    banco.js             classe Banco: conexão com o MySQL, sql() e transacao()

  middlewares/         Classes com o que roda antes (ou depois) de cada pedido
    seguranca.js         classe Seguranca: cabeçalhos de segurança e CORS
    autenticacao.js      classe Autenticacao: atualiza o usuário da sessão, exige login, exige perfil Admin
    erros.js             classe TratadorDeErros: transforma qualquer erro em uma mensagem para a tela

  utils/
    ErroApp.js           classe ErroApp: erro com status HTTP que vira mensagem na tela

  models/              M: uma classe por entidade (cada objeto é uma linha da tabela)
    Modelo.js            classe base: listar, buscarPorId, buscarOuFalhar, preencher, validar, salvar, mudarAtivo (inativar/reativar)
    categoriaModel.js    Categoria extends Modelo
    insumoModel.js       Insumo extends Modelo
    produtoModel.js      Produto extends Modelo (situação no catálogo, novaFicha)
    usuarioModel.js      Usuario extends Modelo (senha com hash, autenticar)
    fichaModel.js        Ficha: valida os itens e grava uma nova versão (transação)
    sessaoModel.js       SessaoStore: guarda os logins na tabela sessao
    tentativaLoginModel.js  TentativaLogin: bloqueia o login depois de 5 senhas erradas

  controllers/         C: uma classe por assunto; recebem o pedido, usam os objetos dos models e respondem
    authController.js       login, logout, primeiro acesso
    catalogoController.js   lista de produtos com situação e custo; detalhe da ficha
    produtoController.js    cadastro de produtos + gravação da ficha técnica
    insumoController.js     categoriaController.js    usuarioController.js
    relatorioController.js  perfilController.js
    variacaoController.js   relatório de variação de preços dos insumos (por período)
    margemController.js     relatório de margem de lucro dos produtos (por categoria)

  testes/              Testes automáticos (npm test dentro de backend/)
    insumo.test.js       teste do critério 2 do cadastro de insumo (custo negativo)

frontend/            V: as telas que rodam no navegador
  index.html           esqueleto da página: login, menu, janelas e a lista de scripts
  telas/               o HTML de cada aba, um arquivo por aba (o sistema.js carrega todos ao abrir)
    catalogo.html  produto.html  ficha.html  insumo.html  categoria.html  relatorio.html  variacao.html  margem.html  usuario.html  perfil.html
  config.js            classe Configuracao: endereço da API (no computador aponta para a porta 3000; na Vercel usa o repasse)
  vercel.json          na Vercel, repassa /api/... para o projeto da API
  css/                 o visual, um arquivo por parte (carregados nesta ordem no index.html)
    base.css             cores, botões e ícones (vale para tudo)
    login.css            tela de login
    layout.css           menu lateral, conteúdo e cabeçalho das abas
    janelas.css          janelas de editar, ver ficha e confirmar
    ficha.css            quadros de custo da ficha técnica
    relatorio.css        relatórios, cards de indicadores e barras
    responsivo.css       ajustes para tablet e celular
    impressao.css        relatórios impressos ou salvos em PDF
  js/                  o JavaScript das telas, um arquivo por classe
    tela.js              Tela: formata dinheiro e datas, mostra avisos e confirmações
    api.js               Api: conversa com o back-end (fetch)
    rotas.js             Rotas: a lista das abas (nome, tela, classe e quem pode abrir), em 2 blocos: logado e só Admin
    login.js             Login: tela de login e de primeiro acesso
    sistema.js           Sistema: carrega as telas, menu e troca de abas pelo endereço (é o último a carregar e liga tudo)
    abas/                uma classe por aba da tela
      aba.js               classe base de todas as abas
      cadastro.js          classe base das abas de cadastro (lista, busca, janela de editar, inativar)
      catalogo.js  produto.js  ficha.js  insumo.js  categoria.js  relatorio.js  variacao.js  margem.js  usuario.js  perfil.js
```

**Mesmo nome em todas as camadas:** cada funcionalidade usa o mesmo nome (no singular) do banco até a tela. Para achar tudo de uma funcionalidade, aperte **Ctrl+P** no VS Code e digite o nome (ex.: `insumo`).

| Funcionalidade | Back-end | Tela (HTML) | Lógica da tela (JS) | Estilo |
|---|---|---|---|---|
| catalogo | `catalogoController.js` | `telas/catalogo.html` | `js/abas/catalogo.js` | |
| produto | `produtoController.js`, `produtoModel.js` | `telas/produto.html` | `js/abas/produto.js` | |
| ficha | `fichaModel.js` | `telas/ficha.html` | `js/abas/ficha.js` | `css/ficha.css` |
| insumo | `insumoController.js`, `insumoModel.js` | `telas/insumo.html` | `js/abas/insumo.js` | |
| categoria | `categoriaController.js`, `categoriaModel.js` | `telas/categoria.html` | `js/abas/categoria.js` | |
| relatorio | `relatorioController.js` | `telas/relatorio.html` | `js/abas/relatorio.js` | `css/relatorio.css` |
| variacao | `variacaoController.js`, `insumoModel.js` | `telas/variacao.html` | `js/abas/variacao.js` | `css/relatorio.css` |
| margem | `margemController.js`, `produtoModel.js` | `telas/margem.html` | `js/abas/margem.js` | `css/relatorio.css` |
| usuario | `usuarioController.js`, `usuarioModel.js` | `telas/usuario.html` | `js/abas/usuario.js` | |
| perfil | `perfilController.js` | `telas/perfil.html` | `js/abas/perfil.js` | |

**Endereço das abas:** cada aba tem um endereço com `#`, listado em `js/rotas.js` (ex.: `#/insumos`). Assim o F5 mantém a aba aberta e o botão Voltar do navegador volta para a aba anterior. Um endereço que não existe, ou uma aba só do Admin aberta por outro perfil, cai no Catálogo.

**Onde aparece a orientação a objetos:**

- **Classes e objetos:** cada registro do banco vira um objeto (`new Produto(...)`), com dados e comportamento juntos (`produto.salvar()`, `produto.mudarAtivo(false)`, `usuario.conferirSenha(...)`).
- **Herança:** `Categoria`, `Insumo`, `Produto` e `Usuario` herdam de `Modelo`; na tela, as abas herdam de `Aba` e `Cadastro`.
- **Polimorfismo:** `Modelo.salvar()` chama `this.validar()`, e cada classe filha tem a sua própria validação. Na tela, cada aba tem o seu próprio `carregar()`.
- **Tudo em classes:** todo o código (back-end, telas e o `iniciar.js`) fica dentro de classes. Fora delas só ficam as linhas de partida, que criam o primeiro objeto e o colocam para rodar (ex.: `Servidor.ligar()` e `new Sistema()`).
- **Encapsulamento:** as regras ficam dentro da classe dona delas (ex.: só o `Usuario` sabe gerar e conferir o hash da senha; só a `Ficha` sabe calcular o custo e gravar a versão).

---

## Como um clique vira dado no banco (exemplo: cadastrar insumo)

1. **View:** o usuário preenche o formulário e clica em **Cadastrar**. O `frontend/js/abas/cadastro.js` chama `Cadastro.salvarJanela(evento)`, que faz `Api.chamar('POST', '/api/insumos', dados)`.
2. **Rota:** a classe `Rotas` (`backend/rotas.js`) passa pela classe `Autenticacao` (`backend/middlewares/autenticacao.js`: está logada? é Admin?) e chama o método `criar` do `InsumoController`.
3. **Controller:** `backend/controllers/insumoController.js` cria o objeto `new Insumo().preencher(dados)` e chama `insumo.salvar()`.
4. **Model:** `insumo.salvar()` (herdado de `Modelo`) chama `validar()` da classe `Insumo` e faz o `INSERT` no MySQL.
5. O controller responde `{ ok: true }`. A tela mostra "Salvo!" e recarrega a tabela.

Para **editar**, o botão "Editar" coloca os dados no mesmo formulário e a tela envia um `PUT` em vez de `POST`.

---

## Requisitos atendidos

| Requisito | Onde está |
|---|---|
| RF1 Produtos (cadastrar, alterar, inativar/reativar) | `backend/controllers/produtoController.js` |
| RF2 Insumos (inativo não entra em ficha nova, mas continua nas antigas) | `backend/controllers/insumoController.js` |
| RF3 Categorias (inativa não pode ser escolhida para produto) | `backend/controllers/categoriaController.js` |
| RF4 Relatório de custo (data, impressão) | `backend/controllers/relatorioController.js` |
| RF5 Ficha técnica com versões | tabelas `ficha_tecnica` e `item_ficha`; `backend/models/fichaModel.js` |
| RF6 Custo calculado automaticamente | o servidor busca o preço dos insumos e calcula o custo da receita (com perda) e o custo por unidade (`backend/models/fichaModel.js`) |
| Preço de venda e margem | produto vendido por unidade ou em caixa (com unidades por caixa); margem sobre o custo da unidade de venda, com alerta abaixo de 30% (`Ficha.custos`) |
| Histórico de preços dos insumos | tabela `insumo_preco`, com a lista de alterações na tela de Insumos |
| RF7 Catálogo com busca e situação | `backend/controllers/catalogoController.js` e `frontend/js/abas/catalogo.js` |
| Alerta de ficha desatualizada | situação "Desatualizada" quando o preço de um insumo muda |
| RF8 Usuários e perfis (Admin e Usuário) | `backend/controllers/usuarioController.js` e `backend/models/usuarioModel.js` |
| RF9 Meu perfil (nome, login e senha) | `backend/controllers/perfilController.js` e `frontend/js/abas/perfil.js` |
| RF10 Relatório de variação de preços dos insumos (período, impressão) | `backend/controllers/variacaoController.js` e `Insumo.variacaoDePrecos` (`backend/models/insumoModel.js`) |
| RF11 Relatório de margem de lucro (categoria, só margem baixa, impressão) | `backend/controllers/margemController.js` |
| RNF5 Login individual com perfis | `backend/controllers/authController.js` e `backend/middlewares/autenticacao.js` (senha com bcrypt) |

**Nada é excluído:** produtos, insumos, categorias e usuários são **inativados** em vez de apagados, então o histórico (fichas, versões e custos) nunca se perde e tudo pode ser reativado. Usuário inativo não consegue entrar.

**Perfis:**
- **Admin** (`admin` no banco): acessa tudo.
- **Usuário** (`usuario` no banco): só consulta o catálogo, e só vê produtos ativos que têm ficha.

## Segurança

- **Senhas:** guardadas só como hash, com **bcrypt**.
- **Login:** a sessão fica no MySQL (tabela `sessao`) e o navegador guarda só o identificador, num cookie `HttpOnly` e `SameSite=Strict` (ou `SameSite=None; Secure` com `COOKIE_CROSS_SITE=true`). A sessão expira após 30 minutos sem uso.
- **CORS:** a API só aceita chamadas de navegador vindas dos endereços listados em `FRONTEND_URL`.
- **Banco:** todo SQL usa parâmetros `?`, o que protege contra *SQL Injection*.
- **Telas:** os textos digitados passam pela função `esc()` antes de ir para a tela, o que protege contra *XSS*.
- **Permissões:** são conferidas **no servidor**. Esconder botões na tela é só conveniência.

## Limitações conhecidas (melhorias futuras)

- Não há backup automático. Faça backup pelo MySQL Workbench (*Server → Data Export*).
- Para acesso pela internet, use HTTPS (Railway, Render, Vercel e Netlify já fornecem).
