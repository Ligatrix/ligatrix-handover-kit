# Architecture: Corvane operations portal

## Overview

The portal is one Node.js codebase that runs as two processes: a web process
that serves server-rendered pages to staff browsers, and a worker process that
runs background jobs (the nightly stock import, outgoing email, delivery-note
PDFs). Both share one PostgreSQL database, which is also the job queue. Files
such as delivery notes live in an S3-compatible bucket. A Caddy reverse proxy
terminates TLS in front of the web process.

```
 staff browser ──HTTPS──> Caddy ──> web (Fastify, :3000) ──┐
                                                           ├──> PostgreSQL 16
 ERP SFTP drop <──SFTP── worker (same code, npm run worker)┘        │
                           │                                        │
                           ├──SMTP──> email relay          object storage bucket
                           └──S3 API────────────────────────────────┘
```

## Components

| Component | Technology | Responsibility |
| --- | --- | --- |
| Web | Node.js 22, Fastify 4, server-rendered HTML | Pages, forms, sign-in, the JSON endpoints the stock screen polls |
| Worker | Node.js 22, same repository (`src/worker`) | Jobs from the `jobs` table: stock import, email, PDFs, nightly clean-up |
| Database | PostgreSQL 16 (managed) | All business data, the job queue, the audit log |
| File storage | S3-compatible bucket `corvane-portal-files` | Delivery notes and uploaded return photos |
| Reverse proxy | Caddy 2.8 | TLS certificates, HTTP to HTTPS redirect, gzip, request logs |

## Data and storage

- **Orders, customers, products, stock, purchase orders, returns** live in
  PostgreSQL, schema `app`. Migrations are plain SQL files in `db/migrations`,
  applied in order by `npm run db:migrate`.
- **Audit log** (`app.audit_events`) records who changed what and when; rows
  are never updated or deleted by the application, and are kept for 7 years.
- **Jobs** (`app.jobs`) hold pending and finished background work; finished
  jobs older than 30 days are removed by the nightly clean-up job.
- **Files** live in the bucket under `delivery-notes/<year>/<order id>.pdf` and
  `returns/<return id>/`. Versioning is on, with 30 days of old versions kept.
- Personal data is limited to customer contact names, email addresses and
  phone numbers, and staff accounts.

## Integrations

| System | Direction | How | Authentication |
| --- | --- | --- | --- |
| ERP stock export | ERP to portal | CSV file on the ERP's SFTP server, read nightly at 02:15 | SSH key, read-only account `portal-import` |
| Email relay | portal to staff and customers | SMTP on port 587 with STARTTLS | Username and password in `SMTP_PASSWORD` |
| Object storage | portal to bucket | S3 API | Access key limited to the one bucket |

There are no inbound integrations: nothing outside calls the portal except
staff browsers.

## Environments

| Environment | Where | Data | Deployed by |
| --- | --- | --- | --- |
| Production | VM `portal-prod-1` (Ubuntu 22.04, 2 vCPU, 4 GB) and managed PostgreSQL | Real | Tag `v*` on `main` |
| Staging | VM `portal-staging-1` and a smaller managed PostgreSQL | Anonymised copy, refreshed monthly | Every merge to `main` |
| Local | Developer laptop, PostgreSQL in Docker | Seed data from `db/seed.sql` | By hand |

Production and staging differ only in size and in the values of their
environment files; the code and the deployment steps are the same.

## Security

- **Sign-in:** email and password, stored as argon2id hashes. Administrators
  and approvers also use a time-based one-time code. The sign-in cookie is
  signed, `HttpOnly`, `Secure`, `SameSite=Lax`, and lasts 12 hours.
- **Roles:** viewer, clerk, approver and admin, checked on every route by one
  `requireRole` hook. Purchase orders above the approval limit (set in
  Settings, 5,000 by default) need an approver who did not raise them.
- **Transport:** HTTPS only, with HSTS. The database accepts TLS connections
  from the application VMs' addresses only.
- **At rest:** the managed database and the bucket encrypt at rest; backups
  are encrypted by restic before they leave the VM.
- **Audit:** every create, update and approval writes an audit event with the
  user, time, address and before and after values.

## Known limitations

- One production VM: a VM failure means downtime until it is rebuilt from the
  runbook (measured at 40 minutes). A second VM behind a load balancer is the
  next step if that becomes unacceptable.
- Stock is as fresh as the last nightly import; same-day stock changes made
  in the ERP appear the next morning (see decision 0003).
- Sized for 150 staff users and 20,000 orders a month; the database is at
  about 4% of its storage at handover.
