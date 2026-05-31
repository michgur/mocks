# Harmony telephony model

Design state of Harmony's telephony stack — both the regulatory side (carrier registrations) and the operational side (phone numbers) — as a handoff for fresh context.

_Last updated: May 2026._

## TL;DR

- Customers register their business once, then submit one **capability** per regulatory requirement (Twilio Customer Profile, A2P, CNAM, country bundles, STIR/SHAKEN). Each capability has a uniform lifecycle: draft → submitted → in review → approved / rejected.
- Once approved, capabilities **auto-attach** to phone numbers. Customer doesn't manage per-number.
- Phone numbers belong directly to **agents**.
- An agent has a list of numbers and an **auto-rotate** flag. When a number is detected as spam-labeled, and auto-rotate is on, we replace it with a fresh one in the same geo.
- **No multi-agent sharing of numbers.** Numbers belong to one agent.

---

## Part 1: Regulatory side (capability system)

### Why the "capability" abstraction

Carrier compliance requirements vary by country, channel, and use case, and change over time. Treating every distinct piece of submittable regulatory data as one uniform thing — a **capability** — lets us handle Twilio Customer Profiles, A2P brand registrations, CNAM filings, country bundles, and STIR/SHAKEN attestations through a single lifecycle and UI.

### Business registration

Capabilities belong to a **business registration**. An account can hold multiple registration (parent + subsidiary, holdco + opco), each with its own capability stack.

### Capability lifecycle

```
                       ┌──── (dependency unmet) ────┐
                       ▼                            │
   draft ──submit──▶ waiting ──dep approved──▶ in review ──┬──▶ approved
     ▲                                                     │
     └────────────────── re-edit ◀── rejected ◀────────────┘
```

Additional states:
- **error** — invalid provider state, rare, usually retryable
- **not configured** — in the catalog but customer hasn't started

### Capability dependencies

```
business_verification ─┬─▶ outbound_calling
                       ├─▶ text_messaging
                       ├─▶ caller_id_name
                       └─▶ caller_id_passthrough

number_provisioning  (standalone, one per non-US country)
```

A capability with an unapproved dependency lands in `waiting` on submit and auto-advances to `in_review` when the dependency clears.

### Country scope

- **US-only**: STIR/SHAKEN, A2P 10DLC, CNAM, Branded Calls
- **Per-country bundle**: Number Provisioning bundle for non-US/IL countries (UK, AU, DE, FR…). Hard prerequisite — buying a number in a bundle country requires the bundle approved first.
- **Country-agnostic**: Business Profile (describes the entity, not a channel)

### Capability catalog

| Capability | Country | Depends on | Notes |
| --- | --- | --- | --- |
| Business Verification | — | — | One per registration |
| Outbound Calling (STIR/SHAKEN) | US | Business Profile | Anti-spam attestation |
| Text Messaging (A2P) | US | Business Profile | Required for SMS to US contacts |
| Caller ID Name (CNAM) | US | Business Profile | Brand name on outbound calls |
| Number Provisioning (Country Bundle) | UK, AU, DE, FR, … | — | One per non-US country |
| Caller ID Passthrough | — | Business Profile | Support-only |
| Alphanumeric Sender ID | DE, FR (EU) | — | Future |
| Branded Calls | US | Business Profile | Future |

### Capability ↔ number assignment

- Each approved capability has an `auto_assign` flag (default on).
- With auto-assign on, all eligible numbers (per the capability's country scope) get the capability attached automatically — including numbers acquired later.
- From the number-management side this is essentially read-only — customers see "which capabilities apply" but rarely touch the assignment.

### Notifications

Approval and rejection fire notifications (in-app + email to `createdBy`). Each notification carries: capability type, new status, reason, CTA verb matched to status (Fix / Review / See), and a short explanation.

### Data shape (sketch)

```
Capability {
  id
  businessRegistrationId
  type
  countries
  status
  isApproved
  dependencies
  rejection? { message, field, code, explanation }
  data                           // type-specific submission payload
  twilioResourceSids
  autoAssign
  assignedNumberIds
  createdBy, createdAt, updatedAt
}
```

Rejections include a `field` code (e.g. CNAM `30799` → `displayName`) so the edit flow can highlight the exact field to fix, not just show a generic error.

---

## Part 2: Number management

### The model

```
Agent {
  ...                              // existing agent fields
  businessRegistrationId                    // determines brand identity / compliance scope
  numbers: PhoneNumber[]
  autoRotate: boolean
  blockIncoming: boolean           // default false;
}

PhoneNumber {
  e164
  country, region
  health: number                   // 0–100 percentage
  status: "active" | "released"
  twilioSid
  acquiredAt
  // businessRegistrationId is inherited via the owning agent
}
```

### Acquisition flow

1. Admin clicks "Add numbers" on the agent screen
2. Specifies count + country + optional region(s). This composition spec exists only at provisioning time — there is no persistent "skeleton" attribute on the agent
3. We scan candidates for spam; only buy healthy ones
4. Capabilities auto-attach per the entity's stack
5. For a country with no approved bundle: not blocked. The intent is accepted, provisioning waits for the bundle to clear. Surfaced as "Waiting on UK country bundle" on the agent screen.

### Auto-rotation

We have a proprietary spam labeling detection mechanism (we call numbers from different carriers, and make a screenshot).

If `autoRotate = true`:

1. Acquire a replacement in the **same `{country, region}`** as the dying number
2. Run the spam scan, pick a healthy candidate
3. Capabilities auto-attach to the new number
4. Release the dying number
5. Notify admin: "Replaced +1 (415) 555-0123 with +1 (415) 555-0456 in Sarah's numbers. Reason: health 38% (carrier complaint)."

If `autoRotate = false`:

1. Send a health alert; notification includes a "Replace now" CTA
2. Customer can replace, release, or ignore

If no replacement is available right now:
- Release the dying number anyway (it's hurting reputation)
- Retry in background
- Notify if retries fail past a threshold ("Couldn't find a replacement — loosen criteria or wait")

### Manual release

When the admin releases a number, modal asks:
- **Release and replace** (default) — top up with an equivalent in the same geo, keep capacity stable
- **Release and shrink** — agent has one fewer number

### Incoming calls

Default: incoming calls on an agent's numbers route to that owning agent. Per-agent `blockIncoming` toggle rejects the call (with a brief message) for outbound-only numbers.

---

## How the two systems talk

1. **Capabilities auto-attach to numbers.** Customer never picks per-number. The agent screen shows attached capabilities and their status, read-only.
2. **Number provisioning is gated on country bundles.** US numbers are buyable anytime (with warnings if downstream capabilities like A2P aren't approved). Non-US numbers wait on the bundle.
3. **Capability rejection cascades to number usability.** If A2P is rejected, every US number's SMS usability flips to unavailable. Surfaced on the agent screen with a deep link to the capability fix flow.
4. **Rotation is capability-aware.** Replacement numbers auto-inherit capabilities via auto-assign.
5. **Business registration scopes both.** Capabilities live at the registration. Agents are at the registration. Numbers inherit from the agent.

---

## Open / deferred

- **External numbers** (BYO Twilio, port-in, Verified Caller IDs) — deferred from v1
- **Temporary disable** (park a number without releasing) — deferred; for now, manual release is the only "stop using this number" action
- **"All numbers across the account" admin view** — maybe; useful for billing/audit but not the primary surface
- **Alphanumeric Sender ID, Branded Calls** — future, per the capability catalog
- **Contact-pool-based provisioning intent** ("buy top 3 states by my contact pool") — deferred; ties into CRM integration work
