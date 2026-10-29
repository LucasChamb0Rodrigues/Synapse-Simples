const banco = require('./banco');

const COLUNAS = [
  ['usuario', 'ativo', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['categoria', 'ativo', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['insumo', 'ativo', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['produto', 'preco_venda', 'DECIMAL(10,2) NULL'],
  ['produto', 'forma_venda', "ENUM('unidade', 'caixa') NOT NULL DEFAULT 'unidade'"],
  ['produto', 'unidades_por_caixa', 'INT NULL'],
  ['ficha_tecnica', 'rendimento', 'DECIMAL(10,3) NOT NULL DEFAULT 1'],
  ['ficha_tecnica', 'perda', 'DECIMAL(5,2) NOT NULL DEFAULT 0'],
];

class Estrutura {
  static preparar() {
    Estrutura.pronta ??= Estrutura.atualizar().catch((erro) => {
      Estrutura.pronta = null;
      throw erro;
    });
    return Estrutura.pronta;
  }

  static async atualizar() {
    const existentes = await banco.sql(
      'SELECT TABLE_NAME AS tabela, COLUMN_NAME AS coluna FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()',
    );
    const nomes = new Set(existentes.map((c) => `${c.tabela}.${c.coluna}`.toLowerCase()));
    for (const [tabela, coluna, definicao] of COLUNAS) {
      if (nomes.has(`${tabela}.${coluna}`)) continue;
      await banco.sql(`ALTER TABLE ${tabela} ADD ${coluna} ${definicao}`).catch((erro) => {
        if (erro.code !== 'ER_DUP_FIELDNAME') throw erro;
      });
    }

    await banco.sql(`
      CREATE TABLE IF NOT EXISTS insumo_preco (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        insumo_id       INT NOT NULL,
        custo_anterior  DECIMAL(10,4) NULL,
        custo_novo      DECIMAL(10,4) NOT NULL,
        alterado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        usuario_nome    VARCHAR(60) NOT NULL,
        INDEX (insumo_id, alterado_em),
        FOREIGN KEY (insumo_id) REFERENCES insumo(id)
      )`);
    await banco.sql(`
      INSERT INTO insumo_preco (insumo_id, custo_anterior, custo_novo, usuario_nome)
      SELECT i.id, NULL, i.custo, 'Preço inicial' FROM insumo i
       WHERE NOT EXISTS (SELECT 1 FROM insumo_preco p WHERE p.insumo_id = i.id)`);
  }
}

module.exports = Estrutura;
