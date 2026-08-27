SET @dedupe_column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'notification_outbox'
    AND column_name = 'dedupe_key'
);
SET @dedupe_column_sql := IF(
  @dedupe_column_exists = 0,
  'ALTER TABLE notification_outbox ADD COLUMN dedupe_key VARCHAR(160) NULL AFTER recipient',
  'SELECT 1'
);
PREPARE add_dedupe_column FROM @dedupe_column_sql;
EXECUTE add_dedupe_column;
DEALLOCATE PREPARE add_dedupe_column;

SET @dedupe_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'notification_outbox'
    AND index_name = 'notification_outbox_dedupe_uq'
);
SET @dedupe_index_sql := IF(
  @dedupe_index_exists = 0,
  'ALTER TABLE notification_outbox ADD UNIQUE KEY notification_outbox_dedupe_uq (dedupe_key)',
  'SELECT 1'
);
PREPARE add_dedupe_index FROM @dedupe_index_sql;
EXECUTE add_dedupe_index;
DEALLOCATE PREPARE add_dedupe_index;
