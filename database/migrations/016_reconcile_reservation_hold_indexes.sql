-- Some installations recorded 015 before its session-index removal was added.
-- Ensure attempt uniqueness exists before removing the obsolete session scope.
SET @attempt_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'reservation_holds'
    AND index_name = 'reservation_holds_attempt_table_uq'
);
SET @sql := IF(@attempt_index_exists = 0,
  'ALTER TABLE reservation_holds ADD UNIQUE KEY reservation_holds_attempt_table_uq (attempt_id_hash, restaurant_table_id)',
  'SELECT 1');
PREPARE reconcile_hold_index FROM @sql;
EXECUTE reconcile_hold_index;
DEALLOCATE PREPARE reconcile_hold_index;

SET @session_index_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'reservation_holds'
    AND index_name = 'reservation_holds_session_table_uq'
);
SET @sql := IF(@session_index_exists > 0,
  'ALTER TABLE reservation_holds DROP INDEX reservation_holds_session_table_uq',
  'SELECT 1');
PREPARE reconcile_hold_index FROM @sql;
EXECUTE reconcile_hold_index;
DEALLOCATE PREPARE reconcile_hold_index;
