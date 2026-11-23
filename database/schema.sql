-- PostgreSQL schema SiCuti. Jalankan: psql $DATABASE_URL -f database/schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP TABLE IF EXISTS leave_approvals, leave_requests, leave_types, holidays, blackout_periods, settings, users, divisions CASCADE;

CREATE TABLE divisions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  leader_id INT UNIQUE,
  created_at DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30), address TEXT, photo TEXT,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin','employee','leader','hrd')),
  division_id INT REFERENCES divisions(id) ON DELETE SET NULL,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  leave_quota NUMERIC(4,1) NOT NULL DEFAULT 12
);
ALTER TABLE divisions ADD CONSTRAINT divisions_leader_fk FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE leave_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) UNIQUE NOT NULL,
  quota_days NUMERIC(5,1),                -- NULL = tanpa batas
  min_notice_days INT NOT NULL DEFAULT 0, -- minimal H-n
  max_late_days INT NOT NULL DEFAULT 0,   -- boleh diajukan mundur n hari
  requires_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  deducts_annual_quota BOOLEAN NOT NULL DEFAULT FALSE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  leave_type_id INT NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL, end_date DATE NOT NULL,
  total_days NUMERIC(3,1) NOT NULL,
  is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL,
  substitute_id INT REFERENCES users(id),
  handover_note TEXT, address TEXT, emergency_phone VARCHAR(30), attachment_path TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved_leader','approved','rejected','cancelled')),
  cancel_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ON leave_requests (user_id, status);
CREATE TABLE leave_approvals (
  id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  approver_id INT NOT NULL REFERENCES users(id),
  level VARCHAR(10) NOT NULL CHECK (level IN ('leader','hrd')),
  decision VARCHAR(10) NOT NULL CHECK (decision IN ('approved','rejected')),
  note TEXT,
  decided_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK (decision <> 'rejected' OR length(btrim(coalesce(note,''))) > 0)
);
CREATE TABLE holidays (
  id SERIAL PRIMARY KEY, date DATE UNIQUE NOT NULL, name VARCHAR(120) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('national','collective'))
);
CREATE TABLE blackout_periods (
  id SERIAL PRIMARY KEY, start_date DATE NOT NULL, end_date DATE NOT NULL, note TEXT
);
CREATE TABLE settings (key VARCHAR(50) PRIMARY KEY, value TEXT NOT NULL);
