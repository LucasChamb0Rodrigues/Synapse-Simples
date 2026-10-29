class Seguranca {
  static origensPermitidas() {
    return (process.env.FRONTEND_URL || '')
      .split(',')
      .map((url) => url.trim().replace(/\/$/, ''))
      .filter(Boolean);
  }

  static cabecalhos(req, res, next) {
    res.set({
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    next();
  }

  static cors(req, res, next) {
    const origem = req.headers.origin;
    if (origem && Seguranca.origensPermitidas().includes(origem)) {
      res.set({
        'Access-Control-Allow-Origin': origem,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
      });
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  }
}

module.exports = Seguranca;
