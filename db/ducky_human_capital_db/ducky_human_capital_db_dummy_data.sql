-- Dummy data for ducky_human_capital_db
-- Global affiliate IDs used across DBs:
--   employees: 1001, 1002, 1003
--   collaborators/professors are subsets of employees

\c ducky_human_capital_db;

-- Locations
INSERT INTO office_locations(location_id, location_building_name, location_floor, location_room_number, location_capacity)
VALUES
  (1, 'Main Admin', 1, 101, 50),
  (2, 'Science Hall', 1, 102, 40);

-- Employees (global IDs)
INSERT INTO employees(employee_id, first_name, middle_name, father_lastname, mother_lastname, employee_email, employee_phone, employee_status, RFC, CLABE, hire_date, base_salary)
VALUES
  (1001, 'Ada', 'L.', 'Lovelace', 'Byron', 'ada.lovelace@ducky.edu', '+5215555550101', 'active', 'ABCDEFGHIJKL', 'A23456789012345678', '2020-01-15T10:00:00Z', 75000.00),
  (1002, 'Grace', NULL, 'Hopper', 'Murray', 'grace.hopper@ducky.edu', '+5215555550102', 'active', 'MNOPQRSTUVWX', 'B23456789012345678', '2019-09-01T10:00:00Z', 82000.00),
  (1003, 'Alan', NULL, 'Turing', 'Bolton', 'alan.turing@ducky.edu', '+5215555550103', 'on_leave', 'YZABCDEFGHIJK', 'C23456789012345678', '2021-03-10T10:00:00Z', 68000.00);

-- Departments
INSERT INTO departments(departmen_id, department_name, department_head_id)
VALUES
  (10, 'Computer Science', 1001),
  (11, 'Mathematics', 1003);

-- Collaborators (subset of employees)
INSERT INTO collaborator(collaborator_id, job_title, supervisor_id, shift_type, collaborator_status)
VALUES
  (1002, 'Research Assistant', 1001, 'morning', 'active');

-- Professors (subset of employees)
INSERT INTO professors(professor_id, department_id, academic_title, research_area, hire_date, office_location_id, professor_status)
VALUES
  (1001, 10, 'Dr.', 'Computer Science', '2018-08-20T10:00:00Z', 1, 'active');

-- Fix sequences after explicit inserts
SELECT setval(pg_get_serial_sequence('office_locations','location_id'), (SELECT COALESCE(MAX(location_id), 1) FROM office_locations));
SELECT setval(pg_get_serial_sequence('employees','employee_id'), (SELECT COALESCE(MAX(employee_id), 1) FROM employees));
SELECT setval(pg_get_serial_sequence('departments','departmen_id'), (SELECT COALESCE(MAX(departmen_id), 1) FROM departments));
SELECT setval(pg_get_serial_sequence('professors','professor_id'), (SELECT COALESCE(MAX(professor_id), 1) FROM professors));
SELECT setval(pg_get_serial_sequence('collaborator','collaborator_id'), (SELECT COALESCE(MAX(collaborator_id), 1) FROM collaborator));

