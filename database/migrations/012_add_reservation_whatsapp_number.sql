ALTER TABLE system_reservation_settings
  ADD COLUMN reservation_whatsapp_number VARCHAR(15) NOT NULL DEFAULT '5591984040710'
  AFTER public_reservation_enabled;
