CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  normalized_phone VARCHAR(20) NOT NULL,
  email VARCHAR(254) NULL,
  birth_date DATE NULL,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  notes VARCHAR(1000) NULL,
  first_visit_at DATETIME NULL,
  last_visit_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY customers_normalized_phone_uq (normalized_phone),
  KEY customers_email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dining_areas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY dining_areas_code_uq (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS table_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  capacity_min SMALLINT UNSIGNED NOT NULL,
  capacity_max SMALLINT UNSIGNED NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY table_types_code_uq (code),
  CONSTRAINT table_types_capacity_chk CHECK (capacity_min BETWEEN 1 AND capacity_max)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  area_id BIGINT UNSIGNED NOT NULL,
  table_type_id BIGINT UNSIGNED NOT NULL,
  capacity_min SMALLINT UNSIGNED NOT NULL,
  capacity_max SMALLINT UNSIGNED NOT NULL,
  position_x DECIMAL(8,2) NOT NULL DEFAULT 0,
  position_y DECIMAL(8,2) NOT NULL DEFAULT 0,
  width DECIMAL(8,2) NOT NULL DEFAULT 80,
  height DECIMAL(8,2) NOT NULL DEFAULT 80,
  rotation DECIMAL(6,2) NOT NULL DEFAULT 0,
  shape VARCHAR(16) NOT NULL DEFAULT 'retangular',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  joinable BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY restaurant_tables_code_uq (code),
  KEY restaurant_tables_area_idx (area_id),
  KEY restaurant_tables_type_idx (table_type_id),
  CONSTRAINT restaurant_tables_area_fk FOREIGN KEY (area_id) REFERENCES dining_areas (id),
  CONSTRAINT restaurant_tables_type_fk FOREIGN KEY (table_type_id) REFERENCES table_types (id),
  CONSTRAINT restaurant_tables_capacity_chk CHECK (capacity_min BETWEEN 1 AND capacity_max),
  CONSTRAINT restaurant_tables_shape_chk CHECK (shape IN ('redonda', 'quadrada', 'retangular', 'balcao'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS table_combinations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY table_combinations_code_uq (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS table_combination_items (
  combination_id BIGINT UNSIGNED NOT NULL,
  table_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (combination_id, table_id),
  CONSTRAINT table_combination_items_combination_fk
    FOREIGN KEY (combination_id) REFERENCES table_combinations (id) ON DELETE CASCADE,
  CONSTRAINT table_combination_items_table_fk
    FOREIGN KEY (table_id) REFERENCES restaurant_tables (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_shifts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY service_shifts_code_uq (code),
  CONSTRAINT service_shifts_window_chk CHECK (starts_at < ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS business_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  day_of_week TINYINT UNSIGNED NOT NULL,
  service_shift_id BIGINT UNSIGNED NOT NULL,
  opens_at TIME NOT NULL,
  closes_at TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY business_hours_day_shift_uq (day_of_week, service_shift_id),
  CONSTRAINT business_hours_shift_fk FOREIGN KEY (service_shift_id) REFERENCES service_shifts (id),
  CONSTRAINT business_hours_day_chk CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT business_hours_window_chk CHECK (opens_at < closes_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocked_periods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dining_area_id BIGINT UNSIGNED NULL,
  restaurant_table_id BIGINT UNSIGNED NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  reason VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY blocked_periods_window_idx (starts_at, ends_at),
  KEY blocked_periods_area_idx (dining_area_id),
  KEY blocked_periods_table_idx (restaurant_table_id),
  CONSTRAINT blocked_periods_area_fk FOREIGN KEY (dining_area_id) REFERENCES dining_areas (id),
  CONSTRAINT blocked_periods_table_fk FOREIGN KEY (restaurant_table_id) REFERENCES restaurant_tables (id),
  CONSTRAINT blocked_periods_window_chk CHECK (starts_at < ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS experiences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 120,
  min_guests SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  max_guests SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY experiences_slug_uq (slug),
  CONSTRAINT experiences_duration_chk CHECK (duration_minutes BETWEEN 15 AND 720),
  CONSTRAINT experiences_guests_chk CHECK (min_guests BETWEEN 1 AND max_guests AND max_guests <= 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_code VARCHAR(24) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  experience_id BIGINT UNSIGNED NULL,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  guest_count SMALLINT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  preferred_table_type_id BIGINT UNSIGNED NULL,
  source VARCHAR(24) NOT NULL DEFAULT 'website',
  notes VARCHAR(500) NULL,
  internal_notes VARCHAR(1000) NULL,
  confirmation_token_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelled_at DATETIME NULL,
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY reservations_public_code_uq (public_code),
  UNIQUE KEY reservations_confirmation_token_uq (confirmation_token_hash),
  KEY reservations_date_status_idx (reservation_date, status),
  KEY reservations_customer_idx (customer_id),
  KEY reservations_experience_idx (experience_id),
  CONSTRAINT reservations_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT reservations_experience_fk FOREIGN KEY (experience_id) REFERENCES experiences (id),
  CONSTRAINT reservations_table_type_fk FOREIGN KEY (preferred_table_type_id) REFERENCES table_types (id),
  CONSTRAINT reservations_window_chk CHECK (start_time < end_time),
  CONSTRAINT reservations_guests_chk CHECK (guest_count BETWEEN 1 AND 20),
  CONSTRAINT reservations_status_chk CHECK (status IN ('draft', 'hold', 'payment_pending', 'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show', 'expired')),
  CONSTRAINT reservations_source_chk CHECK (source IN ('website', 'admin', 'phone', 'whatsapp', 'walk_in', 'instagram', 'google'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_tables (
  reservation_id BIGINT UNSIGNED NOT NULL,
  restaurant_table_id BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reservation_id, restaurant_table_id),
  CONSTRAINT reservation_tables_reservation_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT reservation_tables_table_fk
    FOREIGN KEY (restaurant_table_id) REFERENCES restaurant_tables (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_special_needs (
  reservation_id BIGINT UNSIGNED NOT NULL,
  need_code VARCHAR(40) NOT NULL,
  details VARCHAR(500) NULL,
  PRIMARY KEY (reservation_id, need_code),
  CONSTRAINT reservation_special_needs_reservation_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_holds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_token_hash CHAR(64) NOT NULL,
  reservation_id BIGINT UNSIGNED NULL,
  restaurant_table_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  guest_count SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY reservation_holds_session_table_uq (session_token_hash, restaurant_table_id),
  KEY reservation_holds_expiration_idx (expires_at),
  KEY reservation_holds_table_idx (restaurant_table_id),
  CONSTRAINT reservation_holds_reservation_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT reservation_holds_table_fk
    FOREIGN KEY (restaurant_table_id) REFERENCES restaurant_tables (id),
  CONSTRAINT reservation_holds_window_chk CHECK (starts_at < expires_at),
  CONSTRAINT reservation_holds_guests_chk CHECK (guest_count BETWEEN 1 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waitlist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id BIGINT UNSIGNED NOT NULL,
  reservation_date DATE NOT NULL,
  preferred_time TIME NULL,
  guest_count SMALLINT UNSIGNED NOT NULL,
  notes VARCHAR(500) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY waitlist_date_status_idx (reservation_date, status),
  CONSTRAINT waitlist_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT waitlist_guests_chk CHECK (guest_count BETWEEN 1 AND 20),
  CONSTRAINT waitlist_status_chk CHECK (status IN ('waiting', 'notified', 'converted', 'cancelled', 'expired'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
