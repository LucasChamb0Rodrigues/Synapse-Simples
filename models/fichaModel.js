// Tabelas ficha_tecnica e item_ficha. Cada vez que a ficha é salva, vira uma NOVA versão.
const banco = require('./banco');
const Modelo = require('./Modelo');
const ErroApp = require('./ErroApp');
const Auditoria = require('./auditoriaModel');

class Ficha {
  constructor(dados = {}) {
    Object.assign(this, dados);
  }

  // Todas as versões da ficha de um produto (a primeira da lista é a atual).
  static listarVersoes(produtoId) {
    return banco.sql(
      'SELECT id, versao, criada_em, usuario_nome, custo_total FROM ficha_tecnica WHERE produto_id = ? ORDER BY versao DESC',
      [produtoId],
    );
  }

  // Insumos de uma ficha, com o subtotal calculado pelo preço ATUAL do insumo.
  static listarItens(fichaId) {
    return banco.sql(
      `SELECT i.insumo_id, s.nome, s.unidade, i.quantidade,
              i.custo_unitario AS custo_na_ficha, s.custo AS custo_atual,
              ROUND(i.quantidade * s.custo, 2) AS subtotal
         FROM item_ficha i JOIN insumo s ON s.id = i.insumo_id
        WHERE i.ficha_id = ? ORDER BY s.nome`,
      [fichaId],
    );
  }

  // A versão da ficha que valia numa data (usada no relatório).
  static async buscarVersaoNaData(produtoId, data) {
    const [linha] = await banco.sql(
      `SELECT f.id, f.versao, f.criada_em, p.codigo, p.nome, c.nome AS categoria
         FROM ficha_tecnica f
         JOIN produto p   ON p.id = f.produto_id
         JOIN categoria c ON c.id = p.categoria_id
        WHERE f.produto_id = ? AND DATE(f.criada_em) <= ?
        ORDER BY f.versao DESC LIMIT 1`,
      [produtoId, data],
    );
    return linha && new Ficha(linha);
  }

  // Busca os insumos desta ficha e soma o custo total pelos preços atuais.
  async carregarItens() {
    this.itens = await Ficha.listarItens(this.id);
    this.total = Math.round(this.itens.reduce((soma, item) => soma + item.subtotal, 0) * 100) / 100;
  }

  // O navegador manda só insumo + quantidade; o preço e o custo total são calculados no salvar().
  validar() {
    const itens = Array.isArray(this.itens) ? this.itens : [];
    this.itens = itens.map((item) => ({ insumo_id: Number(item.insumo_id), quantidade: Modelo.numero(item.quantidade) }));
    if (this.itens.length === 0) throw new ErroApp(400, 'Adicione pelo menos um insumo à ficha.');
    if (this.itens.some((item) => !(item.quantidade > 0))) throw new ErroApp(400, 'Todas as quantidades devem ser maiores que zero.');
    if (new Set(this.itens.map((item) => item.insumo_id)).size !== this.itens.length) {
      throw new ErroApp(400, 'O mesmo insumo aparece mais de uma vez na ficha.');
    }
  }

  // Grava uma nova versão com o preço atual de cada insumo e calcula o custo total.
  // Transação: ou grava tudo (ficha + itens + auditoria), ou não grava nada.
  async salvar(usuario) {
    this.validar();
    await banco.transacao(async (conexao) => {
      const [{ versao }] = await banco.sql(
        'SELECT COALESCE(MAX(versao), 0) + 1 AS versao FROM ficha_tecnica WHERE produto_id = ? FOR UPDATE',
        [this.produto.id], conexao,
      );

      let custoTotal = 0;
      for (const item of this.itens) {
        const [insumo] = await banco.sql('SELECT custo FROM insumo WHERE id = ?', [item.insumo_id], conexao);
        if (!insumo) throw new ErroApp(400, 'Um dos insumos da ficha não existe mais.');
        item.custo = insumo.custo;
        custoTotal += item.quantidade * insumo.custo;
      }
      custoTotal = Math.round(custoTotal * 100) / 100;

      const ficha = await banco.sql(
        'INSERT INTO ficha_tecnica (produto_id, versao, usuario_nome, custo_total) VALUES (?, ?, ?, ?)',
        [this.produto.id, versao, usuario.nome, custoTotal], conexao,
      );
      for (const item of this.itens) {
        await banco.sql(
          'INSERT INTO item_ficha (ficha_id, insumo_id, quantidade, custo_unitario) VALUES (?, ?, ?, ?)',
          [ficha.insertId, item.insumo_id, item.quantidade, item.custo], conexao,
        );
      }
      await Auditoria.registrar(usuario, 'Salvou ficha', 'Ficha técnica', `${this.produto.codigo} - v${versao}`, conexao);

      this.id = ficha.insertId;
      this.versao = versao;
      this.custoTotal = custoTotal;
    });
  }
}

module.exports = Ficha;
