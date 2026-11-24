# Access transfer: Corvane operations portal

Each item was ticked only after Corvane IT confirmed it could sign in with
its own credentials. Completed between 2026-11-17 and 2026-11-24.

## Repository ownership

- [x] Repository `ops-portal` transferred to the `corvane-example` GitHub organisation
- [x] Branch protection on `main` (pull request and passing CI required) reviewed by Corvane IT
- [x] CI deploy keys re-created by Corvane IT; the old keys deleted
- [x] Sending side's personal and deploy access removed

## Cloud accounts

- [x] Hosting account billing owner changed to Corvane Supply Co.
- [x] Owner account password and second factor reset by Corvane IT
- [x] Two Corvane administrators added with their own second factor
- [x] Sending side's users and access keys removed; the account's access log reviewed

## DNS and domains

- [x] `corvane.example` registrar account owned by Corvane Supply Co.
- [x] DNS records for `portal` and `portal-staging` exported and reviewed
- [x] Certificate renewal confirmed: Caddy renewed a certificate after the transfer

## Secrets

- [x] Secret store entry `corvane/ops-portal` moved to Corvane's vault
- [x] Every secret in the runbook's "Rotate keys" table rotated after the transfer
- [x] Secret store access limited to Corvane IT

## Admin users

- [x] Two portal administrators from Corvane created, with one-time codes set up
- [x] Sending side's portal administrator accounts disabled (kept in the audit log)
- [x] VM `deploy` user's `authorized_keys` holds Corvane keys only

## Third-party services

| Service | Owner before | Owner after | Moved |
| --- | --- | --- | --- |
| Hosting account (VMs, managed PostgreSQL, bucket) | Corvane Supply Co. | Corvane Supply Co. | Owner unchanged; access cleaned 2026-11-19 |
| Email relay | Ligatrix | Corvane Supply Co. | 2026-11-20 |
| Error and uptime alerts | Ligatrix | Corvane Supply Co. | 2026-11-20 |
| ERP SFTP account `portal-import` | ERP administrator | ERP administrator | Unchanged; key rotated 2026-11-21 |

## Confirmation

- [x] Corvane IT signed in to every account above with its own credentials
- [x] A final check found no access held by the sending side
