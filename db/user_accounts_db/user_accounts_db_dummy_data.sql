-- Dummy data for user_accounts_db
-- Global affiliate IDs used across DBs:
--   employees: 1001, 1002, 1003
--   students:  2001, 2002, 2003, 2004, 2005, 2006

\c user_accounts_db;

-- Roles
INSERT INTO roles(role_id, role_name, role_description)
VALUES
  (1, 'Administrador', 'Administracion del sistema'),
  (2, 'Bibliotecario', 'Gestion de biblioteca'),
  (3, 'Profesor', 'Gestion academica'),
  (4, 'Alumno', 'Uso de servicios academicos'),
  (5, 'Colaborador', 'Soporte operativo');

-- Permissions
INSERT INTO permissions(permission_id, permission_name, permission_description)
VALUES
  (1, 'usuarios.view', 'Ver usuarios'),
  (2, 'usuarios.edit', 'Editar usuarios'),
  (3, 'libros.view', 'Ver libros'),
  (4, 'permisos.edit', 'Editar permisos');

-- Role -> Permission mapping
INSERT INTO roles_permissions(role_id, permission_id)
VALUES
  (1, 1), (1, 2), (1, 3), (1, 4),
  (2, 3),
  (3, 3),
  (4, 3),
  (5, 1);

-- Users (global affiliate IDs)
INSERT INTO users(
  user_id, campus_id, first_name, middle_name, father_lastname, mother_lastname,
  user_email, user_phone, role_id, user_password, user_state,
  last_login, created_by, latest_modified_by
)
VALUES
  (1, 1001, 'Ada', 'L.', 'Lovelace', 'Byron', 'ada.lovelace@ducky.edu', '+5215555550101', 1, '$2b$dummyhashadmin', 'active', '2024-03-01T10:00:00Z', 1, 1),
  (2, 1002, 'Grace', NULL, 'Hopper', 'Murray', 'grace.hopper@ducky.edu', '+5215555550102', 2, '$2b$dummyhashgrace', 'active', '2024-03-01T11:00:00Z', 1, 1),
  (3, 1003, 'Alan', NULL, 'Turing', 'Bolton', 'alan.turing@ducky.edu', '+5215555550103', 3, '$2b$dummyhashalan', 'active', '2024-03-01T12:00:00Z', 1, 1),
  (7, 1004, 'Hedy', NULL, 'Lamarr', 'Kiesler', 'hedy.lamarr@ducky.edu', '+5215555550104', 1, '$2b$dummyhashhedy', 'blocked', '2024-03-03T10:00:00Z', 1, 1),
  (4, 2001, 'Maria', NULL, 'Gonzalez', 'Lopez', 'student2001@ducky.edu', '+5215555550201', 4, '$2b$dummyhashmaria', 'active', '2024-03-02T10:00:00Z', 1, 1),
  (5, 2002, 'Luis', NULL, 'Perez', 'Garcia', 'student2002@ducky.edu', '+5215555550202', 4, '$2b$dummyhashluis', 'active', '2024-03-02T11:00:00Z', 1, 1),
  (6, 2003, 'Sofia', 'A.', 'Ramirez', 'Santos', 'student2003@ducky.edu', '+5215555550203', 4, '$2b$dummyhashsofia', 'active', '2024-03-02T12:00:00Z', 1, 1),
  (8, 2004, 'Diego', NULL, 'Hernandez', 'Ruiz', 'student2004@ducky.edu', '+5215555550204', 4, '$2b$dummyhashdiego', 'blocked', '2024-03-04T09:00:00Z', 1, 1),
  (9, 2005, 'Elena', NULL, 'Castillo', 'Mora', 'student2005@ducky.edu', '+5215555550205', 4, '$2b$dummyhashelena', 'active', '2024-03-04T10:00:00Z', 1, 1),
  (10, 2006, 'Mateo', NULL, 'Navarro', 'Cruz', 'student2006@ducky.edu', '+5215555550206', 4, '$2b$dummyhashmateo', 'disabled', '2024-03-04T11:00:00Z', 1, 1);

