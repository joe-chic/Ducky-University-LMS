-- Dummy data for ducky_treasury_db
-- Global affiliate IDs used across DBs:
--   offenders: 1001 (employee), 2001/2004/2005/2006 (students)

\c ducky_treasury_db;

-- Payment methods
INSERT INTO payment_methods(method_id, method_name)
VALUES
  (1, 'Card'),
  (2, 'Bank Transfer');

-- Reason codes
INSERT INTO reason_codes(code_id, code, description, reason_code, reason_type, created_at, modified_at)
VALUES
  (1, 'LR-001', 'Late return penalty', 'LATE-RETURN', 'late_return', '2023-10-27T10:00:00Z', '2023-10-27T11:00:00Z'),
  (2, 'DMG-001', 'Resource damaged fee', 'DAMAGE', 'damage', '2023-10-27T10:00:00Z', '2023-10-27T11:00:00Z'),
  (3, 'LS-001', 'Resource loss charge', 'LOSS', 'loss', '2023-10-27T10:00:00Z', '2023-10-27T11:00:00Z');

-- Fines
INSERT INTO fines(find_id, price, fine_status, reason_code_id, source_system, source_transaction_id, offender_id, offender_type, paid_at, created_at, modified_at)
VALUES
  (6001, 25.00, 'unpaid', 1, 'library', 'loan-7001', 2001, 'student', NULL, '2023-10-27T10:00:00Z', '2023-10-27T11:00:00Z'),
  (6002, 15.50, 'paid', 2, 'library', 'loan-7002', 1002, 'employee', '2023-11-01T10:00:00Z', '2023-10-28T10:00:00Z', '2023-11-01T11:00:00Z'),
  (6003, 40.00, 'unpaid', 2, 'library', 'loan-7003-damage', 2004, 'student', NULL, '2023-11-10T10:00:00Z', '2023-11-10T11:00:00Z'),
  (6004, 18.00, 'paid', 1, 'library', 'loan-7004-late', 2005, 'student', '2023-11-12T10:00:00Z', '2023-11-09T10:00:00Z', '2023-11-12T11:00:00Z'),
  (6005, 75.00, 'unpaid', 3, 'library', 'loan-7005-loss', 2006, 'student', NULL, '2023-11-15T10:00:00Z', '2023-11-15T11:00:00Z');

-- Payments
INSERT INTO payments(payment_id, fine_id, amount_paid, payment_method_id, transaction_reference, paid_at)
VALUES
  (8001, 6002, 15.50, 1, 'TXN-0001', '2023-11-01T10:00:00Z'),
  (8002, 6004, 18.00, 2, 'TXN-0002', '2023-11-12T10:00:00Z');

-- Fix sequences
SELECT setval(pg_get_serial_sequence('fines','find_id'), (SELECT COALESCE(MAX(find_id), 1) FROM fines));
SELECT setval(pg_get_serial_sequence('payments','payment_id'), (SELECT COALESCE(MAX(payment_id), 1) FROM payments));

