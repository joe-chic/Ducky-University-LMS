CREATE DATABASE ducky_scholar_db;
\c ducky_scholar_db;

-- Domains
CREATE DOMAIN sys_email AS VARCHAR(255)
  CHECK(
    VALUE ~* '^(?!.*\.\..*)(?!\..*)[A-Za-z0-9\.\_\%\+\-]+@(?!^\-.*$)(?!^.*\-$)(?!^..\-\-*$)([A-Za-z0-9\-]){1,253}.([a-z0-9\-]){2,63}$'
  );

CREATE DOMAIN generic_phone AS VARCHAR(15)
  CHECK(VALUE ~ '^\+?([\d\s-]){9,15}$');

CREATE DOMAIN subject_score AS SMALLINT
  CHECK(VALUE >= 0 AND VALUE <= 100);

-- Enums / Domains for CSV-defined status columns
CREATE TYPE student_status AS ENUM('active', 'inactive', 'graduated', 'suspended');
CREATE TYPE enrollment_status AS ENUM('enrolled', 'pending', 'approved', 'rejected', 'dropped', 'failed');
CREATE TYPE attn_mode AS ENUM('presential', 'online', 'hybrid');
CREATE TYPE subject_status AS ENUM('active', 'inactive', 'archived', 'cancelled');

-- Availability status is modeled as a domain in the CSV
CREATE DOMAIN avail_status AS VARCHAR(20)
  NOT NULL
  CHECK(VALUE IN ('open', 'closed', 'full', 'cancelled'));

-- Tables
CREATE TABLE departments(
  department_id SERIAL PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  department_head_id BIGINT NOT NULL UNIQUE
);

CREATE TABLE classroom_locations(
  location_id SERIAL PRIMARY KEY,
  location_building_name VARCHAR(100) NOT NULL,
  location_floor SMALLINT NOT NULL,
  location_room_number SMALLINT NOT NULL
);

CREATE TABLE students(
  student_id BIGSERIAL PRIMARY KEY,
  student_status student_status NOT NULL,
  student_email sys_email NOT NULL,
  student_phone generic_phone NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  father_lastname VARCHAR(100) NOT NULL,
  mother_lastname VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE subjects(
  subject_id SERIAL PRIMARY KEY,
  department_id INT NOT NULL REFERENCES departments(department_id),
  subject_name VARCHAR(150) NOT NULL,
  subject_description VARCHAR(500) NOT NULL,
  status subject_status NOT NULL,
  credits SMALLINT NOT NULL,
  subject_is_elective BOOLEAN NOT NULL
);

CREATE TABLE subject_availabilities(
  availability_id BIGSERIAL PRIMARY KEY,
  subject_id INT NOT NULL REFERENCES subjects(subject_id),
  location_id INT NOT NULL REFERENCES classroom_locations(location_id),
  professor_id BIGINT NOT NULL,
  availability_status avail_status NOT NULL,
  attendance_mode attn_mode NOT NULL,
  current_enrollment BOOLEAN NOT NULL,
  class_start_at TIMESTAMPTZ NOT NULL,
  class_end_at TIMESTAMPTZ NOT NULL,
  subject_start_at TIMESTAMPTZ NOT NULL,
  subject_end_at TIMESTAMPTZ NOT NULL,
  partial_first_start_at TIMESTAMPTZ,
  partial_first_end_at TIMESTAMPTZ,
  partial_second_start_at TIMESTAMPTZ,
  partial_second_end_at TIMESTAMPTZ,
  partial_third_start_at TIMESTAMPTZ,
  partial_third_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

-- students x subject_availabilities
CREATE TABLE students_availabilities(
  student_id BIGINT NOT NULL REFERENCES students(student_id),
  availability_id BIGINT NOT NULL REFERENCES subject_availabilities(availability_id),
  enrollment_status enrollment_status NOT NULL,
  subject_final_score subject_score,
  partial_final_score subject_score,
  partial_second_score subject_score,
  partial_third_score subject_score,
  PRIMARY KEY(student_id, availability_id)
);
