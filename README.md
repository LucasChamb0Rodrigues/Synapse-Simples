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

O endereço da API que as telas usam fica em `frontend/config.js`. No computador ele já aponta para a porta 3000.

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
1. Confira o endereço da API (passo 2). Se não for `https://synapse-api.vercel.app`, corrija em `frontend/vercel.json` e faça `git push`.
2. Na Vercel → **Add New → Project** → importe **o mesmo repositório** de novo.
3. **Project Name**: `synapse` · **Root Directory**: `frontend` · **Framework Preset**: `Other` · sem variáveis de ambiente.
4. **Deploy**. O sistema abre em `https://synapse.vercel.app` (ou o nome que a Vercel der). Com o banco vazio, o primeiro acesso pede para criar o Admin.

Depois disso, cada `git push` na `main` atualiza as telas e a API sozinho.

---

## Organização dos arquivos (MVC, orientado a objetos)

```
backend/             A API (Model + Controller)
  aplicacao.js         A API: CORS, login (sessão no MySQL), rotas e erros
  servidor.js          Liga a API no computador (npm start)
  api/index.js         Entrada da API na Vercel
  vercel.json          Na Vercel, manda todos os endereços para o api/index.js
  rotas.js             Liga cada endereço da API a um método de controller (e barra quem não tem permissão)
  banco.sql            Criação das tabelas
  .env.example         Modelo das configurações (copie para .env)

iniciar.js           Só para o computador: "npm start" na raiz liga a API e as telas juntas

  models/              M: uma classe por entidade (cada objeto é uma linha da tabela)
    banco.js             classe Banco: conexão com o MySQL, sql() e transacao()
    ErroApp.js           classe ErroApp: erro com status HTTP que vira mensagem na tela
    Modelo.js            classe base: listar, buscarPorId, buscarOuFalhar, preencher, validar, salvar, excluir
    categoriaModel.js    Categoria extends Modelo
    insumoModel.js       Insumo extends Modelo
    produtoModel.js      Produto extends Modelo (situação no catálogo, inativar, novaFicha)
    usuarioModel.js      Usuario extends Modelo (senha com hash, autenticar)
    fichaModel.js        Ficha: valida os itens e grava uma nova versão (transação)
    auditoriaModel.js    Auditoria: registrar e listar
    sessaoModel.js       SessaoStore: guarda os logins na tabela sessao

  controllers/         C: uma classe por assunto; recebem o pedido, usam os objetos dos models e respondem
    Controller.js           classe base (liga os métodos ao objeto e grava a auditoria)
    authController.js       login, logout, primeiro acesso
    catalogoController.js   lista de produtos com situação e custo; detalhe da ficha
    produtoController.js    cadastro de produtos + gravação da ficha técnica
    insumoController.js     categoriaController.js    usuarioController.js
    relatorioController.js  auditoriaController.js    perfilController.js

frontend/            V: as telas que rodam no navegador
  index.html           todas as telas (uma aba para cada); os botões chamam o objeto "sistema"
  config.js            endereço da API (no computador aponta para a porta 3000; na Vercel usa o repasse)
  vercel.json          na Vercel, repassa /api/... para o projeto da API
  app.js               classes Api, Tela, Aba, Cadastro, uma classe por aba e Sistema
  estilo.css           cores e layout
```

**Onde aparece a orientação a objetos:**

- **Classes e objetos:** cada registro do banco vira um objeto (`new Produto(...)`), com dados e comportamento juntos (`produto.salvar()`, `produto.mudarAtivo(false)`, `usuario.conferirSenha(...)`).
- **Herança:** `Categoria`, `Insumo`, `Produto` e `Usuario` herdam de `Modelo`; os controllers herdam de `Controller`; na tela, as abas herdam de `Aba` e `Cadastro`.
- **Polimorfismo:** `Modelo.salvar()` chama `this.validar()`, e cada classe filha tem a sua própria validação. O mesmo vale para `descricao()` e, na tela, para o `carregar()` de cada aba.
- **Encapsulamento:** as regras ficam dentro da classe dona delas (ex.: só o `Usuario` sabe gerar e conferir o hash da senha; só a `Ficha` sabe calcular o custo e gravar a versão).

---

## Como um clique vira dado no banco (exemplo: cadastrar insumo)

1. **View:** o usuário preenche o formulário e clica em **Cadastrar**. O `frontend/app.js` chama `Cadastro.salvarJanela(evento)`, que faz `Api.chamar('POST', '/api/insumos', dados)`.
2. **Rota:** o `backend/rotas.js` confere se a pessoa está logada e é Admin, e chama o método `criar` do `InsumoController`.
3. **Controller:** `backend/controllers/insumoController.js` cria o objeto `new Insumo().preencher(dados)` e chama `insumo.salvar()`.
4. **Model:** `insumo.salvar()` (herdado de `Modelo`) chama `validar()` da classe `Insumo` e faz o `INSERT` no MySQL. O controller grava a auditoria com `this.auditar(...)`.
5. O controller responde `{ ok: true }`. A tela mostra "Salvo!" e recarrega a tabela.

Para **editar**, o botão "Editar" coloca os dados no mesmo formulário e a tela envia um `PUT` em vez de `POST`.

---

## Requisitos atendidos

| Requisito | Onde está |
|---|---|
| RF1 Produtos (cadastrar, alterar, inativar, excluir) | `backend/controllers/produtoController.js` |
| RF2 Insumos (não exclui se estiver em ficha) | `backend/controllers/insumoController.js` |
| RF3 Categorias (não exclui se tiver produto) | `backend/controllers/categoriaController.js` |
| RF4 Relatório de custo (data, impressão) | `backend/controllers/relatorioController.js` |
| RF5 Ficha técnica com versões | tabelas `ficha_tecnica` e `item_ficha`; `backend/models/fichaModel.js` |
| RF6 Custo calculado automaticamente | o servidor busca o preço dos insumos e calcula (`backend/models/fichaModel.js`) |
| RF7 Catálogo com busca e situação | `backend/controllers/catalogoController.js` e `frontend/app.js` |
| Alerta de ficha desatualizada | situação "Desatualizada" quando o preço de um insumo muda |
| RNF4 Rastreabilidade | tabela `auditoria`, gravada em toda alteração |
| RNF5 Login individual com perfis | `backend/controllers/authController.js` e `backend/rotas.js` (senha com bcrypt) |

**Perfis:**
- **Admin** (`recepcao` no banco): acessa tudo.
- **Usuário** (`entrega` no banco): só consulta o catálogo, e só vê produtos ativos que têm ficha.

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
