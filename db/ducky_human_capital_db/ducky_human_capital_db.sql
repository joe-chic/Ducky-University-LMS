CREATE DATABASE ducky_human_capital_db;
\c ducky_human_capital_db;

-- Domains (shared patterns used by multiple tables)
CREATE DOMAIN sys_email AS VARCHAR(255)
  CHECK(
    VALUE ~* '^(?!.*\.\..*)(?!\..*)[A-Za-z0-9\.\_\%\+\-]+@(?!^\-.*$)(?!^.*\-$)(?!^..\-\-*$)([A-Za-z0-9\-]){1,253}.([a-z0-9\-]){2,63}$'
  );

CREATE DOMAIN sys_phone AS VARCHAR(15)
  CHECK(VALUE ~ '^\+?([\d\s-]){9,15}$');

-- Enums
CREATE TYPE employee_status AS ENUM('active', 'inactive', 'suspended', 'terminated', 'on_leave');
CREATE TYPE shift_type AS ENUM('morning', 'evening', 'night', 'mixed');
CREATE TYPE collab_status AS ENUM('active', 'inactive', 'suspended', 'terminated');
CREATE TYPE prof_status AS ENUM('active', 'inactive', 'on_leave', 'retired');

-- Tables
CREATE TABLE employees(
  employee_id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  father_lastname VARCHAR(100) NOT NULL,
  mother_lastname VARCHAR(100),
  employee_email sys_email,
  employee_phone sys_phone,
  employee_status employee_status NOT NULL,
  RFC VARCHAR(13) NOT NULL UNIQUE CHECK(RFC ~ '^[A-Z0-9]{12,13}$'),
  CLABE VARCHAR(18) NOT NULL UNIQUE CHECK(CLABE ~ '^[A-Z0-9]{18}$'),
  hire_date TIMESTAMPTZ NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL CHECK(base_salary >= 0)
);

CREATE TABLE office_locations(
  location_id SERIAL PRIMARY KEY,
  location_building_name VARCHAR(100) NOT NULL,
  location_floor SMALLINT NOT NULL,
  location_room_number SMALLINT NOT NULL,
  location_capacity SMALLINT NOT NULL
);

CREATE TABLE departments(
  departmen_id SERIAL PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  -- CSV calls it INT but we use BIGINT so FK to employees(employee_id BIGINT) works.
  department_head_id BIGINT NOT NULL UNIQUE REFERENCES employees(employee_id)
);

CREATE TABLE collaborator(
  collaborator_id BIGINT PRIMARY KEY REFERENCES employees(employee_id),
  job_title VARCHAR(100) NOT NULL,
  supervisor_id BIGINT NOT NULL REFERENCES employees(employee_id),
  shift_type shift_type NOT NULL,
  collaborator_status collab_status NOT NULL
);

CREATE TABLE professors(
  professor_id BIGINT PRIMARY KEY REFERENCES employees(employee_id),
  department_id INT NOT NULL REFERENCES departments(departmen_id),
  academic_title VARCHAR(100) NOT NULL,
  research_area VARCHAR(150),
  hire_date TIMESTAMPTZ NOT NULL,
  office_location_id INT REFERENCES office_locations(location_id),
  professor_status prof_status NOT NULL
);
