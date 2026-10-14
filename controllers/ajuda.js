// Pequenas funções usadas por todos os controllers.

// Interrompe a rota e responde ao navegador com a mensagem de erro (ver tratamento de erros no servidor.js).
function falha(status, mensagem) {
  throw Object.assign(new Error(mensagem), { status });
}

// "  Leite " -> "Leite"
const texto = (valor) => String(valor ?? '').trim();

// Campo vazio vira NaN (inválido) em vez de 0.
const numero = (valor) => (valor === '' || valor == null ? NaN : Number(valor));

module.exports = { falha, texto, numero };
