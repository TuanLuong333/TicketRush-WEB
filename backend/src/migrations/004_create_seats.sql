CREATE TABLE seats (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  zone_id BIGINT NOT NULL,
  row_label VARCHAR(10) NOT NULL,
  seat_number INT NOT NULL,
  seat_code VARCHAR(50) NOT NULL,
  status ENUM('AVAILABLE', 'LOCKED', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
  locked_by BIGINT NULL,
  locked_until DATETIME NULL,
  sold_to BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_seats_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_seats_zone
    FOREIGN KEY (zone_id) REFERENCES seat_zones(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_seats_locked_by
    FOREIGN KEY (locked_by) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_seats_sold_to
    FOREIGN KEY (sold_to) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT uq_event_seat_code UNIQUE (event_id, seat_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_seats_event_status ON seats(event_id, status);
CREATE INDEX idx_seats_locked_until ON seats(status, locked_until);
CREATE INDEX idx_seats_locked_by ON seats(locked_by);
