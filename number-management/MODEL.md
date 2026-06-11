# Harmony telephony model

Design state of Harmony's telephony stack — the regulatory layer (compliance), the
connectivity layer (where calls and texts originate), the operational layer (phone
numbers), and the alerting layer — as a handoff for fresh context.

_Last updated: June 2026._

## TL;DR

- The central entity is the **Profile** — it combines a provider mode with a number pool. Managed profiles additionally carry countries and capabilities.
- **Provider mode** lives on the Profile: **managed**, **BYO Twilio**, or **SIP trunk**. Managed is the opinionated path — Harmony provisions numbers and runs the full regulatory pipeline. BYO and SIP are escape hatches that bypass gating.
- Each capability maps to a set of **requirements** — the regulatory artifacts (Business Info, A2P, STIR/SHAKEN, country bundles, CNAM) that must be `approved` for the capability to be available. **Business Info** is the foundation: every other managed capability depends on it.
- Capabilities are **country-scoped** — each applies only to the countries it's required for. A managed Profile spans one or more countries; its capability set is the union across them.
- Capabilities are also **provider-aware** — a SIP trunk is voice-only, so Text Messaging and Number Provisioning are permanently unavailable on it.
- Phone **numbers** belong to one Profile's pool and are assigned to one **agent** (`agentId`). The agent owns both outgoing and incoming traffic on that number.
- Profiles have **auto-rotate** (managed only, requires Caller ID Reputation module): a spam-labeled number is parked and a same-geo replacement is acquired at no extra charge during the parking window.
- Runtime failures and lifecycle events surface in one **notifications inbox**: **alerts** (open problems that aggregate and resolve) plus **notifications** (point-in-time events like approvals, rejections, rotations).

---

## Core model

```
Account
  └─ Profile(s)
       ├─ provider: managed | byo_twilio | sip
       ├─ Numbers[]               // the profile's number pool
       └─ [managed only]
            ├─ Countries[]        // operating countries (home + added)
            └─ Capabilities       // channels enabled (+ requirement state)

PhoneNumber
  ├─ profileId                    // the profile this number belongs to
  └─ ...
```

- **Account** — the tenant. Holds one or more Profiles.
- **Profile** — the central entity. Combines a provider mode with a number pool. Managed profiles additionally carry a set of operating countries and a set of capabilities (including Business Info, the prerequisite for all others).
- **Number** — belongs to one Profile's pool. Its provider mode and compliance scope are derived from its Profile.

### Provider modes

Three modes, each a different connectivity stance:

- **Managed** — Harmony provisions numbers and runs the full regulatory pipeline. Numbers are bought, spam-scanned, capability-attached, and auto-rotated. This is the opinionated default.
- **BYO Twilio** — the customer brings their own Twilio account. Numbers are imported from the connected account; gating is bypassed.
- **SIP trunk** — the customer brings their own carrier/PBX via Twilio Elastic SIP Trunking. Numbers are declared, not discovered; voice-only; gating is bypassed.

The most important rule for BYO and SIP: **gating is bypassed** (`provider != managed` short-circuits it). These modes fail at runtime rather than config time — see [Part 4](#part-4-alerts--notifications).

### Managed profiles and identity

**Business Info** is the Profile's verified business identity — a Twilio Customer Profile for US/CA, or a country regulatory bundle for ROW. It is a capability in the catalog and the prerequisite for every other managed capability:

> **A regulated capability requires Business Info to be `approved`.**

A managed Profile is **not tied to a single country**. It carries:
- a **primary country** — the home registration that establishes Business Info, and
- a **set of operating countries** — every country whose contacts the Profile reaches.

Countries can be added retroactively; doing so expands the capability set and introduces that country's requirements.

---

## Part 1: Capabilities (what the user turns on)

### Capability catalog

| Capability | Countries | Twilio artifact |
| --- | --- | --- |
| **Business Info** | All | Customer Profile |
| **Verified Calling** | US, CA | STIR/SHAKEN |
| **Text Messaging** | US | A2P 10DLC |
| **Caller ID Name** | US, CA | CNAM |
| **Caller ID Passthrough** | — | Any Caller ID |
| **Sender ID Name** | ROW | Alphanumeric Sender ID |
| **Branded Calling** | US | Branded Calling |
| **Number Provisioning** | ROW | Country Bundle |

MVP scope: ROW = UK, AU (4 supported countries: US, CA, UK, AU).

The Countries column lists where the capability is required. A capability absent from all of a Profile's countries is not available for that profile.

**Business Info** is the foundation — the Profile's verified business identity. Every other managed capability depends on it being `approved`.

**Caller ID Passthrough** is provisioned through support only.

**Number Provisioning** is the right to buy numbers in a given country. For ROW it is gated on the country bundle being `approved`. US and CA require only that the Profile exists.

Receiving inbound calls is **not** a capability — it carries no registration. It is controlled by `blockIncoming` on the Profile; see [Incoming calls](#incoming-calls).

### Capabilities are also provider-aware

A provider mode constrains its capability set:

| Capability | Managed | BYO Twilio | SIP trunk |
| --- | --- | --- | --- |
| **Business Info** | ✓ (required) | N/A | N/A |
| **Verified Calling** | ✓ (STIR/SHAKEN) | ✓ (their account) | ✓ (termination) |
| **Text Messaging** | ✓ (A2P) | ✓ (their A2P) | ✗ voice-only |
| **Caller ID Name** | ✓ (CNAM) | their Trust Hub | their carrier |
| **Caller ID Passthrough** | support only | support only | support only |
| **Sender ID Name** | ✓ (ROW) | ✓ (their account) | ✗ |
| **Branded Calling** | ✓ (US) | ✓ (their account) | ✗ |
| **Number Provisioning** | ✓ | import only | ✗ numbers declared |

For **managed** profiles, capability state is derived from Harmony-tracked requirements (see [Part 2](#part-2-requirements-the-regulatory-layer-underneath)). For **BYO / SIP** profiles, capability state is detected or declared from the customer's own account. Capabilities a mode cannot support are permanently off.

### Requirement states

Each requirement behind a capability has the following lifecycle:

| State | Meaning |
| --- | --- |
| **draft** | created, not yet submitted |
| **waiting** | submitted; Profile not yet verified — auto-advances to `in_review` when identity clears |
| **in_review** | under carrier / regulatory review |
| **approved** | approved and active |
| **rejected** | rejected; requires edits before resubmission |
| **error** | invalid provider state; usually retryable |

A capability is available when its Profile is verified and all backing requirements are `approved`. The roll-up is Profile-scoped — see [Usability cascade](#usability-cascade).

---

## Part 2: Requirements (the regulatory layer underneath)

This layer applies to **managed** profiles. BYO Twilio and SIP trunks bypass it entirely.

### Business Info is the foundation

**Business Info** (Twilio: Customer Profile for US/CA; country regulatory bundle for ROW) is the
Profile's verified business identity. Every other managed capability depends on Business Info being
`approved`. Additional operating countries each add their own bundle on top.

There is exactly **one** cross-cutting dependency:

> **A regulated capability requires Business Info to be `approved`.**

### Requirement lifecycle

Each requirement is a submittable, reviewable record:

```
                       ┌──── (Business Info not yet approved) ────┐
                       ▼                                           │
   draft ──submit──▶ waiting ──Business Info approved──▶ in_review ──┬──▶ approved
     ▲                                                               │
     └───────────────────── re-edit ◀── rejected ◀───────────────────┘
```

Approved requirements can be **edited** (e.g. business address change); editing re-enters `in_review`.
If Business Info is later rejected, every capability on the Profile cascades to unavailable — see [Usability cascade](#usability-cascade).

### Requirement catalog (capability → requirements, by country)

| Capability | US / CA | UK / AU (ROW) |
| --- | --- | --- |
| **Business Info** | Customer Profile | Country regulatory bundle |
| **Verified Calling** | Business Info + STIR/SHAKEN | — |
| **Text Messaging** | Business Info + A2P 10DLC (Profile + Campaign) | — |
| **Caller ID Name** | Business Info + CNAM | — |
| **Caller ID Passthrough** | none (rides on Business Info) | none |
| **Sender ID Name** | — (disallowed) | Business Info + bundle + sender-ID registration |
| **Branded Calling** | Business Info + Branded Calling registration | — |
| **Number Provisioning** | — (no bundle required) | Business Info + country bundle |

Each of the Profile's countries contributes its own requirement mix. The bundle for a ROW country
is both its Business Info equivalent and its Number Provisioning right — a hard prerequisite for
buying any number there.

Rejections carry a `field` code (e.g. CNAM `30799` → `displayName`) so the fix flow can highlight
the exact field to correct.

---

## Part 3: Number management

### The model

```
Profile {
  id
  provider: "managed" | "byo_twilio" | "sip"
  numbers: PhoneNumber[]
  autoRotate: boolean        // managed only
  // managed only:
  countries: Country[]
  capabilities: Capability[]
}

PhoneNumber {
  e164
  country                    // one of the Profile's operating countries
  region
  type: "local" | "mobile"   // US/CA = local; ROW = mobile
  spamLabeled: boolean       // set by Caller ID Reputation scan
  status: "active" | "parked" | "released"
  profileId
  agentId
  twilioSid
  acquiredAt
}
```

If a `PhoneNumber` exists, it is by definition already provisioned — so its status is `active`,
`parked`, or `released`. In-flight acquisition (requested-but-not-yet-bought, waiting-on-verification,
retry) is **not** a number state; it lives in a separate **Provision** record (managed only).

```
Provision {
  id
  profileId
  spec: { count, regions? }                       // composition, captured at request time
  status: "pending" | "waiting_on_verification"
        | "partially_filled" | "fulfilled" | "failed"
  acquiredNumberIds: []
}
```

### Number pools

All of a Profile's numbers live in that Profile's pool. Provider mode and compliance scope are
derived from the Profile, not stored on individual numbers.

For **BYO Twilio**, a `ProviderConnection` entity holds the auth and `accountSid`. For **SIP**, it
holds the trunk config. These back the Profile; named provider-agnostically.

### Number types and pricing

Number type is determined entirely by country — it is not a per-number choice:

| Country | Type | MRC |
| --- | --- | --- |
| US | local | $1.50 |
| CA | local | $1.50 |
| UK | mobile | $2.50 |
| AU | mobile | $8.25 |

Billing is a fixed monthly cycle — a number acquired or released mid-cycle is charged for the full
month.

### Spam detection (Caller ID Reputation)

Spam detection is an add-on module (billed separately). It emulates outbound calls from each
number on a fixed schedule and screenshots the result on the receiving phone to detect carrier spam
labels. Detection is required for auto-rotation — profiles without the module cannot enable it.

### Auto-rotation (managed only)

`autoRotate` is a Profile-level setting. When a number is detected as spam-labeled:

1. Acquire a replacement with the **exact same `{country, region}`** as the flagged number.
2. Capabilities auto-attach to the replacement.
3. **Park** the flagged number — it is held for up to 7 days or until the end of its current
   billing cycle, whichever comes first. The profile is not charged for the replacement during
   the parking window.
4. Release the parked number at the end of the parking window.
5. Notify the admin of the swap and reason.

Auto-rotation never applies to BYO/SIP profiles — Harmony does not mutate the customer's account.

### Number release

When a managed number is released it follows the same parking model as auto-rotation: `status`
moves to `parked` immediately and the number is held for up to 7 days or until the end of its
billing cycle before being released on the carrier.

For BYO/SIP numbers, "release" means **unlink** — Harmony stops routing over the number; it is
never released on the customer's account.

### Agent assignment

Each number is assigned to one agent (`agentId`). The agent owns both outgoing calls placed from
that number and incoming calls received on it.

---

## Part 4: Alerts & notifications

Managed telephony fails at **config time** — the requirement gate catches problems before anything
ships. BYO and SIP **bypass that gate**, so their failures surface at **runtime** on the send path.
Both kinds of signal land in one **notifications inbox**, which holds two distinct concepts:

### Alerts (open problems)

Aggregated, resolvable problems. Each alert keys off **(profile × capability × error class)** and
carries:

- **severity** — `error | warning | info`
- **status** — `active | resolved` (alerts resolve where the problem actually lives)
- **profile** — the chip showing which profile (managed vs BYO/SIP) and its name
- **capability** and **error code** where applicable (e.g. Twilio `30034` A2P unregistered,
  `21210` caller-ID not verified, `21215` geo-permission, `30799` CNAM rejection)
- a **CTA** matched to the fix path — open the relevant section of the customer's Twilio console
  (BYO/SIP), fix the requirement in Harmony (managed), or replace a spam-labeled number.

### Notifications (point-in-time events)

Discrete lifecycle events, **read/unread**, chronological. Approvals, rejections, and number
rotations. Good news lives here too — an approval is a notification. Each carries an event kind, a
profile, a short detail, and a CTA verb matched to the event (See / Fix / View). Notifications are
delivered in-app and by email to `createdBy`.

### How they relate

A **rejection** fires both a notification *and* an alert. An **approval** fires a notification and
**clears the matching alert**. The bell badges the count of **open alerts + unread notifications**.

## Open / deferred

- **Per-number value assignment + A/B testing** for Caller ID Name / Sender ID Name — bolt on additively.
- **Multiple Profiles per account** — modeled; build the management surface only when a segment
  actually runs several.
- **Per-country availability derivation** — capability roll-ups currently key off the home country;
  fully evaluating each capability against each operating country's requirement set is the next step.
- **Contact-pool-driven provisioning** ("buy top states by my contact pool") — ties into CRM work.
- **Local-presence dialing** (shared number pool, pick by callee area code) — revisit deliberately.
- **Toll-free numbers** — a distinct compliance track (Toll-Free Verification, not A2P).
- **Capability expiration / renewal** — A2P/CNAM/bundles expire in reality; no renewal path yet.
- **Multi-provider connectivity beyond Twilio/SIP**, **port-in / Verified Caller IDs**,
  **released-number cooldown/reuse** — future.
- **ROW expansion beyond UK/AU** — additional country bundles.
- **Alert/notification depth** — the inbox is the surface; routing rules, digests, push, and
  per-profile escalation policies are a separate product track.
- **Audit log** — acquire/release, requirement status changes, and profile connect/disconnect should
  emit auditable events; wire the hooks as the state machines are built.
