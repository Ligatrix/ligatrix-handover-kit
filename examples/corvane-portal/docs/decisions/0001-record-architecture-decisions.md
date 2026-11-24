# 1. Record architecture decisions

Date: 2026-06-02

## Status

Accepted

## Context

The team that runs this system after handover was not in the room when it was
designed. Without a record, the reasons behind its structure are lost, and a
sound choice can be undone because nobody remembers why it was made.

## Decision

We record every decision that shapes the system's structure, its data or its
dependencies as a short numbered document in `docs/decisions/`, with four
headings: Status, Context, Decision and Consequences. A record is never
rewritten once accepted; a later record supersedes it and says so.

## Consequences

Anyone can read why the system looks the way it does. Changing an earlier
decision means writing a new record, which keeps the history honest at the
cost of a few minutes per decision.
