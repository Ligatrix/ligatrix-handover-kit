# Runbook: Corvane operations portal

Every command below is run from the repository root unless it says otherwise.
Production commands are run on `portal-prod-1` as the `deploy` user.

## Prerequisites

- Node.js 22 LTS and npm 10
- Docker (for the local database only)
- `psql` and `pg_restore` 16 for database work
- `restic` 0.16 or later for backups
- SSH access to `portal-prod-1` and `portal-staging-1` (key added to the
  `deploy` user's `authorized_keys`)
- Read access to the secret store entry `corvane/ops-portal`

## Start locally

```sh
cp .env.example .env              # local values, no real secrets
docker compose up -d postgres     # PostgreSQL 16 on localhost:5432
npm ci
npm run db:migrate
npm run db:seed                   # demo products, customers and three users
npm run dev                       # web on http://localhost:3000
npm run worker                    # in a second terminal
```

Sign in as `admin@corvane.example` with the password printed by `db:seed`.

## Deploy

Deployments run from CI; nobody copies files by hand.

1. Merge the pull request to `main`. CI runs lint, tests and migrations
   against a fresh database, then deploys to staging.
2. Check the change on staging.
3. Tag the release: `git tag v1.8.0 && git push origin v1.8.0`.
4. The `deploy-production` job uploads the release to
   `/srv/ops-portal/releases/v1.8.0`, runs `npm run db:migrate`, points
   `/srv/ops-portal/current` at the new release, restarts the services and
   waits for `GET /healthz` to answer `200`.

Roll back to the previous release:

```sh
ssh deploy@portal-prod-1 /srv/ops-portal/bin/rollback
```

Migrations only ever add columns and tables in the release that introduces
them; removals happen one release later. A rollback by one release is
therefore always safe for the database.

## Back up

| What | How | How often | Kept |
| --- | --- | --- | --- |
| Database | Managed snapshots | Daily, 03:00 | 14 days |
| Database | Point-in-time recovery | Continuous | 7 days |
| Database | `pg_dump -Fc` to restic, separate bucket | Daily, 03:30 | 35 days |
| Files | Bucket versioning | Every change | 30 days |
| Configuration | `/srv/ops-portal/shared/.env` in the secret store | On change | All versions |

Take a backup by hand before any risky change:

```sh
ssh deploy@portal-prod-1
/srv/ops-portal/bin/backup-now          # pg_dump + restic backup, prints the snapshot id
restic snapshots --tag ops-portal | tail -n 3
```

## Restore

Restore into a scratch database first, verify it, and only then switch.

1. List snapshots and pick one:
   `restic snapshots --tag ops-portal`
2. Restore the dump: `restic restore <snapshot id> --target /tmp/restore`
3. Create a scratch database in the managed service named
   `ops_portal_restore`, then load it:
   `pg_restore --no-owner --dbname "$RESTORE_URL" /tmp/restore/ops-portal.dump`
4. Verify: `psql "$RESTORE_URL" -f db/verify-restore.sql` prints row counts per
   table and the newest order's timestamp; compare with the time of the
   snapshot.
5. Stop writes: `sudo systemctl stop ops-portal-web ops-portal-worker`.
6. Point `DATABASE_URL` in `/srv/ops-portal/shared/.env` at the restored
   database and start the services again:
   `sudo systemctl start ops-portal-web ops-portal-worker`.
7. Check `GET /healthz` and sign in.

For a point-in-time restore, create the scratch database from the managed
service's console at the chosen time instead of steps 1 to 3. A full restore
drill was carried out on 2026-11-18 and took 25 minutes.

## Rotate keys

| Secret | Where it is used | How to rotate |
| --- | --- | --- |
| `DATABASE_URL` password | web, worker | Create a new password for the `portal_app` role, update `.env`, restart both services |
| `COOKIE_SECRET` | web | Set a new 64-byte random value; everyone signs in again |
| `SMTP_PASSWORD` | worker | Issue a new credential at the email relay, update `.env`, restart the worker, send a test with `npm run mail:test` |
| SFTP key `portal-import` | worker | `ssh-keygen -t ed25519`, send the public key to the ERP administrator, update the key path in `.env` once they confirm |
| `STORAGE_ACCESS_KEY` and secret | web, worker | Create a second key for the bucket, update `.env`, restart, then delete the old key |
| restic repository password | backups | `restic key add`, update the secret store, `restic key remove <old id>` |

After any rotation: restart with
`sudo systemctl restart ops-portal-web ops-portal-worker`, check
`GET /healthz`, and record the date in the secret store entry.

## On-call checks

Daily, before 09:00:

- `curl -fsS https://portal.corvane.example/healthz` answers
  `{"status":"ok","database":"ok","queue":"ok"}`.
- The stock import ran: the dashboard's "Last stock import" tile shows a
  time after 02:15 today, or run
  `psql "$DATABASE_URL" -c "select max(finished_at) from app.import_runs where status = 'ok'"`.
- The job queue is not backing up:
  `psql "$DATABASE_URL" -c "select count(*) from app.jobs where status = 'pending' and run_at < now() - interval '10 minutes'"`
  returns 0.
- Errors in the last day: `journalctl -u ops-portal-web -u ops-portal-worker --since yesterday -p err`.
- Disk on the VM below 80%: `df -h /srv`.

When an alert fires, start with `journalctl -u ops-portal-web -n 200` and the
health endpoint's answer; it names the failing part.

## Escalation

| Problem | First contact | Then |
| --- | --- | --- |
| Portal down or erroring | Corvane IT on-call | Hosting provider support (account details in the secret store) |
| Stock import failed | Corvane IT on-call | ERP administrator, for the SFTP drop |
| Email not arriving | Corvane IT on-call | Email relay support |
| Defect in the code, first 60 days | Corvane IT on-call | Ligatrix, by email, as in the contract |
