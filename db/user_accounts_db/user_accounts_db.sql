CREATE DATABASE user_accounts_db;
\c user_accounts_db;

CREATE TABLE users(
	user_id SERIAL PRIMARY KEY,
	campus_id UNIQUE,

);
