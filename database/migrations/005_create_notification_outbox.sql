CREATE TABLE IF NOT EXISTS notification_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel VARCHAR(24) NOT NULL DEFAULT 'email',
  template VARCHAR(80) NOT NULL,
  recipient VARCHAR(254) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  scheduled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  last_error VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notification_outbox_queue_idx (status, scheduled_at, id),
  KEY notification_outbox_recipient_idx (recipient),
  CONSTRAINT notification_outbox_channel_chk CHECK (channel IN ('email', 'whatsapp', 'sms')),
  CONSTRAINT notification_outbox_status_chk CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
