CREATE TABLE IF NOT EXISTS floor_plan_assets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(160) NOT NULL,
  mime_type VARCHAR(32) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  blob_data MEDIUMBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_floor_plan_assets_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
