-- Dummy data for ducky_scholar_db
-- Global affiliate IDs used across DBs:
--   students: 2001, 2002, 2003, 2004, 2005, 2006
-- Cross-DB coherence:
--   subject_availabilities.professor_id uses human_capital_db professors (e.g. 1001)

\c ducky_scholar_db;

-- Departments
INSERT INTO departments(department_id, department_name, department_head_id)
VALUES
  (10, 'Computer Science', 1001),
  (11, 'Mathematics', 1003);

-- Classroom locations
INSERT INTO classroom_locations(location_id, location_building_name, location_floor, location_room_number)
VALUES
  (1, 'Library Center', 2, 201),
  (2, 'Science Hall', 1, 102);

-- Students
INSERT INTO students(student_id, student_status, student_email, student_phone, first_name, middle_name, father_lastname, mother_lastname, created_at)
VALUES
  (2001, 'active', 'student2001@ducky.edu', '+5215555550201', 'Maria', NULL, 'Gonzalez', 'Lopez', '2022-01-01T10:00:00Z'),
  (2002, 'active', 'student2002@ducky.edu', '+5215555550202', 'Luis', NULL, 'Perez', 'Garcia', '2022-02-01T10:00:00Z'),
  (2003, 'suspended', 'student2003@ducky.edu', '+5215555550203', 'Sofia', 'A.', 'Ramirez', 'Santos', '2021-09-15T10:00:00Z'),
  (2004, 'suspended', 'student2004@ducky.edu', '+5215555550204', 'Diego', NULL, 'Hernandez', 'Ruiz', '2022-03-01T10:00:00Z'),
  (2005, 'active', 'student2005@ducky.edu', '+5215555550205', 'Elena', NULL, 'Castillo', 'Mora', '2022-04-01T10:00:00Z'),
  (2006, 'inactive', 'student2006@ducky.edu', '+5215555550206', 'Mateo', NULL, 'Navarro', 'Cruz', '2022-05-01T10:00:00Z');

-- Subjects
INSERT INTO subjects(subject_id, department_id, subject_name, subject_description, status, credits, subject_is_elective)
VALUES
  (3001, 10, 'Databases', 'Relational modeling and SQL fundamentals.', 'active', 4, FALSE),
  (3002, 11, 'Discrete Math', 'Logic, sets, and combinatorics.', 'active', 3, TRUE);

-- Subject availability (section)
INSERT INTO subject_availabilities(
  availability_id, subject_id, location_id, professor_id, availability_status,
  attendance_mode, current_enrollment, class_start_at, class_end_at,
  subject_start_at, subject_end_at,
  partial_first_start_at, partial_first_end_at,
  partial_second_start_at, partial_second_end_at,
  partial_third_start_at, partial_third_end_at,
  created_at
)
VALUES
  (
    4001, 3001, 1, 1001, 'open',
    'hybrid', TRUE,
    '2024-03-01T12:00:00Z', '2024-05-10T12:00:00Z',
    '2024-03-01T12:00:00Z', '2024-05-10T12:00:00Z',
    '2024-03-01T12:00:00Z', '2024-03-20T12:00:00Z',
    '2024-03-21T12:00:00Z', '2024-04-10T12:00:00Z',
    '2024-04-11T12:00:00Z', '2024-05-01T12:00:00Z',
    '2024-02-15T10:00:00Z'
  );

-- Enrollment mapping (students x availability)
INSERT INTO students_availabilities(
  student_id, availability_id, enrollment_status,
  subject_final_score, partial_final_score, partial_second_score, partial_third_score
)
VALUES
  (2001, 4001, 'enrolled', 95, NULL, NULL, NULL),
  (2002, 4001, 'enrolled', 88, NULL, NULL, NULL),
  (2003, 4001, 'pending', NULL, NULL, NULL, NULL),
  (2004, 4001, 'dropped', NULL, NULL, NULL, NULL),
  (2005, 4001, 'enrolled', 90, NULL, NULL, NULL),
  (2006, 4001, 'dropped', NULL, NULL, NULL, NULL);

-- Fix sequences
SELECT setval(pg_get_serial_sequence('departments','department_id'), (SELECT COALESCE(MAX(department_id), 1) FROM departments));
SELECT setval(pg_get_serial_sequence('classroom_locations','location_id'), (SELECT COALESCE(MAX(location_id), 1) FROM classroom_locations));
SELECT setval(pg_get_serial_sequence('students','student_id'), (SELECT COALESCE(MAX(student_id), 1) FROM students));
SELECT setval(pg_get_serial_sequence('subjects','subject_id'), (SELECT COALESCE(MAX(subject_id), 1) FROM subjects));
SELECT setval(pg_get_serial_sequence('subject_availabilities','availability_id'), (SELECT COALESCE(MAX(availability_id), 1) FROM subject_availabilities));

