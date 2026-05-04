CREATE DATABASE ducky_treasury_db;
\c ducky_treasury_db;

-- Enums
CREATE TYPE fine_status AS ENUM('unpaid', 'paid', 'waived', 'refunded');
CREATE TYPE offender_type AS ENUM('student', 'employee', 'collaborator', 'professor', 'guest');
CREATE TYPE reason_type AS ENUM('late_return', 'damage', 'loss', 'other');

-- Tables
CREATE TABLE fines(
  find_id BIGSERIAL PRIMARY KEY,
  price NUMERIC(12,2) NOT NULL,
  fine_status fine_status NOT NULL,
  reason_code_id BIGINT NOT NULL,
  source_system VARCHAR(50) NOT NULL,
  source_transaction_id VARCHAR(100) NOT NULL,
  offender_id BIGINT NOT NULL,
  offender_type offender_type NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  modified_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE payment_methods(
  method_id SMALLINT PRIMARY KEY,
  method_name VARCHAR(50) NOT NULL
);

CREATE TABLE payments(
  payment_id BIGSERIAL PRIMARY KEY,
  fine_id BIGINT NOT NULL REFERENCES fines(find_id),
  amount_paid NUMERIC(12,2) NOT NULL,
  payment_method_id SMALLINT NOT NULL REFERENCES payment_methods(method_id),
  transaction_reference VARCHAR(100) UNIQUE,
  paid_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE reason_codes(
  code_id SMALLSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  reason_code VARCHAR(50) NOT NULL,
  reason_type reason_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  modified_at TIMESTAMPTZ NOT NULL
);
