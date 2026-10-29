class Api {
  static async chamar(metodo, url, dados) {
    const resposta = await fetch(Configuracao.apiUrl() + url, {
      method: metodo,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: dados && JSON.stringify(dados),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (resposta.ok) return corpo;
    if (resposta.status === 401 && sistema.usuario) location.reload();
    Tela.avisar(corpo.erro || 'Erro ao comunicar com o servidor.', 'danger');
    throw new Error(corpo.erro);
  }
}
