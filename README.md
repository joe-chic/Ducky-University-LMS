# 🦆 Ducky University LMS

A multi-service Library Management System for Ducky University, built with Node.js microservices, PostgreSQL, React, and Docker Compose.

---

## 🚀 Quick Start

```bash
docker-compose up -d --build
```

Wait ~20 seconds for seeds to complete, then open any of the portals below.

---

## 🌐 Access URLs

| Portal | URL | Description |
|--------|-----|-------------|
| 📚 **Library LMS** | `http://localhost:3000` | Main library portal — login required |
| 🎓 **Scholar Admin** | `http://localhost:3004` | Academic records manager — no login |
| 🏢 **Human Capital Admin** | `http://localhost:3006` | HR records manager — no login |
| 💰 **Treasury Admin** | `http://localhost:3008` | Finance and billing manager — no login |

---

## 🔑 Library LMS Credentials

### Administrator
| Field | Value |
|-------|-------|
| Email | `ada.lovelace@ducky.edu` |
| Password | `admin` |
| Role | Administrador |
| **campus_id** | `1001` |
| Access | Full access: user management, resource management, catalog |

### Librarian
| Field | Value |
|-------|-------|
| Email | `grace.hopper@ducky.edu` |
| Password | `grace` |
| Role | Bibliotecario |
| **campus_id** | `1002` |
| Access | Resource management + catalog (no user management) |

### Professor / Staff
| Field | Value |
|-------|-------|
| Email | `alan.turing@ducky.edu` |
| Password | `alan` |
| Role | Profesor |
| **campus_id** | `1003` |
| Access | Read-only catalog view |

### Students
| Email | Password | Name | campus_id |
|-------|----------|------|-----------|
| `student2001@ducky.edu` | `maria` | Maria Gonzalez | `2001` |
| `student2002@ducky.edu` | `luis`  | Luis Perez | `2002` |
| `student2003@ducky.edu` | `sofia` | Sofia Ramirez | `2003` |
| `student2004@ducky.edu` | `diego` | Diego Hernandez | `2004` |
| `student2005@ducky.edu` | `elena` | Elena Castillo | `2005` |
| `student2006@ducky.edu` | `mateo` | Mateo Navarro | `2006` |

> Students have read-only catalog access. They **cannot** see User Management or Resource Management sections.

### Extra blocked account for testing
| Email | Password | Role | campus_id | Seed state |
|-------|----------|------|-----------|------------|
| `hedy.lamarr@ducky.edu` | `hedy` | Bibliotecario | `1004` | `blocked` |

### Fine/lift workflow seed cases
- `2001` (`student2001@ducky.edu`): unpaid late-return fine (`find_id=6001`, `source_system=library`).
- `2004` (`student2004@ducky.edu`): unpaid damage fine (`find_id=6003`, `source_system=library`).
- `2005` (`student2005@ducky.edu`): paid fine (`find_id=6004`) to validate unblocked flow.
- `2006` (`student2006@ducky.edu`): unpaid loss fine (`find_id=6005`), account seeded as disabled.

Use this test flow:
1. In Treasury, register a payment (`Pay by student`) for `2001` or `2004`.
2. In Library LMS (`Préstamos` → `Multas`), click `Validar pago / sanción`.
3. Retry loan creation for that student to confirm block/lift behavior.

---

## 📖 Resource Catalog

The library starts with **32 resources** (30 books + 2 digital articles), including:

- Classic literature: *The Great Gatsby*, *1984*, *Don Quixote*, *Crime and Punishment*, *War and Peace*
- Modern fiction: *One Hundred Years of Solitude*, *Norwegian Wood*, *Beloved*
- Science & Tech: *Foundation*, *Sapiens*, *Brave New World*
- Mystery: *Murder on the Orient Express*, *The Hound of the Baskervilles*
- Philosophy: *The Stranger*, *The Second Sex*, *Divine Comedy*

Each book has:
- Full metadata (ISBN, edition, synopsis, publication date)
- Physical copies with shelf location codes (e.g. `MAIN-FL2-FIC-A3`)
- Categories and language associations

---

## 🏗️ Architecture

```
localhost:3000  →  frontend-service   (React)
                         ↓
localhost:4000  →  bff-service        (API Gateway)
                    /           \
             users-ms         library-ms
           (port 3001)       (port 3002)
                ↓                  ↓
          db-users           db-library
         (port 5433)        (port 5434)

localhost:3004  →  scholar-frontend   → scholar-bff (4001) → scholar-ms (3003) → db-scholar (5435)
                                                                      ↓ (on employee/student create/update/delete)
                                                             registry-ms (3009) → db-registry (5438)
                                                                      ↑ (on employee create/update/delete)
localhost:3006  →  hcapital-frontend  → hcapital-bff (4002) → hcapital-ms (3005) → db-hcapital (5436)
localhost:3008  →  treasury-frontend  → treasury-bff (4003) → treasury-ms (3007) → db-treasury (5437)
```

---

## 🗄️ Database Ports (Direct Access)

| Database | Port | Name |
|----------|------|------|
| Users DB | `5433` | `user_accounts_db` |
| Library DB | `5434` | `ducky_library_db` |
| Scholar DB | `5435` | `ducky_scholar_db` |
| Human Capital DB | `5436` | `ducky_human_capital_db` |
| Treasury DB | `5437` | `ducky_treasury_db` |
| Registry DB | `5438` | `service_registry_db` |

Connect with: `psql -h localhost -p <port> -U postgres -d <dbname>`

---

## 🗂️ Registry Service API

The Registry microservice (`localhost:3009`) is the central catalog of all university affiliates and their service associations. It is updated automatically by the Scholar and Human Capital microservices whenever an employee or student is created, updated, or disabled.

### Queryable Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `http://localhost:3009/api/affiliates` | Paginated list of all affiliates with their service associations |
| `GET` | `http://localhost:3009/api/affiliates/:campus_id` | Single affiliate record by campus ID |
| `GET` | `http://localhost:3009/api/services` | List all registered microservices |
| `GET` | `http://localhost:3009/api/health` | Health check |

### Internal Endpoints (called by microservices)

| Method | URL | Triggered when... |
|--------|-----|-------------------|
| `POST` | `/api/register` | A new student or employee is created → affiliate registered and linked to its service |
| `POST` | `/api/deregister` | A student or employee is disabled → association marked `is_operational = false` |
| `POST` | `/api/update-email` | A student or employee's email changes → `campus_email` synced in registry |
| `DELETE` | `/api/affiliates/:campus_id` | Hard-delete an affiliate (admin use only) |

---

## 🔧 Rebuilding a Single Service

```bash
# Rebuild library data (after changing dummy data SQL)
docker-compose up -d --build seed-library library-microservice

# Rebuild the frontend only
docker-compose up -d --build frontend-service

# Full clean rebuild
docker-compose down -v
docker-compose up -d --build
```

---

## 📱 Android App

An Android companion app is available in `/android-app`. Open it in **Android Studio**.

- Connects to the BFF at `10.0.2.2:4000` (emulator localhost alias)
- Supports all user roles — login with any of the credentials above
- Read-only catalog browsing with search and location display
