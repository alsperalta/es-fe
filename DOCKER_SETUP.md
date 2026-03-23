# SolarPro — Docker Setup Guide

## What runs in Docker

| Container          | Image          | Port | Purpose                           |
|--------------------|----------------|------|-----------------------------------|
| `solarpro-db`      | MySQL 8.0      | 5433 | Persistent database               |
| `solarpro-backend` | Custom (Java)  | 8081 | Spring Boot REST API              |
| `solarpro-frontend`| Custom (Nginx) | 80   | React app + reverse proxy to API  |

Nginx proxies all `/api/*` requests to the backend container.
The React app is served as static files.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- 4 GB free RAM recommended

---

## Quick Start

```bash
# 1. Unzip the project
unzip SolarPro_Docker_v1.2.zip
cd solarpro

# 2. Copy environment file and set your passwords
cp .env.example .env
# Edit .env to change passwords (optional for local use)

# 3. Build and start everything
docker compose up --build

# First run takes 3–5 minutes (downloads images, compiles Java, builds React)
# Subsequent starts take ~30 seconds
```

Open **http://localhost** in your browser.

That's it. Demo data seeds automatically on first run.

---

## Common Commands

```bash
# Start (background)
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f
docker compose logs -f backend    # backend only
docker compose logs -f frontend   # nginx only

# Rebuild after code changes
docker compose up --build

# Open MySQL shell
docker exec -it solarpro-db mysql -u solarpro -psolarpro_pass_2024 solarpro

# Check container status
docker compose ps
```

---

## Ports

| Service  | URL                        |
|----------|----------------------------|
| App      | http://localhost           |
| API      | http://localhost/api       |
| Backend  | http://localhost:8081      |
| Postgres | localhost:5433             |

---

## Environment Variables (.env)

| Variable              | Default               | Description            |
|-----------------------|-----------------------|------------------------|
| `POSTGRES_ROOT_PASSWORD` | `solarpro_root_2024`  | MySQL root password |
| `POSTGRES_DATABASE`      | `solarpro`            | Database name       |
| `POSTGRES_USER`          | `solarpro`            | App DB user         |
| `POSTGRES_PASSWORD`      | `solarpro_pass_2024`  | App DB password     |

---

## Data Persistence

MySQL data is stored in the `solarpro-db-data` Docker volume.
Your data survives `docker compose down`.

To **wipe all data** and start fresh:
```bash
docker compose down -v   # -v removes volumes
docker compose up --build
```

---

## Production Deployment (VPS / Server)

```bash
# On your server:
git clone your-repo   # or scp the zip
cd solarpro

# Edit .env with strong passwords
nano .env

# Start in background
docker compose up -d --build

# Set up a reverse proxy (Nginx/Caddy) in front of port 80
# for your domain + SSL certificate
```

Example Caddy config for your domain:
```
yourdomain.com {
    reverse_proxy localhost:80
}
```

---

## Architecture Diagram

```
Browser
  │
  ▼
┌─────────────────────────────┐
│   Nginx (port 80)           │
│   solarpro-frontend         │
│   - Serves React static     │
│   - /api/* → backend:8080   │
└─────────────────┬───────────┘
                  │ proxy
                  ▼
┌─────────────────────────────┐
│   Spring Boot (port 8080)   │
│   solarpro-backend          │
│   - REST API /api/**        │
│   - PDF generation          │
│   - Data seeding            │
└─────────────────┬───────────┘
                  │ JDBC
                  ▼
┌─────────────────────────────┐
│   MySQL 8.0 (port 3306)     │
│   solarpro-db               │
│   - Persistent volume       │
└─────────────────────────────┘
```
