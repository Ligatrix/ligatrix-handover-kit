# Corvane operations portal: handover

> Corvane Supply Co. is a fictional distributor used in this demo. Every name,
> address and figure in this bundle is invented to show what a complete
> handover looks like.

## Summary

The operations portal is the internal web application Corvane Supply Co.'s
order desk, warehouse and purchasing staff use every working day. It takes
customer orders by phone and email, shows live stock by warehouse, routes
purchase orders above the approval limit to an approver, and records returns.
If it is down, orders are taken on paper and stock levels go stale until the
next nightly import.

## Handover details

| Item | Value |
| --- | --- |
| System | Corvane operations portal |
| Handed over by | Ligatrix |
| Received by | Corvane Supply Co. IT, operations lead (it@corvane.example) |
| Handover date | 2026-11-24 |
| Source repository | https://github.com/corvane-example/ops-portal |
| Production address | https://portal.corvane.example |
| Staging address | https://portal-staging.corvane.example |

## What you receive

- The complete source code, in a repository your organisation owns.
- [Architecture notes](docs/architecture.md): the parts of the system and how they fit.
- [Runbook](docs/runbook.md): how to start, deploy, back up, restore and rotate keys.
- [Access transfer](docs/access-transfer.md): every account, domain and secret, moved to you.
- [Dependencies](docs/dependencies.md): every library and service, with its licence.
- [Decision records](docs/decisions/): why the system is built the way it is.
- [Handover checklist](checklists/handover-checklist.md): what was verified, item by item.

## Support after handover

Fixes for defects in the delivered code continue for 60 days after the
handover date, by email to the address in the contract, with a reply within
one business day. After that the system is fully Corvane's: nothing in it
calls back to Ligatrix, and no licence key, account or service of ours is
needed to run, change or redeploy it.

## Sign-off

- [x] Sending side: every access item transferred and its own access removed
- [x] Receiving side: the system started and deployed from the runbook by your own team
