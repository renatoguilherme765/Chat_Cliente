-- Confirmação de entrega e leitura de mensagens (cliente <- especialista).
-- IF NOT EXISTS torna a migração segura para re-execução (idempotente).
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz;
