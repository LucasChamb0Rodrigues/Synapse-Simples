# Synapse — versão simplificada

Sistema web para cadastrar as **fichas técnicas** dos produtos da Gebon Sorvetes e calcular o **custo** de cada produto.

**Tecnologias:** Node.js + Express (servidor), MySQL (banco de dados), HTML + Bootstrap (só o CSS) + JavaScript puro (telas).

```
Navegador (views/)  ──pede dados (fetch)──►  Servidor Express (MVC)       ──SQL──►  MySQL
   telas e botões     ◄──responde em JSON──     regras e permissões      ◄──────    tabelas
```

---

## Como rodar

1. Instale o **Node.js 22 ou mais novo** e o **MySQL 8**.
2. Crie o banco: abra o arquivo `banco.sql` no MySQL Workbench e execute. Outra opção é rodar no Prompt de Comando:
   ```bat
   mysql -u root -p < banco.sql
   ```
3. Copie `.env.example` para `.env` e preencha a senha do MySQL (`DB_PASSWORD`) e uma frase secreta (`SESSION_SECRET`).
4. Na pasta do projeto:
   ```bat
   npm install
   npm start
   ```
5. Abra <http://localhost:3000>. No primeiro acesso, o sistema pede para criar o usuário da **Recepção** (administrador).

---

## Organização dos arquivos (MVC, orientado a objetos)

```
servidor.js        Liga o servidor: configura o login (sessão), as telas, as rotas e os erros
rotas.js           Liga cada endereço da API a um método de controller (e barra quem não tem permissão)
banco.sql          Criação das tabelas

models/            M: uma classe por entidade (cada objeto é uma linha da tabela)
  banco.js           classe Banco: conexão com o MySQL, sql() e transacao()
  ErroApp.js         classe ErroApp: erro com status HTTP que vira mensagem na tela
  Modelo.js          classe base: listar, buscarPorId, buscarOuFalhar, preencher, validar, salvar, excluir
  categoriaModel.js  Categoria extends Modelo
  insumoModel.js     Insumo extends Modelo
  produtoModel.js    Produto extends Modelo (situação no catálogo, inativar, novaFicha)
  usuarioModel.js    Usuario extends Modelo (senha com hash, autenticar)
  fichaModel.js      Ficha: valida os itens e grava uma nova versão (transação)
  auditoriaModel.js  Auditoria: registrar e listar

views/             V: as telas que rodam no navegador
  index.html         todas as telas (uma aba para cada); os botões chamam o objeto "sistema"
  app.js             classes Api, Tela, Aba, Cadastro, uma classe por aba e Sistema
  estilo.css         cores e layout

controllers/       C: uma classe por assunto; recebem o pedido, usam os objetos dos models e respondem
  Controller.js           classe base (liga os métodos ao objeto e grava a auditoria)
  authController.js       login, logout, primeiro acesso
  catalogoController.js   lista de produtos com situação e custo; detalhe da ficha
  produtoController.js    cadastro de produtos + gravação da ficha técnica
  insumoController.js     categoriaController.js    usuarioController.js
  relatorioController.js  auditoriaController.js
```

**Onde aparece a orientação a objetos:**

- **Classes e objetos:** cada registro do banco vira um objeto (`new Produto(...)`), com dados e comportamento juntos (`produto.salvar()`, `produto.mudarAtivo(false)`, `usuario.conferirSenha(...)`).
- **Herança:** `Categoria`, `Insumo`, `Produto` e `Usuario` herdam de `Modelo`; os controllers herdam de `Controller`; na tela, as abas herdam de `Aba` e `Cadastro`.
- **Polimorfismo:** `Modelo.salvar()` chama `this.validar()`, e cada classe filha tem a sua própria validação. O mesmo vale para `descricao()` e, na tela, para o `carregar()` de cada aba.
- **Encapsulamento:** as regras ficam dentro da classe dona delas (ex.: só o `Usuario` sabe gerar e conferir o hash da senha; só a `Ficha` sabe calcular o custo e gravar a versão).

---

## Como um clique vira dado no banco (exemplo: cadastrar insumo)

1. **View:** o usuário preenche o formulário e clica em **Cadastrar**. O `views/app.js` chama `sistema.abas.insumos.salvar(evento)`, que faz `Api.chamar('POST', '/api/insumos', dados)`.
2. **Rota:** o `rotas.js` confere se a pessoa está logada e é da Recepção, e chama o método `criar` do `InsumoController`.
3. **Controller:** `controllers/insumoController.js` cria o objeto `new Insumo().preencher(dados)` e chama `insumo.salvar()`.
4. **Model:** `insumo.salvar()` (herdado de `Modelo`) chama `validar()` da classe `Insumo` e faz o `INSERT` no MySQL. O controller grava a auditoria com `this.auditar(...)`.
5. O controller responde `{ ok: true }`. A tela mostra "Salvo!" e recarrega a tabela.

Para **editar**, o botão "Editar" coloca os dados no mesmo formulário e a tela envia um `PUT` em vez de `POST`.

---

## Requisitos atendidos

| Requisito | Onde está |
|---|---|
| RF1 Produtos (cadastrar, alterar, inativar, excluir) | `controllers/produtoController.js` |
| RF2 Insumos (não exclui se estiver em ficha) | `controllers/insumoController.js` |
| RF3 Categorias (não exclui se tiver produto) | `controllers/categoriaController.js` |
| RF4 Relatório de custo (data, impressão) | `controllers/relatorioController.js` |
| RF5 Ficha técnica com versões | tabelas `ficha_tecnica` e `item_ficha`; `models/fichaModel.js` |
| RF6 Custo calculado automaticamente | o servidor busca o preço dos insumos e calcula (`models/fichaModel.js`) |
| RF7 Catálogo com busca e situação | `controllers/catalogoController.js` e `views/app.js` |
| Alerta de ficha desatualizada | situação "Desatualizada" quando o preço de um insumo muda |
| RNF4 Rastreabilidade | tabela `auditoria`, gravada em toda alteração |
| RNF5 Login individual com perfis | `controllers/authController.js` e `rotas.js` (senha com bcrypt) |

**Perfis:**
- **Recepção:** acessa tudo.
- **Entrega:** só consulta o catálogo, e só vê produtos ativos que têm ficha.

## Segurança

- **Senhas:** guardadas só como hash, com **bcrypt**.
- **Login:** guardado num cookie `HttpOnly` e `SameSite=Strict`. A sessão expira após 30 minutos sem uso.
- **Banco:** todo SQL usa parâmetros `?`, o que protege contra *SQL Injection*.
- **Telas:** os textos digitados passam pela função `esc()` antes de ir para a tela, o que protege contra *XSS*.
- **Permissões:** são conferidas **no servidor**. Esconder botões na tela é só conveniência.

## Limitações conhecidas (melhorias futuras)

- As sessões ficam na memória do servidor: ao reiniciar o `npm start`, todos precisam entrar de novo.
- Não há backup automático. Faça backup pelo MySQL Workbench (*Server → Data Export*).
- Para acesso pela internet, seria preciso HTTPS.
