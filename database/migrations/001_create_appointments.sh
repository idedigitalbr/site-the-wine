#!/bin/sh
set -eu

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" <<'SQL'
CREATE TABLE IF NOT EXISTS appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guest_count SMALLINT UNSIGNED NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  customer_email VARCHAR(254) NULL,
  experience VARCHAR(80) NOT NULL DEFAULT 'jantar',
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  notes VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY appointments_date_status_idx (reservation_date, status),
  KEY appointments_phone_idx (customer_phone),
  CONSTRAINT appointments_guest_count_chk CHECK (guest_count BETWEEN 1 AND 30),
  CONSTRAINT appointments_status_chk CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
SQL
