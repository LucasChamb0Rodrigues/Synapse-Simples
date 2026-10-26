-- Migração: troca a exclusão de registros por inativação.
--   Insumos, categorias e usuários ganham a coluna "ativo" (produtos já tinham).
-- Rode UMA vez num banco criado antes desta mudança (local e Aiven), ANTES de publicar a nova versão da API.
-- Bancos novos, criados pelo banco.sql atual, já nascem com a coluna.

USE synapse_simples;

ALTER TABLE insumo    ADD ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categoria ADD ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuario   ADD ativo BOOLEAN NOT NULL DEFAULT TRUE;
