class Rotas {
  static INICIAL = 'catalogo';

  static ABAS = [
    // Qualquer pessoa logada
    { nome: 'catalogo', tela: 'catalogo', classe: AbaCatalogo },
    { nome: 'perfil', tela: 'perfil', classe: AbaPerfil },

    // Daqui para baixo: só o Admin
    { nome: 'produtos', tela: 'produto', classe: AbaProdutos, admin: true },
    { nome: 'ficha', tela: 'ficha', classe: AbaFicha, admin: true },
    { nome: 'insumos', tela: 'insumo', classe: AbaInsumos, admin: true },
    { nome: 'categorias', tela: 'categoria', classe: AbaCategorias, admin: true },
    { nome: 'relatorio', tela: 'relatorio', classe: AbaRelatorio, admin: true },
    { nome: 'variacao', tela: 'variacao', classe: AbaVariacao, admin: true },
    { nome: 'margem', tela: 'margem', classe: AbaMargem, admin: true },
    { nome: 'usuarios', tela: 'usuario', classe: AbaUsuarios, admin: true },
  ];

  static endereco(nome) {
    return `#/${nome}`;
  }

  static pode(nome, usuario) {
    const rota = Rotas.ABAS.find((aba) => aba.nome === nome);
    return Boolean(rota) && (!rota.admin || usuario.perfil === 'admin');
  }

  static atual(usuario) {
    const nome = location.hash.replace('#/', '');
    return Rotas.pode(nome, usuario) ? nome : Rotas.INICIAL;
  }
}
