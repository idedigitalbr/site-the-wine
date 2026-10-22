-- Persistent checkout state for the reservation payment guarantee.
-- Apply with the project's migration runner only in an authorized local/test database.

ALTER TABLE reservations
  ADD COLUMN checkout_started_at DATETIME(3) NULL AFTER confirmation_token_hash,
  ADD COLUMN seat_guarantee_expires_at DATETIME(3) NULL AFTER checkout_started_at,
  ADD COLUMN payment_deadline_at DATETIME(3) NULL AFTER seat_guarantee_expires_at,
  ADD COLUMN checkout_mode VARCHAR(8) NULL AFTER payment_deadline_at,
  ADD KEY reservations_checkout_guarantee_idx (status, seat_guarantee_expires_at),
  ADD CONSTRAINT reservations_checkout_mode_chk CHECK (checkout_mode IS NULL OR checkout_mode IN ('demo', 'live'));

CREATE TABLE IF NOT EXISTS reservation_checkout_sessions (
  reservation_id BIGINT UNSIGNED NOT NULL,
  mode VARCHAR(8) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'pending',
  method VARCHAR(12) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  pix_expires_at DATETIME(3) NULL,
  demo_completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (reservation_id),
  KEY reservation_checkout_state_idx (state, updated_at),
  CONSTRAINT reservation_checkout_session_reservation_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT reservation_checkout_mode_chk CHECK (mode IN ('demo', 'live')),
  CONSTRAINT reservation_checkout_state_chk CHECK (state IN ('pending', 'pix_pending', 'demo_completed', 'paid')),
  CONSTRAINT reservation_checkout_method_chk CHECK (method IS NULL OR method IN ('pix', 'credit', 'debit'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservation_checkout_operations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id BIGINT UNSIGNED NOT NULL,
  operation_key VARCHAR(80) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  kind VARCHAR(24) NOT NULL,
  result_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY reservation_checkout_operation_uq (reservation_id, operation_key),
  KEY reservation_checkout_operation_reservation_idx (reservation_id, created_at),
  CONSTRAINT reservation_checkout_operation_reservation_fk
    FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE,
  CONSTRAINT reservation_checkout_operation_kind_chk CHECK (kind IN ('start', 'confirm_demo_pix'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_email_templates
  (template_key, name, description, subject, body, default_subject, default_body, variables, active, sort_order)
VALUES
  (
    'reservation_payment_pending',
    'Reserva aguardando pagamento',
    'Enviado quando a reserva é recebida e aguarda a conclusão do checkout.',
    'Finalize o pagamento da sua reserva — {{reservation_code}}',
    'Olá! Recebemos sua reserva para {{reservation_date}} às {{reservation_time}}. Conclua o pagamento para confirmar sua experiência. Código: {{reservation_code}}.',
    'Finalize o pagamento da sua reserva — {{reservation_code}}',
    'Olá! Recebemos sua reserva para {{reservation_date}} às {{reservation_time}}. Conclua o pagamento para confirmar sua experiência. Código: {{reservation_code}}.',
    JSON_ARRAY('reservation_code', 'reservation_date', 'reservation_time', 'guest_count', 'private_link'),
    1,
    15
  )
ON DUPLICATE KEY UPDATE template_key = VALUES(template_key);
