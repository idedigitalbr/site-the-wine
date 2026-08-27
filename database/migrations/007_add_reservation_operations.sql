SET @checked_in_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reservations'
    AND column_name = 'checked_in_at'
);
SET @checked_in_sql := IF(
  @checked_in_exists = 0,
  'ALTER TABLE reservations ADD COLUMN checked_in_at DATETIME NULL AFTER cancelled_at',
  'SELECT 1'
);
PREPARE add_checked_in FROM @checked_in_sql;
EXECUTE add_checked_in;
DEALLOCATE PREPARE add_checked_in;

SET @seated_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reservations'
    AND column_name = 'seated_at'
);
SET @seated_sql := IF(
  @seated_exists = 0,
  'ALTER TABLE reservations ADD COLUMN seated_at DATETIME NULL AFTER checked_in_at',
  'SELECT 1'
);
PREPARE add_seated FROM @seated_sql;
EXECUTE add_seated;
DEALLOCATE PREPARE add_seated;

SET @no_show_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'reservations'
    AND column_name = 'no_show_at'
);
SET @no_show_sql := IF(
  @no_show_exists = 0,
  'ALTER TABLE reservations ADD COLUMN no_show_at DATETIME NULL AFTER seated_at',
  'SELECT 1'
);
PREPARE add_no_show FROM @no_show_sql;
EXECUTE add_no_show;
DEALLOCATE PREPARE add_no_show;

CREATE TABLE IF NOT EXISTS reservation_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  from_status VARCHAR(24) NULL,
  to_status VARCHAR(24) NULL,
  actor_type VARCHAR(24) NOT NULL DEFAULT 'admin',
  actor_label VARCHAR(120) NULL,
  event_key VARCHAR(160) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY reservation_events_event_key_uq (event_key),
  KEY reservation_events_timeline_idx (reservation_id, created_at, id),
  CONSTRAINT reservation_events_reservation_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
