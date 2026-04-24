# CloudAGI — Product Specification

> Status: DRAFT — to be expanded by the SPEC writer in Wave 0 overnight sprint.

## Vision

CloudAGI is a cloud agentic infrastructure layer that lets providers monetize local or hosted AI models, and lets buyers hire agents through an integrated web terminal with full evidence transparency on every interaction.

## Personas

### Seller (provider)
Operator with spare compute or API credentials. Runs a local model (Llama, Mistral, Qwen) or wraps a hosted API. Wants to monetize uptime.

### Buyer (consumer)
Developer, agent builder, or end user who wants to invoke a specific agent's skill, pay per call, and keep a verifiable receipt.

### Observer
Public audience of the leaderboard and receipt feed. Judges, researchers, potential contributors.

## Core user stories

1. As a seller, I connect my model endpoint or API credentials, set per-M-token pricing, and register an agent with skill tags and reputation identity.
2. As a seller, I receive stablecoin payments automatically on each invocation with a verifiable on-chain settlement trail.
3. As a buyer, I browse registered agents filtered by skill, price per M-token, reputation tier, and uptime.
4. As a buyer, I open a web terminal, type my prompt, see the agent's intent before execution, approve scope, watch the stream, and receive a receipt.
5. As an observer, I see the live leaderboard, call volume, and receipt feed for every agent in real time.

## Non-goals for MVP

- Decentralized training of models
- Fine-tuning infrastructure
- Agent-to-agent autonomous negotiation (deferred)
- Token launch / governance token (explicit)

## Data model (placeholder — expanded by SPEC writer)

- Agent: id, provider, endpoint, skills, pricing, reputation, stake
- Session: id, buyer, agent, opened_at, state
- Invocation: id, session, prompt_hash, intent, approval_sig, tokens_in, tokens_out, output_hash, injection_flags, settlement_sig
- Receipt: minted per invocation, references invocation id + hashes
- Stake / slash events: on-chain only

## Contract surfaces (placeholder)

- Registry program: register, update, deactivate agent
- Receipt mint: cNFT issuance per invocation
- Intent / mandate: optional scope-approval program

## API surfaces (placeholder)

- POST /v1/agents — register
- GET  /v1/agents — discover
- POST /v1/agents/:id/invoke — paywalled (HTTP 402 on first call)
- WS   /v1/sessions/:id/stream — live terminal stream

## Payment rail

Stablecoin settlement on a low-fee chain. HTTP 402 payment-required protocol. Facilitator service handles signature verification and on-chain submit.

## Receipt evidence scheme

Each invocation produces:
- Input hash (sha256 of prompt + params)
- Output hash (sha256 of final response)
- Token counts (tokens in, tokens out)
- Prompt-injection flags (heuristic + LLM judge)
- Tool calls performed
- Settlement signature + timestamp

Receipt is a compressed NFT owned by the buyer wallet; hash commitments prove content without requiring storage on-chain.

## Open questions (to resolve during sprint)

- Intent-approval UX: per-invocation or per-session?
- How to handle streaming responses and partial payment?
- Dispute flow when buyer claims agent did not deliver?
- Model-behavior attestation: do we support TEE attestation for model integrity?
