CREATE TABLE IF NOT EXISTS floor_plan_documents (
  id TINYINT UNSIGNED NOT NULL,
  draft_json JSON NULL,
  draft_revision INT UNSIGNED NOT NULL DEFAULT 0,
  published_json JSON NULL,
  published_revision INT UNSIGNED NOT NULL DEFAULT 0,
  inventory_fingerprint CHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS floor_plan_publications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_id TINYINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL,
  document_json JSON NOT NULL,
  graph_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY floor_plan_publication_revision_uq (document_id, revision),
  CONSTRAINT floor_plan_publication_document_fk FOREIGN KEY (document_id)
    REFERENCES floor_plan_documents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO floor_plan_documents (id) VALUES (1)
ON DUPLICATE KEY UPDATE id = VALUES(id);
