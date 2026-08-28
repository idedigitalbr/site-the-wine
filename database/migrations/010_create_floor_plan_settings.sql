CREATE TABLE IF NOT EXISTS floor_plan_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  background_url VARCHAR(2048) NULL,
  background_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.24,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT floor_plan_settings_singleton_chk CHECK (id = 1),
  CONSTRAINT floor_plan_settings_opacity_chk CHECK (background_opacity BETWEEN 0.10 AND 0.80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO floor_plan_settings (id)
VALUES (1)
ON DUPLICATE KEY UPDATE id = VALUES(id);
