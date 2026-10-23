-- Migração: troca os nomes dos perfis guardados no banco.
--   "recepcao" -> "admin"     "entrega" -> "usuario"
-- Rode UMA vez num banco criado antes desta mudança (local e Aiven).
-- Bancos novos, criados pelo banco.sql atual, já nascem com os nomes novos.

USE synapse_simples;

-- 1. A coluna passa a aceitar os nomes antigos e os novos.
ALTER TABLE usuario MODIFY perfil ENUM('recepcao', 'entrega', 'admin', 'usuario') NOT NULL;

-- 2. Converte os usuários atuais.
UPDATE usuario SET perfil = 'admin'   WHERE perfil = 'recepcao';
UPDATE usuario SET perfil = 'usuario' WHERE perfil = 'entrega';

-- 3. Só os nomes novos ficam valendo.
ALTER TABLE usuario MODIFY perfil ENUM('admin', 'usuario') NOT NULL;

-- 4. As sessões abertas guardam o perfil antigo: todos precisam entrar de novo.
--    (A API cria a tabela sessao no primeiro uso; o CREATE é para o banco que ainda não a tem.)
CREATE TABLE IF NOT EXISTS sessao (
  id         VARCHAR(128) PRIMARY KEY,
  dados      TEXT   NOT NULL,
  expira_em  BIGINT NOT NULL
);
DELETE FROM sessao;

-- 5. Auditoria: o texto passa a mostrar o nome da tela, ex.: "Wesley (recepcao)" -> "Wesley (Admin)".
UPDATE auditoria
   SET detalhe = REPLACE(REPLACE(REPLACE(REPLACE(detalhe,
         '(recepcao)', '(Admin)'), '(entrega)', '(Usuário)'),
         '(admin)', '(Admin)'), '(usuario)', '(Usuário)')
 WHERE entidade = 'Usuário';
