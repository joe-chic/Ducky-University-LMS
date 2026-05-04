-- Dummy data for service_registry_db
-- Global affiliate IDs used across DBs:
--   1001, 1002, 1003 (employees)
--   2001, 2002, 2003 (students)

\c service_registry_db;

-- Services
INSERT INTO services(service_id, service_name, service_status, base_url, health_check_url, last_heartbeat, created_at)
VALUES
  (1, 'ducky-humancapital', 'active', 'http://human-capital:8080', 'http://human-capital:8080/health', '2024-03-01T10:00:00Z', '2024-01-01T10:00:00Z'),
  (2, 'ducky-library', 'active', 'http://library:8080', 'http://library:8080/health', '2024-03-01T10:00:00Z', '2024-01-01T10:00:00Z'),
  (3, 'ducky-treasury', 'maintenance', 'http://treasury:8080', 'http://treasury:8080/health', '2024-03-01T10:00:00Z', '2024-01-01T10:00:00Z'),
  (4, 'ducky-scholar', 'active', 'http://scholar:8080', 'http://scholar:8080/health', '2024-03-01T10:00:00Z', '2024-01-01T10:00:00Z');

-- University affiliates (global IDs)
INSERT INTO university_affiliates(campus_id, campus_email, created_at)
VALUES
  (1001, 'ada.lovelace@ducky.edu', '2022-01-01T10:00:00Z'),
  (1002, 'grace.hopper@ducky.edu', '2022-01-02T10:00:00Z'),
  (1003, 'alan.turing@ducky.edu', '2022-01-03T10:00:00Z'),
  (2001, 'student2001@ducky.edu', '2022-02-01T10:00:00Z'),
  (2002, 'student2002@ducky.edu', '2022-02-02T10:00:00Z'),
  (2003, 'student2003@ducky.edu', '2022-02-03T10:00:00Z');

-- Affiliate service mapping (global IDs x services)
INSERT INTO affiliates_services(campus_id, service_id, is_operational)
VALUES
  (1001, 1, TRUE), (1001, 2, TRUE), (1001, 3, TRUE), (1001, 4, TRUE),
  (1002, 1, TRUE), (1002, 2, TRUE), (1002, 3, FALSE), (1002, 4, TRUE),
  (1003, 1, TRUE), (1003, 2, FALSE), (1003, 3, TRUE), (1003, 4, TRUE),
  (2001, 1, TRUE), (2001, 2, TRUE), (2001, 3, TRUE), (2001, 4, TRUE),
  (2002, 1, TRUE), (2002, 2, TRUE), (2002, 3, TRUE), (2002, 4, TRUE),
  (2003, 1, FALSE), (2003, 2, TRUE), (2003, 3, TRUE), (2003, 4, FALSE);

-- Fix sequences
SELECT setval(pg_get_serial_sequence('services','service_id'), (SELECT COALESCE(MAX(service_id), 1) FROM services));
SELECT setval(pg_get_serial_sequence('university_affiliates','campus_id'), (SELECT COALESCE(MAX(campus_id), 1) FROM university_affiliates));

