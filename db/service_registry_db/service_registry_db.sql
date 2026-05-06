CREATE DATABASE service_registry_db;
\c service_registry_db;

-- Domains
CREATE DOMAIN sys_email AS VARCHAR(255)
  CHECK(
    VALUE ~* '^(?!.*\.\..*)(?!\..*)[A-Za-z0-9\.\_\%\+\-]+@(?!^\-.*$)(?!^.*\-$)(?!^..\-\-*$)([A-Za-z0-9\-]){1,253}.([a-z0-9\-]){2,63}$'
  );

-- Enums
CREATE TYPE service_status AS ENUM('active', 'inactive', 'maintenance', 'deprecated');

-- Tables
CREATE TABLE university_affiliates(
  campus_id BIGSERIAL PRIMARY KEY,
  campus_email sys_email NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE services(
  service_id SMALLSERIAL PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  service_status service_status NOT NULL,
  base_url VARCHAR(255) NOT NULL,
  health_check_url VARCHAR(255) NOT NULL,
  last_heartbeat TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE affiliates_services(
  campus_id BIGINT NOT NULL REFERENCES university_affiliates(campus_id),
  service_id SMALLINT NOT NULL REFERENCES services(service_id),
  is_operational BOOLEAN NOT NULL,
  PRIMARY KEY(campus_id, service_id)
);

