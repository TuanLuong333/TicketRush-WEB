CREATE TABLE seat_zones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  row_count INT NOT NULL,
  seats_per_row INT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  color VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_seat_zones_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT uq_event_zone_name UNIQUE (event_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
