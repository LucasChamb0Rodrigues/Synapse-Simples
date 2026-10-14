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

## Organização dos arquivos (MVC)

```
servidor.js        Liga o servidor: configura o login (sessão), as telas, as rotas e os erros
rotas.js           Liga cada endereço da API a uma função de controller (e barra quem não tem permissão)
banco.sql          Criação das tabelas

models/            M: conversam com o MySQL (só SQL, uma tabela por arquivo)
  banco.js           conexão com o MySQL
  produtoModel.js    fichaModel.js    insumoModel.js    categoriaModel.js
  usuarioModel.js    auditoriaModel.js

views/             V: as telas que rodam no navegador
  index.html         todas as telas (uma aba para cada)
  app.js             todo o JavaScript das telas
  estilo.css         cores e layout

controllers/       C: recebem o pedido, validam os dados, chamam o model e respondem
  authController.js       login, logout, primeiro acesso
  catalogoController.js   lista de produtos com situação e custo; detalhe da ficha
  produtoController.js    cadastro de produtos + gravação da ficha técnica
  insumoController.js     categoriaController.js    usuarioController.js
  relatorioController.js  auditoriaController.js
  ajuda.js                pequenas funções usadas por todos (falha, texto, numero)
```

---

## Como um clique vira dado no banco (exemplo: cadastrar insumo)

1. **View:** o usuário preenche o formulário e clica em **Cadastrar**. O `views/app.js` chama `api('POST', '/api/insumos', dados)`.
2. **Rota:** o `rotas.js` confere se a pessoa está logada e é da Recepção, e chama `insumos.criar`.
3. **Controller:** `controllers/insumoController.js` valida os dados e chama o model.
4. **Model:** `models/insumoModel.js` faz o `INSERT` no MySQL. O controller grava a auditoria pelo `auditoriaModel.js`.
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
