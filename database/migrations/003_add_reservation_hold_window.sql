SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND column_name = 'reservation_starts_at'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE reservation_holds ADD COLUMN reservation_starts_at DATETIME NULL AFTER expires_at',
  'SELECT 1'
);
PREPARE add_reservation_starts_at FROM @sql;
EXECUTE add_reservation_starts_at;
DEALLOCATE PREPARE add_reservation_starts_at;

SET @column_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND column_name = 'reservation_ends_at'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE reservation_holds ADD COLUMN reservation_ends_at DATETIME NULL AFTER reservation_starts_at',
  'SELECT 1'
);
PREPARE add_reservation_ends_at FROM @sql;
EXECUTE add_reservation_ends_at;
DEALLOCATE PREPARE add_reservation_ends_at;

SET @index_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'reservation_holds'
    AND index_name = 'reservation_holds_reservation_window_idx'
);

SET @sql := IF(
  @index_exists = 0,
  'ALTER TABLE reservation_holds ADD INDEX reservation_holds_reservation_window_idx (reservation_starts_at, reservation_ends_at, expires_at)',
  'SELECT 1'
);
PREPARE add_reservation_hold_window_idx FROM @sql;
EXECUTE add_reservation_hold_window_idx;
DEALLOCATE PREPARE add_reservation_hold_window_idx;
