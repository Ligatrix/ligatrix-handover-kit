# Dependencies: Corvane operations portal

Every library is open source and installed from the public npm registry; the
exact versions are pinned in `package-lock.json`. No dependency needs a
licence key, a subscription or an account held by the sending side.

## Libraries

| Package | Kind | Version | Licence |
| --- | --- | --- | --- |
| @fastify/cookie | runtime | 9.4.0 | MIT |
| @fastify/formbody | runtime | 7.4.0 | MIT |
| @fastify/static | runtime | 7.0.4 | MIT |
| argon2 | runtime | 0.40.3 | MIT |
| csv-parse | runtime | 5.5.6 | MIT |
| fastify | runtime | 4.28.1 | MIT |
| nodemailer | runtime | 6.9.14 | MIT-0 |
| otplib | runtime | 12.0.1 | MIT |
| pg | runtime | 8.12.0 | MIT |
| pino | runtime | 9.3.2 | MIT |
| ssh2-sftp-client | runtime | 10.0.3 | Apache-2.0 |
| zod | runtime | 3.23.8 | MIT |
| c8 | development | 10.1.2 | ISC |
| eslint | development | 8.57.0 | MIT |

## Hosted services

| Service | Purpose | Plan | Licence or terms |
| --- | --- | --- | --- |
| Linux VMs (Ubuntu 22.04 LTS) | Web and worker processes | 2 vCPU, 4 GB, production and staging | Hosting provider's terms, Corvane account |
| Managed PostgreSQL 16 | Database, job queue, audit log | 2 vCPU, 4 GB, 80 GB storage | Hosting provider's terms; PostgreSQL Licence |
| S3-compatible object storage | Delivery notes, return photos, backups | Pay per use | Hosting provider's terms |
| Email relay | Outgoing email | 10,000 messages a month | Relay provider's terms, Corvane account |
| Caddy 2.8 | Reverse proxy and TLS | Self-hosted | Apache-2.0 |
| restic 0.16 | Encrypted backups | Self-hosted | BSD-2-Clause |

## Runtime platform

- Node.js 22 LTS (supported by the Node.js project until April 2027; moving
  to the next LTS is a version change in `.nvmrc` and the CI matrix, tested on
  staging)
- Ubuntu 22.04 LTS on both VMs, with unattended security updates on
- PostgreSQL 16, managed, minor versions applied by the provider in the
  Sunday 04:00 maintenance window
