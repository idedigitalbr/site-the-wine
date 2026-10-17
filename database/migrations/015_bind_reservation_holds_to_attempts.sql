SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND column_name = 'attempt_id_hash'
);

SET @column_sql := IF(
  @column_exists = 0,
  'ALTER TABLE reservation_holds ADD COLUMN attempt_id_hash CHAR(64) NULL AFTER session_token_hash',
  'SELECT 1'
);
PREPARE add_attempt_id_hash FROM @column_sql;
EXECUTE add_attempt_id_hash;
DEALLOCATE PREPARE add_attempt_id_hash;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND index_name = 'reservation_holds_session_table_uq'
);

SET @drop_index_sql := IF(
  @index_exists = 1,
  'ALTER TABLE reservation_holds DROP INDEX reservation_holds_session_table_uq',
  'SELECT 1'
);
PREPARE drop_session_table_uq FROM @drop_index_sql;
EXECUTE drop_session_table_uq;
DEALLOCATE PREPARE drop_session_table_uq;

SET @attempt_index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND index_name = 'reservation_holds_attempt_table_uq'
);

SET @attempt_index_sql := IF(
  @attempt_index_exists = 0,
  'ALTER TABLE reservation_holds ADD UNIQUE KEY reservation_holds_attempt_table_uq (attempt_id_hash, restaurant_table_id)',
  'SELECT 1'
);
PREPARE add_attempt_table_uq FROM @attempt_index_sql;
EXECUTE add_attempt_table_uq;
DEALLOCATE PREPARE add_attempt_table_uq;

SET @attempt_lookup_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND index_name = 'reservation_holds_attempt_idx'
);

SET @attempt_lookup_sql := IF(
  @attempt_lookup_exists = 0,
  'ALTER TABLE reservation_holds ADD INDEX reservation_holds_attempt_idx (attempt_id_hash, expires_at)',
  'SELECT 1'
);
PREPARE add_attempt_lookup_idx FROM @attempt_lookup_sql;
EXECUTE add_attempt_lookup_idx;
DEALLOCATE PREPARE add_attempt_lookup_idx;
