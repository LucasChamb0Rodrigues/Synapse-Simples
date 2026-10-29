const banco = require('../config/banco');
const Modelo = require('./Modelo');
const ErroApp = require('../utils/ErroApp');

const centavos = (valor) => Math.round(valor * 100) / 100;

class Ficha {
  static MARGEM_MINIMA = 30;

  constructor(dados = {}) {
    Object.assign(this, dados);
  }

  static unidadesDeVenda(produto) {
    return produto?.forma_venda === 'caixa' && produto.unidades_por_caixa > 0
      ? produto.unidades_por_caixa
      : 1;
  }

  static custos(custoInsumos, rendimento = 1, perda = 0, precoVenda = null, unidadesVenda = 1) {
    const lote = centavos(custoInsumos * (1 + perda / 100));
    const unitario = Math.round((lote / rendimento) * 10000) / 10000;
    const venda = Math.round(unitario * unidadesVenda * 10000) / 10000;
    const margem =
      precoVenda > 0 ? Math.round(((precoVenda - venda) / precoVenda) * 1000) / 10 : null;
    return {
      insumos: centavos(custoInsumos),
      lote,
      unitario,
      unidadesVenda,
      venda,
      margem,
      margemBaixa: margem !== null && margem < Ficha.MARGEM_MINIMA,
      margemMinima: Ficha.MARGEM_MINIMA,
    };
  }

  static listarVersoes(produtoId) {
    return banco.sql(
      'SELECT id, versao, criada_em, usuario_nome, custo_total, rendimento, perda FROM ficha_tecnica WHERE produto_id = ? ORDER BY versao DESC',
      [produtoId],
    );
  }

  static listarItens(fichaId) {
    return banco.sql(
      `SELECT i.insumo_id, s.nome, s.unidade, s.ativo, i.quantidade,
              i.custo_unitario AS custo_na_ficha, s.custo AS custo_atual,
              ROUND(i.quantidade * s.custo, 2) AS subtotal
         FROM item_ficha i JOIN insumo s ON s.id = i.insumo_id
        WHERE i.ficha_id = ? ORDER BY s.nome`,
      [fichaId],
    );
  }

  static async buscarVersaoNaData(produtoId, data) {
    const [linha] = await banco.sql(
      `SELECT f.id, f.versao, f.criada_em, f.rendimento, f.perda, p.codigo, p.nome, p.preco_venda, p.forma_venda, p.unidades_por_caixa, c.nome AS categoria
         FROM ficha_tecnica f
         JOIN produto p   ON p.id = f.produto_id
         JOIN categoria c ON c.id = p.categoria_id
        WHERE f.produto_id = ? AND DATE(f.criada_em) <= ?
        ORDER BY f.versao DESC LIMIT 1`,
      [produtoId, data],
    );
    return linha && new Ficha(linha);
  }

  async carregarItens() {
    this.itens = await Ficha.listarItens(this.id);
    this.custo = Ficha.custos(
      this.itens.reduce((soma, item) => soma + item.subtotal, 0),
      this.rendimento,
      this.perda,
      this.preco_venda,
      Ficha.unidadesDeVenda(this),
    );
    this.total = this.custo.lote;
  }

  validar() {
    const itens = Array.isArray(this.itens) ? this.itens : [];
    this.itens = itens.map((item) => ({
      insumo_id: Number(item.insumo_id),
      quantidade: Modelo.numero(item.quantidade),
    }));
    this.rendimento = Modelo.numero(this.rendimento ?? 1);
    this.perda = Modelo.numero(this.perda ?? 0);
    if (this.itens.length === 0) throw new ErroApp(400, 'Adicione pelo menos um insumo à ficha.');
    if (this.itens.some((item) => !(item.quantidade > 0)))
      throw new ErroApp(400, 'Todas as quantidades devem ser maiores que zero.');
    if (new Set(this.itens.map((item) => item.insumo_id)).size !== this.itens.length) {
      throw new ErroApp(400, 'O mesmo insumo aparece mais de uma vez na ficha.');
    }
    if (!(this.rendimento > 0))
      throw new ErroApp(400, 'Informe quantas unidades a receita rende (maior que zero).');
    if (!(this.perda >= 0 && this.perda < 100))
      throw new ErroApp(400, 'A perda deve ser um percentual entre 0 e 99.');
  }

  async salvar(usuario) {
    this.validar();
    await banco.transacao(async (conexao) => {
      const [{ versao }] = await banco.sql(
        'SELECT COALESCE(MAX(versao), 0) + 1 AS versao FROM ficha_tecnica WHERE produto_id = ? FOR UPDATE',
        [this.produto.id],
        conexao,
      );

      let custoInsumos = 0;
      for (const item of this.itens) {
        const [insumo] = await banco.sql(
          'SELECT nome, custo, ativo FROM insumo WHERE id = ?',
          [item.insumo_id],
          conexao,
        );
        if (!insumo) throw new ErroApp(400, 'Um dos insumos da ficha não existe mais.');
        if (!insumo.ativo)
          throw new ErroApp(
            400,
            `O insumo "${insumo.nome}" está inativo. Remova-o da ficha ou reative-o em Insumos.`,
          );
        item.custo = insumo.custo;
        custoInsumos += item.quantidade * insumo.custo;
      }
      const custo = Ficha.custos(custoInsumos, this.rendimento, this.perda);

      const ficha = await banco.sql(
        'INSERT INTO ficha_tecnica (produto_id, versao, usuario_nome, custo_total, rendimento, perda) VALUES (?, ?, ?, ?, ?, ?)',
        [this.produto.id, versao, usuario.nome, custo.lote, this.rendimento, this.perda],
        conexao,
      );
      for (const item of this.itens) {
        await banco.sql(
          'INSERT INTO item_ficha (ficha_id, insumo_id, quantidade, custo_unitario) VALUES (?, ?, ?, ?)',
          [ficha.insertId, item.insumo_id, item.quantidade, item.custo],
          conexao,
        );
      }

      this.id = ficha.insertId;
      this.versao = versao;
      this.custoTotal = custo.lote;
      this.custoUnitario = custo.unitario;
    });
  }
}

module.exports = Ficha;
