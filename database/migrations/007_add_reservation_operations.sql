ALTER TABLE reservations
  ADD COLUMN checked_in_at DATETIME NULL AFTER cancelled_at,
  ADD COLUMN seated_at DATETIME NULL AFTER checked_in_at,
  ADD COLUMN no_show_at DATETIME NULL AFTER seated_at;

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
