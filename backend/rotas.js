const express = require('express');
const auth = require('./controllers/authController');
const catalogo = require('./controllers/catalogoController');
const produtos = require('./controllers/produtoController');
const insumos = require('./controllers/insumoController');
const categorias = require('./controllers/categoriaController');
const relatorio = require('./controllers/relatorioController');
const usuarios = require('./controllers/usuarioController');
const perfil = require('./controllers/perfilController');
const Usuario = require('./models/usuarioModel');
const ErroApp = require('./models/ErroApp');

const rotas = express.Router();

rotas.use(async (req, res, next) => {
  if (req.session.usuario) {
    const usuario = await Usuario.buscarPorId(req.session.usuario.id);
    if (usuario?.ativo) req.session.usuario = usuario.dadosDaSessao();
    else delete req.session.usuario;
  }
  next();
});

rotas.get('/situacao', auth.situacao);
rotas.post('/primeiro-acesso', auth.primeiroAcesso);
rotas.post('/login', auth.login);
rotas.post('/logout', auth.logout);

rotas.use((req, res, next) => {
  if (!req.session.usuario) throw new ErroApp(401, 'Faça login para continuar.');
  next();
});

rotas.get('/catalogo', catalogo.listar);
rotas.get('/catalogo/:id', catalogo.detalhe);

rotas.get('/perfil', perfil.ver);
rotas.put('/perfil', perfil.alterar);

rotas.use((req, res, next) => {
  if (req.session.usuario.perfil !== 'admin') throw new ErroApp(403, 'Seu perfil não tem permissão para esta ação.');
  next();
});

rotas.post('/produtos', produtos.criar);
rotas.put('/produtos/:id', produtos.alterar);
rotas.patch('/produtos/:id/ativo', produtos.mudarAtivo);
rotas.post('/produtos/:id/ficha', produtos.salvarFicha);

rotas.get('/insumos', insumos.listar);
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
