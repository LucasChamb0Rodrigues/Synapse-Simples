// Todas as rotas da API: cada endereço aponta para o método do controller que responde a ele.
const express = require('express');
const auth = require('./controllers/authController');
const catalogo = require('./controllers/catalogoController');
const produtos = require('./controllers/produtoController');
const insumos = require('./controllers/insumoController');
const categorias = require('./controllers/categoriaController');
const relatorio = require('./controllers/relatorioController');
const usuarios = require('./controllers/usuarioController');
const auditoria = require('./controllers/auditoriaController');
const perfil = require('./controllers/perfilController');
const ErroApp = require('./models/ErroApp');

const rotas = express.Router();

// ---------- Abertas a todos ----------
rotas.get('/situacao', auth.situacao);
rotas.post('/primeiro-acesso', auth.primeiroAcesso);
rotas.post('/login', auth.login);
rotas.post('/logout', auth.logout);

// ---------- Daqui para baixo, só quem fez login ----------
rotas.use((req, res, next) => {
  if (!req.session.usuario) throw new ErroApp(401, 'Faça login para continuar.');
  next();
});

rotas.get('/catalogo', catalogo.listar);
rotas.get('/catalogo/:id', catalogo.detalhe);

rotas.get('/perfil', perfil.ver);
rotas.put('/perfil', perfil.alterar);

// ---------- Daqui para baixo, só o perfil Admin (recepcao no banco) ----------
rotas.use((req, res, next) => {
  if (req.session.usuario.perfil !== 'recepcao') throw new ErroApp(403, 'Seu perfil não tem permissão para esta ação.');
  next();
});

rotas.post('/produtos', produtos.criar);
rotas.put('/produtos/:id', produtos.alterar);
rotas.patch('/produtos/:id/ativo', produtos.mudarAtivo);
rotas.delete('/produtos/:id', produtos.excluir);
rotas.post('/produtos/:id/ficha', produtos.salvarFicha);

rotas.get('/insumos', insumos.listar);
rotas.post('/insumos', insumos.criar);
rotas.put('/insumos/:id', insumos.alterar);
rotas.delete('/insumos/:id', insumos.excluir);

rotas.get('/categorias', categorias.listar);
rotas.post('/categorias', categorias.criar);
rotas.put('/categorias/:id', categorias.alterar);
rotas.delete('/categorias/:id', categorias.excluir);

rotas.get('/relatorio', relatorio.gerar);

rotas.get('/usuarios', usuarios.listar);
rotas.post('/usuarios', usuarios.criar);
rotas.put('/usuarios/:id', usuarios.alterar);
rotas.delete('/usuarios/:id', usuarios.excluir);

rotas.get('/auditoria', auditoria.listar);

module.exports = rotas;
