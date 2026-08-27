ALTER TABLE notification_outbox
  ADD COLUMN dedupe_key VARCHAR(160) NULL AFTER recipient,
  ADD UNIQUE KEY notification_outbox_dedupe_uq (dedupe_key);
