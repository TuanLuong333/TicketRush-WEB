CREATE TABLE seat_lock_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  seat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  action ENUM('LOCKED', 'RELEASED', 'SOLD', 'FAILED_LOCK') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_seat_lock_logs_seat
    FOREIGN KEY (seat_id) REFERENCES seats(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_seat_lock_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
