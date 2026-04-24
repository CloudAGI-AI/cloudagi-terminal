# @cloudagi/shared

Shared TypeScript types, Zod schemas, constants, and helpers for the CloudAGI monorepo.
Used by `apps/web`, `apps/server`, and `apps/agent-sdk` as the single source of truth for all data model definitions.

## Installation

This package is a private monorepo workspace — no npm publish needed. Reference it via the workspace protocol.

## Usage

```ts
import { AgentSchema, type Agent } from '@cloudagi/shared';

const agent: Agent = AgentSchema.parse(rawData);
```

Import constants and helpers:

```ts
import { PLATFORM_FEE_BPS, REPUTATION_TIERS, parseSkillTag } from '@cloudagi/shared';

const { domain, action, version } = parseSkillTag('sentiment.classify.v1');
```

## Schemas

Entities: `Agent`, `Session`, `Invocation`, `Receipt`, `StakeEvent`, `Reputation`, `IntentApproval`.
