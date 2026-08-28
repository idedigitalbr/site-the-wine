CREATE TABLE IF NOT EXISTS system_smtp_settings (
  id TINYINT UNSIGNED NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  host VARCHAR(255) NOT NULL DEFAULT '',
  port SMALLINT UNSIGNED NOT NULL DEFAULT 587,
  security VARCHAR(16) NOT NULL DEFAULT 'starttls',
  username VARCHAR(254) NOT NULL DEFAULT '',
  password_ciphertext TEXT NULL,
  from_email VARCHAR(254) NOT NULL DEFAULT '',
  from_name VARCHAR(160) NOT NULL DEFAULT 'The Wine Experience',
  last_test_status VARCHAR(16) NOT NULL DEFAULT 'not_tested',
  last_tested_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT system_smtp_security_chk CHECK (security IN ('none', 'starttls', 'ssl')),
  CONSTRAINT system_smtp_test_status_chk CHECK (last_test_status IN ('not_tested', 'success', 'failed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_smtp_settings
  (id, enabled, host, port, security, username, password_ciphertext, from_email, from_name, last_test_status)
VALUES
  (1, 0, '', 587, 'starttls', '', NULL, '', 'The Wine Experience', 'not_tested')
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS system_email_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_key VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  default_subject VARCHAR(255) NOT NULL,
  default_body TEXT NOT NULL,
  variables JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY system_email_templates_key_uq (template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO system_email_templates
  (template_key, name, description, subject, body, default_subject, default_body, variables, active, sort_order)
VALUES
  (
    'reservation_confirmation',
    'Confirmação de reserva',
    'Enviado quando a reserva do cliente é confirmada.',
    'Sua reserva está confirmada — {{reservation_code}}',
    'Olá, {{customer_name}}!\\n\\nSua reserva no The Wine está confirmada para {{reservation_date}} às {{reservation_time}}.\\n\\nCódigo da reserva: {{reservation_code}}\\nPessoas: {{guest_count}}\\n\\nAcesse o link privado para acompanhar os detalhes.',
    'Sua reserva está confirmada — {{reservation_code}}',
    'Olá, {{customer_name}}!\\n\\nSua reserva no The Wine está confirmada para {{reservation_date}} às {{reservation_time}}.\\n\\nCódigo da reserva: {{reservation_code}}\\nPessoas: {{guest_count}}\\n\\nAcesse o link privado para acompanhar os detalhes.',
    JSON_ARRAY('customer_name', 'reservation_code', 'reservation_date', 'reservation_time', 'guest_count', 'private_link'),
    1,
    10
  ),
  (
    'reservation_reminder_24h',
    'Lembrete — 24 horas',
    'Lembrete automático enviado um dia antes da experiência.',
    'Lembrete: esperamos você amanhã no The Wine',
    'Olá, {{customer_name}}!\\n\\nPassando para lembrar que esperamos você amanhã, {{reservation_date}}, às {{reservation_time}}.\\n\\nCódigo da reserva: {{reservation_code}}\\nPessoas: {{guest_count}}\\n\\nSe precisar alterar os dados, acesse sua reserva pelo link privado.',
    'Lembrete: esperamos você amanhã no The Wine',
    'Olá, {{customer_name}}!\\n\\nPassando para lembrar que esperamos você amanhã, {{reservation_date}}, às {{reservation_time}}.\\n\\nCódigo da reserva: {{reservation_code}}\\nPessoas: {{guest_count}}\\n\\nSe precisar alterar os dados, acesse sua reserva pelo link privado.',
    JSON_ARRAY('customer_name', 'reservation_code', 'reservation_date', 'reservation_time', 'guest_count', 'private_link'),
    1,
    20
  ),
  (
    'reservation_reminder_3h',
    'Lembrete — 3 horas',
    'Lembrete automático enviado próximo ao horário da reserva.',
    'Até logo: sua experiência começa em breve',
    'Olá, {{customer_name}}!\\n\\nSua experiência no The Wine começa hoje às {{reservation_time}}. Estamos esperando por você.\\n\\nCódigo da reserva: {{reservation_code}}',
    'Até logo: sua experiência começa em breve',
    'Olá, {{customer_name}}!\\n\\nSua experiência no The Wine começa hoje às {{reservation_time}}. Estamos esperando por você.\\n\\nCódigo da reserva: {{reservation_code}}',
    JSON_ARRAY('customer_name', 'reservation_code', 'reservation_time'),
    1,
    30
  ),
  (
    'reservation_cancellation',
    'Cancelamento de reserva',
    'Enviado quando uma reserva é cancelada.',
    'Atualização da sua reserva — {{reservation_code}}',
    'Olá, {{customer_name}}!\\n\\nSua reserva {{reservation_code}} foi cancelada.\\n\\nQuando quiser viver uma nova experiência, estaremos esperando por você no The Wine.',
    'Atualização da sua reserva — {{reservation_code}}',
    'Olá, {{customer_name}}!\\n\\nSua reserva {{reservation_code}} foi cancelada.\\n\\nQuando quiser viver uma nova experiência, estaremos esperando por você no The Wine.',
    JSON_ARRAY('customer_name', 'reservation_code'),
    1,
    40
  ),
  (
    'waitlist_available',
    'Lista de espera disponível',
    'Enviado quando uma mesa fica disponível para o cliente.',
    'Uma mesa ficou disponível para você',
    'Olá, {{customer_name}}!\\n\\nUma mesa ficou disponível para a data {{reservation_date}}. Fale com nossa equipe para confirmar sua experiência no The Wine.\\n\\nReferência: {{waitlist_code}}',
    'Uma mesa ficou disponível para você',
    'Olá, {{customer_name}}!\\n\\nUma mesa ficou disponível para a data {{reservation_date}}. Fale com nossa equipe para confirmar sua experiência no The Wine.\\n\\nReferência: {{waitlist_code}}',
    JSON_ARRAY('customer_name', 'reservation_date', 'waitlist_code'),
    1,
    50
  )
ON DUPLICATE KEY UPDATE id = id;
