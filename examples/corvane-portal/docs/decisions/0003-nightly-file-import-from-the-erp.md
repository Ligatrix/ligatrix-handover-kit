# 3. Nightly file import from the ERP

Date: 2026-06-16

## Status

Accepted

## Context

Stock levels belong to the ERP. It offers two ways out: a nightly CSV export
to its SFTP server, included in Corvane's licence, and a live API, sold as a
paid add-on with per-call limits. Warehouse staff told us stock that is
correct each morning is enough for the order desk; same-day changes are
already confirmed by phone with the warehouse.

## Decision

The worker reads the nightly CSV export from the ERP's SFTP server at 02:15,
validates every row, and replaces the stock table in one transaction. A file
that fails validation is rejected as a whole and the previous day's stock
stays in place, with an alert to Corvane IT. The import is idempotent:
running it twice on the same file changes nothing.

## Consequences

- No new cost and no dependency on the ERP's add-on terms.
- Stock in the portal can be up to a day old; the stock screen shows the time
  of the last import so nobody mistakes it for live figures.
- If live stock becomes necessary, the import step is the only part that
  changes: the stock table and the screens stay as they are. That change
  would get its own decision record.
