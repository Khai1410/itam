# IT Asset Management

![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Ant Design](https://img.shields.io/badge/Ant%20Design-5-0170FE?logo=antdesign&logoColor=white)

A self-hosted web app for tracking IT assets (laptops, monitors, phones, etc.) and who
they're assigned to — built to replace a spreadsheet-based asset tracker. Runs entirely
in Docker; no external services required.

## Architecture

- **backend/** — Node.js (Express) + PostgreSQL (Knex), REST API under `/api`
- **frontend/** — React (Vite) + Ant Design, static build served by Nginx, which proxies
  `/api` to the backend
- **db** — PostgreSQL 16, data stored in the `db_data` Docker volume

On first startup, the backend container automatically:
1. Runs migrations to create the schema (`users`, `employees`, `assets`,
   `asset_assignment_history`, `file_vault`, `windows_keys`)
2. Creates an admin account from the `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
3. Imports data from an Excel workbook if you provide one at
   `backend/seed/data/assets-source.xlsx` (see [Importing existing data](#importing-existing-data)) —
   runs once, skipped on later restarts if `assets` already has rows

## Running it

```bash
docker compose up --build -d
```

That's it — no `.env` file required to try it out. Open **http://localhost:8080** and
sign in with the default admin (`admin` / `admin123`).

For anything beyond a quick look — a shared/production instance, or just changing the
default password — copy `.env.example` to `.env` and edit it before starting:

```bash
cp .env.example .env
# edit .env: set JWT_SECRET, ADMIN_USERNAME/ADMIN_PASSWORD, and a Postgres password

docker compose up --build -d
```

(Change the exposed port via `FRONTEND_PORT` in `.env`.)

## Configuration

All configuration is via `.env` at the repo root — see `.env.example` for the full list.
Every variable has a working default, so `.env` is entirely optional for a first run.

| Variable | Purpose |
|---|---|
| `POSTGRES_*`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Core setup — defaults to `itam` / `admin` / `admin123`, change for anything but a local trial |
| `EMPLOYEE_EMAIL_DOMAIN` | If set, auto-appends this domain to any employee account typed without an `@` (e.g. `jdoe` → `jdoe@example.com`) |
| `ORG_NAME` | Shown in the sidebar and login screen | 
| `SENDER_NAME`, `SENDER_TITLE`, `SENDER_ADDRESS`, `SENDER_MOBILE`, `SENDER_EMAIL`, `SENDER_WEB` | IT contact details used in the handover-confirmation email template on the Employee Lookup page |

**Logo**: replace `frontend/src/assets/orgLogo.js` (a single base64 `data:` URI export)
with your own to rebrand the handover-email signature block.

## Features

- **Dashboard** — asset counts by status, type, location, business unit, and (for
  laptops) chip/storage, computed live from current data
- **Assets** — filterable, searchable, resizable-column table; add/edit/delete
  (admin only); right-click a row for Edit/Delete, double-click to edit; per-asset
  assignment history with timestamps; Excel/CSV export respecting active filters, and
  bulk import/update from an `.xlsx` using the same column layout
- **Employee Lookup** — pick an employee to see everything assigned to them, plus a
  ready-to-copy handover-confirmation email (HTML, pastes into Outlook/Gmail with
  formatting intact)
- **Employees** — list/add/edit/delete, bulk-select and delete (e.g. departed staff),
  onboarding form
- **Accounts** (admin only) — create/delete `admin` or `viewer` users; viewers get
  read-only access everywhere

## Importing existing data

If you're migrating from a spreadsheet, drop an `.xlsx` file at
`backend/seed/data/assets-source.xlsx` before first startup, matching the column layout
`backend/src/seed/import-excel.js` expects (see that file for the exact column mapping —
it reads a `Detail` sheet for assets and an `Employee` sheet for staff). Re-running the
import: `docker compose down -v && docker compose up --build -d` (this wipes the
database and reimports from scratch).

Without a seed file, the app just starts with empty `assets`/`employees` tables. That's
the easiest path for most people — sign in, then use **Assets → Import Excel** to bulk-add
your devices at any time (see [Features](#features)) instead of wiring up a one-time seed
file.

## Backups

`scripts/backup-db.ps1` (Windows/PowerShell) dumps the database via `pg_dump` to
`backups/` with a timestamp, keeping the most recent 30. Schedule it with Windows Task
Scheduler for automatic daily backups. Restore with:

```bash
docker cp your_backup.dump itam-db-1:/tmp/restore.dump
docker exec itam-db-1 pg_restore -U <POSTGRES_USER> -d <POSTGRES_DB> --clean --if-exists /tmp/restore.dump
```

## Local development (without Docker)

```bash
# Backend
cd backend
npm install
npm run migrate
npm run seed:admin
npm run seed:import   # only if you've placed a seed .xlsx
npm start              # http://localhost:4000

# Frontend
cd frontend
npm install
npm run dev             # http://localhost:5173, proxies /api to localhost:4000
```
