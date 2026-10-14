CREATE TABLE IF NOT EXISTS `user` (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  emailVerified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  cpf_lookup_hash CHAR(64) NOT NULL,
  birth_date DATE NOT NULL,
  terms_accepted_at DATETIME NOT NULL,
  terms_version VARCHAR(40) NOT NULL,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY customer_auth_user_email_uq (email),
  UNIQUE KEY customer_auth_user_cpf_lookup_hash_uq (cpf_lookup_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session (
  id VARCHAR(36) NOT NULL,
  expiresAt DATETIME NOT NULL,
  token VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  ipAddress VARCHAR(45) NULL,
  userAgent TEXT NULL,
  userId VARCHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY customer_auth_session_token_uq (token),
  KEY customer_auth_session_user_idx (userId),
  CONSTRAINT customer_auth_session_user_fk FOREIGN KEY (userId) REFERENCES `user` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account (
  id VARCHAR(36) NOT NULL,
  accountId VARCHAR(255) NOT NULL,
  providerId VARCHAR(255) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  accessToken TEXT NULL,
  refreshToken TEXT NULL,
  idToken TEXT NULL,
  accessTokenExpiresAt DATETIME NULL,
  refreshTokenExpiresAt DATETIME NULL,
  scope TEXT NULL,
  password TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY customer_auth_account_user_idx (userId),
  CONSTRAINT customer_auth_account_user_fk FOREIGN KEY (userId) REFERENCES `user` (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS verification (
  id VARCHAR(36) NOT NULL,
  identifier VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY customer_auth_verification_identifier_idx (identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE customers
  MODIFY COLUMN phone VARCHAR(32) NULL,
  MODIFY COLUMN normalized_phone VARCHAR(20) NULL,
  ADD COLUMN auth_user_id VARCHAR(36) NULL,
  ADD UNIQUE KEY customers_auth_user_id_uq (auth_user_id),
  ADD CONSTRAINT customers_auth_user_fk FOREIGN KEY (auth_user_id) REFERENCES `user` (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS customer_reservation_flows (
  flow_id_hash CHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (flow_id_hash),
  KEY customer_reservation_flows_expiry_idx (expires_at),
  CONSTRAINT customer_reservation_flows_user_fk FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE,
  CONSTRAINT customer_reservation_flows_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_auth_rate_limits (
  bucket_key CHAR(64) NOT NULL,
  window_started_at DATETIME(3) NOT NULL,
  hit_count INT UNSIGNED NOT NULL,
  PRIMARY KEY (bucket_key),
  KEY customer_auth_rate_limits_window_idx (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
