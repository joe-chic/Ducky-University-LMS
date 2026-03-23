CREATE DATABASE user_accounts_db;
\c user_accounts_db;

-- Data type definitions
CREATE DOMAIN sys_email AS VARCHAR(255)
NOT NULL, CHECK(VALUE ~* '^(?!.*\.\..*)(?!\..*)[A-Za-z0-9\.\_\%\+\-]+@(?!^\-.*$)(?!^.*\-$)(?!^..\-\-*$)([A-Za-z0-9\-]){1,253}.([a-z0-9\-]){2,63}$');

CREATE DOMAIN generic_phone AS VARCHAR(15)
CHECK(VALUE ~ '^\+?([\d\s-]){9,15}$');

CREATE TYPE account_state AS ENUM('active', 'blocked', 'disabled');

-- Table definitions
CREATE TABLE users(
	user_id BIGSERIAL PRIMARY KEY,
	campus_id SERIAL NOT NULL UNIQUE,
	first_name VARCHAR(100) NOT NULL,
	middle_name VARCHAR(100),
	father_lastname VARCHAR(100) NOT NULL,
	mother_lastname VARCHAR(100),
	user_email sys_email NOT NULL,
	user_phone generic_phone,
	user_password VARCHAR(255) NOT NULL,
	user_state account_state NOT NULL,
	last_login TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ DEFAULT NOW(),
	created_by BIGINT NOT NULL,
	latest_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	latest_modified_by BIGINT NOT NULL,
	latest_disabled_at TIMESTAMPTZ,
	latest_disabled_by BIGINT
);

CREATE TABLE roles(
	role_id SMALLSERIAL PRIMARY KEY,
	role_name VARCHAR(50) NOT NULL,
	role_description VARCHAR(255)
);

CREATE TABLE permissions(
	permission_id SERIAL PRIMARY KEY,
	permission_name VARCHAR(50) NOT NULL,
	permission_description VARCHAR(255)
);

CREATE TABLE roles_permissions(
	role_id INT,
	permission_id INT,
	PRIMARY KEY(role_id, permission_id),
	CONSTRAINT role_fk FOREIGN KEY(role_id) REFERENCES roles(role_id),
	CONSTRAINT permission_fk FOREIGN KEY(permission_id) REFERENCES permissions(permission_id)
);
