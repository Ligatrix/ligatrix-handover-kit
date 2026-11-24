# 2. PostgreSQL as the job queue

Date: 2026-06-09

## Status

Accepted

## Context

The portal needs background work: the nightly stock import, outgoing email
and delivery-note PDFs. Volume is low (a few thousand jobs a day) but each job
must run exactly once and survive a restart. A dedicated message broker would
be one more service to host, secure, back up and hand over, for a team of two
in Corvane IT.

## Decision

Jobs are rows in `app.jobs`. The worker takes work with
`SELECT ... FOR UPDATE SKIP LOCKED`, marks it running in the same
transaction, and records the result. Failed jobs are retried with
exponential back-off up to five times, then left in `failed` for a person to
look at. A job that creates business data does so in the same transaction
that completes the job.

## Consequences

- One datastore to run, monitor and back up; jobs are restored with the data
  they refer to.
- A job and the data it writes commit together, so there is no "sent twice"
  or "lost" state between a broker and the database.
- Throughput is bounded by the database. At around 100 jobs a second this
  design would need revisiting; the portal runs at well under one.
- The queue is inspected with plain SQL, which the on-call checks use.
