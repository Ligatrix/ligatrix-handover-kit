// The skeleton `handover init` writes. Every value the sending team must
// supply is marked `<fill in: …>` so that `handover check` finds it.

const F = (hint) => `<fill in: ${hint}>`;

const handover = (name) => `# ${name}: handover

<!-- The first page the new owner reads. Replace every "fill in" marker,
     tick every checklist item, then run: handover check <this folder> -->

## Summary

${F("what the system does, who uses it and what would stop if it went down, in two or three sentences")}

## Handover details

| Item | Value |
| --- | --- |
| System | ${name} |
| Handed over by | ${F("team or company")} |
| Received by | ${F("team, role and contact address")} |
| Handover date | ${F("YYYY-MM-DD")} |
| Source repository | ${F("URL")} |
| Production address | ${F("URL")} |

## What you receive

- The complete source code, in a repository your organisation owns.
- [Architecture notes](docs/architecture.md): the parts of the system and how they fit.
- [Runbook](docs/runbook.md): how to start, deploy, back up, restore and rotate keys.
- [Access transfer](docs/access-transfer.md): every account, domain and secret, moved to you.
- [Dependencies](docs/dependencies.md): every library and service, with its licence.
- [Decision records](docs/decisions/): why the system is built the way it is.
- [Handover checklist](checklists/handover-checklist.md): what was verified, item by item.

## Support after handover

${F("what support continues after the handover date, for how long, and how to reach it")}

## Sign-off

- [ ] Sending side: every access item transferred and its own access removed
- [ ] Receiving side: the system started and deployed from the runbook by your own team
`;

const architecture = (name) => `# Architecture: ${name}

## Overview

${F("one paragraph: the problem the system solves and its main moving parts")}

## Components

| Component | Technology | Responsibility |
| --- | --- | --- |
| ${F("name")} | ${F("language, framework")} | ${F("what it does")} |

## Data and storage

${F("databases, file storage, what is kept where and for how long")}

## Integrations

${F("every external system it talks to, in which direction, and how it authenticates")}

## Environments

${F("production, staging, local: where each runs and how they differ")}

## Security

${F("authentication, authorisation, encryption at rest and in transit, audit trail")}

## Known limitations

${F("what the system does not do yet, and the limits it was sized for")}
`;

const runbook = (name) => `# Runbook: ${name}

<!-- Every procedure here should be runnable, command by command, by someone
     who has never seen the system. -->

## Prerequisites

${F("tools, versions and access an operator needs")}

## Start locally

${F("commands to run the system on a laptop")}

## Deploy

${F("how a change reaches production, and how to roll it back")}

## Back up

${F("what is backed up, how often, where to, and how to take a backup by hand")}

## Restore

${F("step by step restore of the database and files, and how to verify it")}

## Rotate keys

${F("every secret, how to rotate it, and what restarts afterwards")}

## On-call checks

${F("daily and incident checks: health endpoints, logs, queues, disk")}

## Escalation

${F("who to contact for what, and the vendor support routes")}
`;

const accessTransfer = (name) => `# Access transfer: ${name}

<!-- Tick an item only once the receiving side has confirmed it can sign in. -->

## Repository ownership

- [ ] Repository transferred to ${F("the receiving organisation")}
- [ ] Branch protection and required checks reviewed by the receiving side
- [ ] Sending side's personal and deploy access removed

## Cloud accounts

- [ ] Billing owner changed to the receiving organisation
- [ ] Root or owner account credentials reset by the receiving side
- [ ] Sending side's users and access keys removed

## DNS and domains

- [ ] Domain registrar account owned by the receiving organisation
- [ ] DNS records exported and reviewed
- [ ] Certificate renewal confirmed under the new ownership

## Secrets

- [ ] Every secret listed in the runbook rotated after the transfer
- [ ] Secret store access limited to the receiving side

## Admin users

- [ ] At least two administrators from the receiving side created
- [ ] Sending side's administrator accounts disabled

## Third-party services

${F("each external service: account owner today, owner after handover, date moved")}
`;

const dependencies = (name) => `# Dependencies: ${name}

<!-- Run "handover deps <path to package.json>" and paste its table under
     Libraries. Replace every "check" with the licence you confirmed. -->

## Libraries

| Package | Kind | Version | Licence |
| --- | --- | --- | --- |
| ${F("package")} | ${F("runtime or development")} | ${F("version")} | ${F("licence")} |

## Hosted services

| Service | Purpose | Plan | Licence or terms |
| --- | --- | --- | --- |
| ${F("service")} | ${F("what it is used for")} | ${F("plan")} | ${F("terms")} |

## Runtime platform

${F("language runtime, operating system and database versions in production")}
`;

const decision0001 = (date) => `# 1. Record architecture decisions

Date: ${date}

## Status

Accepted

## Context

The team that runs this system after handover was not in the room when it was
designed. Without a record, the reasons behind its structure are lost, and a
sound choice can be undone because nobody remembers why it was made.

## Decision

We record every decision that shapes the system's structure, its data or its
dependencies as a short numbered document in \`docs/decisions/\`, with four
headings: Status, Context, Decision and Consequences. A record is never
rewritten once accepted; a later record supersedes it and says so.

## Consequences

Anyone can read why the system looks the way it does. Changing an earlier
decision means writing a new record, which keeps the history honest at the
cost of a few minutes per decision.
`;

const checklist = (name) => `# Handover checklist: ${name}

<!-- Every item is ticked by the person who verified it. "handover check"
     refuses a bundle with an unticked item. -->

## Code

- [ ] The default branch builds from a clean clone
- [ ] Automated tests pass on the default branch
- [ ] No credentials in the repository or its history

## Documentation

- [ ] Architecture notes match what is deployed
- [ ] Every runbook procedure carried out once by the receiving side
- [ ] Decision records cover the main structural choices

## Access

- [ ] Every item in the access transfer list ticked
- [ ] Sending side holds no remaining access

## Operations

- [ ] A backup restored to a scratch environment and verified
- [ ] Monitoring and alerts reach the receiving side
- [ ] Every dependency has a confirmed licence

## Sign-off

- [ ] Handover meeting held and questions answered
- [ ] Support terms after handover agreed in writing
`;

/**
 * The skeleton files for a new bundle.
 * @param {{ name: string, date: string }} options
 * @returns {Record<string, string>} relative path -> content
 */
export function skeleton({ name, date }) {
  return {
    "HANDOVER.md": handover(name),
    "docs/architecture.md": architecture(name),
    "docs/runbook.md": runbook(name),
    "docs/access-transfer.md": accessTransfer(name),
    "docs/dependencies.md": dependencies(name),
    "docs/decisions/0001-record-architecture-decisions.md": decision0001(date),
    "checklists/handover-checklist.md": checklist(name),
  };
}
