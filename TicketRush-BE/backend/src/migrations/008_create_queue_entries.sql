CREATE TABLE queue_entries (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  queue_token VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('WAITING', 'ACTIVE', 'EXPIRED', 'DONE') NOT NULL DEFAULT 'WAITING',
  position_number BIGINT NOT NULL,
  activated_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_queue_entries_event
    FOREIGN KEY (event_id) REFERENCES events(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_queue_entries_user
    FOREIGN KEY (user_id) REFERENCES users(id),

  CONSTRAINT uq_queue_user_event UNIQUE (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_queue_event_status_position ON queue_entries(event_id, status, position_number);
