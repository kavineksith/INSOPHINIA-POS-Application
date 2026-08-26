# INSOPHINIA POS — Self-Hosted Docker Deployment

This replaces Supabase Postgres + Supabase S3 with a fully self-hosted stack
running on your own machine, reachable by devices on your local network only.

## What you get

| Container | Role | Replaces |
|---|---|---|
| `db` | PostgreSQL 16 | Supabase Postgres |
| `storage` | MinIO (S3-compatible) | Supabase S3 bucket |
| `app` | Your Next.js POS app | Vercel/Next runtime |
| `proxy` | Nginx — HTTPS + LAN gateway | — (new, needed for HTTPS/LAN access) |

Your app's storage code (`src/lib/supabase-storage.ts`) already uses the
plain AWS S3 SDK, not a Supabase-specific one — so pointing it at MinIO
needed **zero code changes**, only environment variables.

## Network model

```
Internet ─── X (blocked — nginx binds to your LAN IP, not 0.0.0.0)
                                        │
LAN devices ──── HTTPS:443 ──────► [proxy/nginx] ──► [app] ──► [db]
(phones, other computers                                  └──► [storage]
 on the same Wi-Fi/router)
```

- `db` and `storage` sit on an **internal-only** Docker network — they have
  no route out of the Docker host at all, from the LAN or the internet.
- `app` sits on that internal network *and* a second network that has
  normal outbound internet access — this is what lets features like email
  sending (SMTP) still work, while the database and backups stay isolated.
- `proxy` (nginx) is the **only** container with a published port, and it's
  bound to your machine's LAN IP specifically (`LAN_BIND_IP` in `.env`),
  not `0.0.0.0`. That means:
  - ✅ Any device on your same Wi-Fi/router can reach `https://<LAN_BIND_IP>`
  - ❌ The public internet cannot reach it, *unless* your router is doing
    port forwarding to this machine — check your router settings if you
    want to be certain (most home routers do not forward by default).

## First-time setup

### 1. Find your machine's LAN IP

```bash
# Windows
ipconfig
# Mac/Linux
ifconfig   # or: ip a
```

Look for something like `192.168.1.50` or `10.0.0.12`.

### 2. Create your environment file

```bash
cp .env.docker.example .env
```

Edit `.env` and fill in:
- `LAN_BIND_IP` and `NEXT_PUBLIC_APP_URL` — use the IP from step 1
- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` — strong passwords
- `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY`, etc. —
  generate with the `node -e "..."` commands shown as comments in the file

### 3. Generate the HTTPS certificate

```bash
chmod +x docker/nginx/generate-cert.sh docker/scripts/*.sh
./docker/nginx/generate-cert.sh 192.168.1.50   # use YOUR LAN IP
```

This creates a self-signed cert valid for `localhost` and your LAN IP.
Browsers will show a "not trusted" warning the first time on each device
— this is expected for a private network with no public CA. Click
through/accept it once per device. (Optional: import
`docker/nginx/certs/insophinia.crt` as a trusted certificate on each
device to remove the warning permanently.)

### 4. Build and start the stack

```bash
docker compose up -d --build
```

First boot will:
- Start Postgres and wait for it to be healthy
- Start MinIO and auto-create the backup bucket
- Build the app image, wait for the DB, run `prisma migrate deploy`, then start
- Start nginx, serving HTTPS on your LAN IP

### 5. Access the app

From any device on the same network:

```
https://192.168.1.50
```

(swap in your actual LAN IP)

### 6. Seed initial data (optional, first run only)

```bash
docker compose exec app node src/lib/seed.js
```

## Day-to-day operations

```bash
docker compose logs -f app        # tail app logs
docker compose ps                 # container status
docker compose down               # stop everything (data volumes persist)
docker compose up -d --build      # rebuild after a code change
```

## Backups

Two layers:

1. **Automatic, in-app**: your existing backup feature (`CRON_SECRET`,
   `uploadBackupToStorage`, etc.) works unchanged — it now writes to the
   local MinIO bucket instead of Supabase.
2. **Manual full DB dump**, from the host machine:
   ```bash
   ./docker/scripts/backup-db.sh
   ```
   Dumps Postgres and uploads the `.sql` file into the same MinIO bucket.

To browse backups directly: open `https://<LAN_BIND_IP>:9001` (MinIO
console) and log in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`.

## Internet-dependent features

Some features (emailing receipts via SMTP, any future license/update
checks) need outbound internet access. This still works: only `db` and
`storage` are network-isolated. The `app` container keeps normal outbound
internet access through the `proxy` Docker network — nothing about the
LAN-only restriction affects the app reaching *out* to the internet, only
what can reach *in* to your data.

## Restoring a backup

```bash
# Copy a .sql file out of MinIO via its console, then:
cat your_backup.sql | docker compose exec -T db psql -U insophinia -d insophinia_pos
```

## Troubleshooting

- **"Database did not become ready in time"** on app startup — check
  `docker compose logs db`; usually a wrong `POSTGRES_PASSWORD` in `.env`.
- **Certificate warning won't go away** — expected for self-signed certs;
  see step 3 above for the optional trust-install workaround.
- **Other devices can't connect** — confirm they're on the *same* Wi-Fi/
  router, and that `LAN_BIND_IP` in `.env` matches the IP from step 1
  exactly (it can change if your router uses DHCP without a reservation —
  consider setting a static IP or DHCP reservation for this machine).
