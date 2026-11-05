const test = require('node:test');
const assert = require('node:assert');
const banco = require('../config/banco');
const Insumo = require('../models/insumoModel');

test('não salva insumo com custo negativo', async () => {
  let salvou = false;
  banco.sql = async () => {
    salvou = true;
    return { insertId: 1 };
  };

  const insumo = new Insumo({ nome: 'Açúcar', unidade: 'KG', custo: -1 });

  await assert.rejects(insumo.salvar(), {
    status: 400,
    message: 'Informe um custo válido (maior que zero).',
  });
  assert.equal(salvou, false);
});
