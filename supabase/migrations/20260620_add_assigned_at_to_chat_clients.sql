-- Adiciona a coluna assigned_at em chat_clients, usada para registrar
-- o momento em que um especialista assume o atendimento.
-- IF NOT EXISTS torna a migração segura para re-execução (idempotente).
ALTER TABLE chat_clients
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
