const banco = require('./banco');
const Modelo = require('./Modelo');
const ErroApp = require('./ErroApp');
const Ficha = require('./fichaModel');

class Produto extends Modelo {
  static tabela = 'produto';
  static campos = ['codigo', 'nome', 'categoria_id'];
  static naoEncontrado = 'Produto não encontrado.';

  static async listarCatalogo() {
    const linhas = await banco.sql(`
      SELECT p.id, p.codigo, p.nome, p.ativo, p.categoria_id, c.nome AS categoria,
             f.id AS ficha_id, f.versao, t.custo_atual, t.insumos_alterados
        FROM produto p
        JOIN categoria c ON c.id = p.categoria_id
        LEFT JOIN ficha_tecnica f
               ON f.produto_id = p.id
              AND f.versao = (SELECT MAX(versao) FROM ficha_tecnica WHERE produto_id = p.id)
        LEFT JOIN (SELECT i.ficha_id,
                          ROUND(SUM(i.quantidade * s.custo), 2) AS custo_atual,
                          SUM(i.custo_unitario <> s.custo)      AS insumos_alterados
                     FROM item_ficha i JOIN insumo s ON s.id = i.insumo_id
                    GROUP BY i.ficha_id) t ON t.ficha_id = f.id
       ORDER BY p.nome`);
    return linhas.map((linha) => {
      const produto = new Produto(linha);
      produto.situacao = produto.calcularSituacao();
      return produto;
    });
  }

  static async buscarPorId(id) {
    const [linha] = await banco.sql(
      'SELECT p.*, c.nome AS categoria FROM produto p JOIN categoria c ON c.id = p.categoria_id WHERE p.id = ?',
      [id],
    );
    return linha && new Produto(linha);
  }

  async validar() {
    this.codigo = Modelo.texto(this.codigo).toUpperCase();
    this.nome = Modelo.texto(this.nome);
    if (!/^[A-Z0-9._-]{1,20}$/.test(this.codigo)) throw new ErroApp(400, 'O código deve ter de 1 a 20 caracteres (letras, números, ponto, hífen ou _).');
    if (!this.nome) throw new ErroApp(400, 'Informe o nome do produto.');
    if (!this.categoria_id) throw new ErroApp(400, 'Selecione uma categoria.');

    const [categoria] = await banco.sql('SELECT ativo FROM categoria WHERE id = ?', [this.categoria_id]);
    if (!categoria) throw new ErroApp(400, 'A categoria escolhida não existe mais.');
    if (!categoria.ativo) {
      const [salvo] = this.id ? await banco.sql('SELECT categoria_id FROM produto WHERE id = ?', [this.id]) : [];
      if (salvo?.categoria_id !== Number(this.categoria_id)) throw new ErroApp(400, 'Esta categoria está inativa. Escolha outra ou reative-a em Categorias.');
    }

    const repetidos = await banco.sql('SELECT id, ativo FROM produto WHERE (codigo = ? OR nome = ?) AND id <> ?', [this.codigo, this.nome, this.id || 0]);
    if (repetidos.some((p) => !p.ativo)) throw new ErroApp(409, 'Já existe um produto inativo com esse código ou nome. Reative-o na lista de produtos.');
    if (repetidos.length > 0) throw new ErroApp(409, 'Já existe um produto com esse código ou nome.');
  }

  descricao() {
    return `${this.codigo} - ${this.nome}`;
  }

  calcularSituacao() {
    if (!this.ativo) return 'Inativo';
    if (!this.ficha_id) return 'Sem ficha';
    if (this.insumos_alterados > 0) return 'Desatualizada';
    return 'Ativa';
  }

  novaFicha(itens) {
    if (!this.ativo) throw new ErroApp(400, 'Produto inativo não pode receber ficha técnica.');
    return new Ficha({ produto: this, itens });
  }
}

module.exports = Produto;
