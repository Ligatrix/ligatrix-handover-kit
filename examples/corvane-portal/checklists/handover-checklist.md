# Handover checklist: Corvane operations portal

Each item was verified by Corvane IT together with the sending team during
the handover week, 2026-11-17 to 2026-11-24.

## Code

- [x] The default branch builds from a clean clone on a Corvane laptop
- [x] Automated tests pass on the default branch (412 tests, CI green)
- [x] No credentials in the repository or its history (secret scan run on every commit)
- [x] The `.env.example` file lists every setting the code reads

## Documentation

- [x] Architecture notes match what is deployed
- [x] Every runbook procedure carried out once by Corvane IT
- [x] Decision records cover the main structural choices

## Access

- [x] Every item in the access transfer list ticked
- [x] Sending side holds no remaining access

## Operations

- [x] A backup restored to a scratch database and verified (2026-11-18, 25 minutes)
- [x] A release deployed and rolled back by Corvane IT on production
- [x] Monitoring and alerts reach Corvane IT's on-call address
- [x] Every dependency has a confirmed licence

## Sign-off

- [x] Handover meeting held and questions answered (2026-11-24)
- [x] Support terms after handover agreed in writing
