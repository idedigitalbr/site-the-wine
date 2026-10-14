CREATE TABLE IF NOT EXISTS system_reservation_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  public_reservation_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT system_reservation_settings_singleton_chk CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_reservation_settings (id, public_reservation_enabled)
VALUES (1, 1)
ON DUPLICATE KEY UPDATE id = VALUES(id);
