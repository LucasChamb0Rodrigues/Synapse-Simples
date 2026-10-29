const express = require('express');
const auth = require('./controllers/authController');
const catalogo = require('./controllers/catalogoController');
const produtos = require('./controllers/produtoController');
const insumos = require('./controllers/insumoController');
const categorias = require('./controllers/categoriaController');
const relatorio = require('./controllers/relatorioController');
const usuarios = require('./controllers/usuarioController');
const perfil = require('./controllers/perfilController');
const {
  atualizarUsuarioDaSessao,
  exigirLogin,
  exigirAdmin,
} = require('./middlewares/autenticacao');

const rotas = express.Router();
rotas.use(atualizarUsuarioDaSessao);

// Abertas: qualquer pessoa pode chamar
rotas.get('/situacao', auth.situacao);
rotas.post('/primeiro-acesso', auth.primeiroAcesso);
rotas.post('/login', auth.login);
rotas.post('/logout', auth.logout);

// Daqui para baixo: precisa estar logado
rotas.use(exigirLogin);

rotas.get('/catalogo', catalogo.listar);
rotas.get('/catalogo/:id', catalogo.detalhe);

rotas.get('/perfil', perfil.ver);
rotas.put('/perfil', perfil.alterar);

// Daqui para baixo: só o Admin
rotas.use(exigirAdmin);

rotas.post('/produtos', produtos.criar);
rotas.put('/produtos/:id', produtos.alterar);
rotas.patch('/produtos/:id/ativo', produtos.mudarAtivo);
rotas.post('/produtos/:id/ficha', produtos.salvarFicha);

rotas.get('/insumos', insumos.listar);
rotas.get('/insumos/:id/precos', insumos.precos);
rotas.post('/insumos', insumos.criar);
rotas.put('/insumos/:id', insumos.alterar);
rotas.patch('/insumos/:id/ativo', insumos.mudarAtivo);

rotas.get('/categorias', categorias.listar);
rotas.post('/categorias', categorias.criar);
rotas.put('/categorias/:id', categorias.alterar);
rotas.patch('/categorias/:id/ativo', categorias.mudarAtivo);

rotas.get('/relatorio', relatorio.gerar);

rotas.get('/usuarios', usuarios.listar);
rotas.post('/usuarios', usuarios.criar);
rotas.put('/usuarios/:id', usuarios.alterar);
rotas.patch('/usuarios/:id/ativo', usuarios.mudarAtivo);

module.exports = rotas;
