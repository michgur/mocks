# Harmony telephony model

Design state of Harmony's telephony stack — the regulatory layer (compliance), the
connectivity layer (where calls and texts originate), the operational layer (phone
numbers), and the alerting layer — as a handoff for fresh context.

_Last updated: June 2026._

## TL;DR

- The user thinks in **capabilities** — "I want to call my contacts," "I want to text my contacts." They never think about regulations. Capability is the top-level thing they turn on.
- Each capability resolves, underneath, to a set of **requirements** — the regulatory artifacts (business identity, A2P, STIR/SHAKEN, country bundles, CNAM) that must be approved for the capability to actually work. Requirements are bookkeeping; the user navigates by capability.
- Two **orthogonal axes** structure the stack:
  - **Legal entity** — the **Company**: who you are. Verified identity and compliance scope.
  - **Connectivity** — the **Source**: where numbers and traffic come from. Three modes — **managed**, **BYO Twilio**, **SIP trunk**.
- The user picks among connectivity options in one unified **Source** switcher. A source is either a managed Company or an external provider connection (BYO Twilio / SIP trunk).
- **Managed** is the opinionated path: Harmony provisions numbers and runs the full regulatory pipeline. **BYO Twilio** and **SIP trunk** are escape hatches — the customer brings their own connectivity and gating is bypassed.
- One rule governs managed compliance: a regulated capability needs the **Company verified** (its business identity approved). Identity is the foundation everything rests on, not a capability.
- A **Company operates in one or more countries**, each contributing its own regulatory mix. Capabilities are **country-parameterized**.
- Phone **numbers** belong to one **agent** and live in **pools** keyed by source. An agent can hold numbers from **multiple pools / sources** at once.
- **Capabilities are source-aware**: they describe both what the user turns on *and* what a source can support. A SIP trunk is voice-only, so Text Messaging and Number Provisioning are permanently unavailable on it.
- Agents have **auto-rotate** (managed numbers only): a spam-labeled number is replaced with a fresh one in the same geo. Screenshot evidence is viewable in the UI.
- Runtime delivery failures and lifecycle events surface in one **notifications inbox** (bell in the header): **alerts** (open problems that aggregate and resolve) plus **notifications** (point-in-time events like approvals, rejections, rotations).

---

## Core model

```
Account                                 // the Harmony customer / tenant
  └─ Company(ies)                        // legal entity: identity + compliance scope
       ├─ Identity                       // verified business identity (home country)
       ├─ Countries[]                    // operating countries (home + added)
       ├─ Capabilities                   // channels enabled (+ requirement state)
       └─ Sources (connectivity)         // one or more, switched in one picker:
            ├─ Managed                   // Harmony-provisioned numbers, full pipeline
            ├─ BYO Twilio                // ProviderConnection: imported numbers
            └─ SIP trunk                 // ProviderConnection: declared numbers, voice-only

Agent                                    // belongs to one Company
  └─ Numbers                             // pooled by source; an agent may span pools
```

- **Account** — the tenant. Holds one or more Companies (multiplicity modeled; the management surface ships only for accounts that run several — see [Open / deferred](#open--deferred)).
- **Company** — the legal entity that regulators recognize. Capabilities and requirements are approved *for a Company*, because that's the unit a regulator approves. It has a **home country** (primary business identity) and a set of **operating countries**. User-facing, this surface is labelled **"Company Info."** New legal entities are registered in account-level **Settings**, not from the source switcher.
- **Source** — a connectivity entry the user switches between. Resolves to one of three modes. A **managed** source is backed by a verified Company; **BYO Twilio** and **SIP trunk** sources are backed by a `ProviderConnection`. All three appear together in the single Source switcher.
- **Agent** — belongs to one Company; inherits its brand identity and compliance scope.
- **Number** — belongs to one agent, and to the pool of the source it came from. An agent can own numbers across several pools.

### The two axes (identity vs connectivity)

These are independent concerns deliberately surfaced through one picker:

- **Identity / legal entity (Company)** answers *who is placing this call* — the verified business, its compliance scope, the countries it operates in.
- **Connectivity (Source)** answers *what pipe the call travels over* — Harmony-managed, the customer's Twilio account, or the customer's SIP trunk.

The user never reasons about this split explicitly: they open the Source switcher and choose where their numbers come from. Registering a *new legal entity* and connecting a *new provider* are different actions, but both produce a new entry in the same switcher.

### Multi-country Company

A Company is **not tied to a single country**. It carries:

- a **primary country** — the home registration that establishes the business identity (a US Customer Profile, or a non-US regulatory bundle), and
- a **set of operating countries** — every country whose contacts the Company reaches.

Countries can be **added retroactively** from Company Info; doing so expands the capability set and introduces that country's requirements. Multi-country lives **inside** one Company. Separate *legal entities* still map to separate Companies.

### Navigation

- **Settings › Telephony** — the connectivity + regulatory setup surface: the Source switcher, Company Info (identity), and the capability list. Breadcrumbed as `Settings / Telephony`.
- **Agents** — top-level nav → agent detail → **Phone numbers** tab, where number pools are managed.
- **Notifications** — a bell in the header opens the unified alerts + notifications inbox; the bell badges the count of open alerts plus unread notifications.

---

## Part 1: Capabilities (what the user turns on)

### Capability-first

The user reasons about *what they want to do*, not the regulations behind it. They think "I want
to text my contacts" — never "I want to register an A2P campaign." So **capability is the
top-level organizing principle.** A capability is a channel or feature the user switches on;
underneath, it fans out into the requirements the system tracks and deduplicates.

### Capability catalog

**Core channels — what the user does:**

| Capability | What the user gets |
| --- | --- |
| **Outbound Calling** | Place outbound calls to contacts |
| **Text Messaging** | Send SMS/MMS to contacts |

**Caller-ID & branding add-ons — how the user appears (optional, sit on top of a channel):**

| Capability | What the user gets | Notes |
| --- | --- | --- |
| **Caller ID Name** | Business name/brand shown on outbound calls | CNAM today (US); Branded Calls future |
| **Caller ID Passthrough** | Display the agent's own verified numbers as the caller ID | No carrier registration — rides on identity |
| **Alphanumeric Sender ID** | Brand name as the SMS sender instead of a number | EU and other supported countries; not allowed in US; future |

The catalog is **country-parameterized, not country-specific**. Each capability is one concept; its
requirements depend on country. The Capabilities surface shows the **union across the Company's
countries**, and each capability declares the countries it's **required for** (e.g. Caller ID Name
is required for 🇺🇸; provisioning is required for bundle countries like 🇬🇧). A capability that isn't
required in any of the Company's countries simply doesn't appear.

**Number provisioning** is surfaced in onboarding as an always-on capability row — the right to
acquire numbers. For non-US bundle countries it's *required for* that country (the bundle is the
provisioning right); for the US it needs nothing beyond the Company existing, so the row is hidden
when no bundle country is in play.

(Receiving inbound calls is **not** a capability — it carries no registration. It's a number-level
behavior, see [`blockIncoming`](#incoming-calls).)

### Capabilities are also source-aware

The capability model does double duty: besides describing what the user enables, it describes
**what a given source can support**. A source's mode constrains its capability set:

| Capability | Managed | BYO Twilio | SIP trunk |
| --- | --- | --- | --- |
| **Outbound Calling** | ✓ (regulatory pipeline) | ✓ (their account) | ✓ (termination) |
| **Text Messaging** | ✓ (A2P) | ✓ (their A2P) | ✗ voice-only |
| **Caller ID Name** | ✓ (CNAM) | their Trust Hub | their carrier |
| **Caller ID Passthrough** | ✓ | ✓ | ✓ |
| **Number Provisioning** | ✓ | import only | ✗ numbers declared |

For **managed** sources, capability state is *derived from Harmony-tracked requirements* (the
gating below). For **BYO / SIP** sources, capability state is **detected or declared**, not
verified by Harmony: the capability card shows whether the relevant thing is configured in the
customer's account and links out to the provider console rather than carrying a Set up / Verify
flow. Capabilities a mode cannot support (e.g. Text Messaging on a SIP trunk) are permanently off.

### Two capability shapes

- **Singleton** — identity, Outbound Calling, Text Messaging, Caller ID Passthrough. One per Company.
  Binary: you can or you can't. **Auto-attach** to all eligible numbers; the user makes no per-number choice.
- **Value-carrying** — Caller ID Name (CNAM), Alphanumeric Sender ID. The thing registered and approved
  *is the value* ("Acme Sales" vs "Acme Support" are two separate carrier filings). A Company can hold
  **multiple approved instances**, each with its own lifecycle.

**MVP scope for value-carrying capabilities:** model the instance shape (a value is its own
referenceable, separately-approved record — never an inlined string), but ship **single-value
only**. Per-agent value assignment and A/B testing bolt on later additively; see
[Open / deferred](#open--deferred).

### How availability is computed (managed)

A managed capability's availability is **derived** from its requirements' statuses, rolled up into
one of four states the user sees:

| State | Meaning | Label |
| --- | --- | --- |
| **not_started** | no requirement created yet (or nothing the capability needs has begun) | "Not set up" |
| **pending** | a requirement is draft / waiting / in review | "In progress" |
| **action_needed** | a requirement was rejected or errored | "Action needed" |
| **available** | identity approved AND every backing requirement approved | "Available" |

The roll-up lives at the Company level (see [usability](#usability-cascade)); it is never stored per
number. The **Capabilities page is a discovery surface**: it lists *every* capability available
across the Company's countries — including ones the user hasn't started and "coming soon" ones — so
the page doubles as a catalog.

---

## Part 2: Requirements (the regulatory layer underneath)

This layer applies to **managed** sources. BYO Twilio and SIP trunks bypass it entirely (see
[Part 4](#part-4-connectivity--sources)).

### Identity is the foundation, not a capability

Everything regulated a Company does is approved against its **verified business identity** (Twilio
Customer Profile for a US home Company; a regulatory bundle for a non-US one). Identity describes
*who you are*. It's shared across every capability, so it can't *be* a capability — it's the
foundation they all rest on. Additional operating countries each add their own regulatory bundle on
top of the home identity.

In the UI this reads as a setup step ("verify your business / Company Info"), not as one item in
the list of capabilities you toggle.

### The foundation rule

There is exactly **one** cross-cutting dependency:

> **A regulated capability requires the Company to be verified.**

You can't switch on any managed capability until the Company's identity is approved.

### Requirement lifecycle

Each requirement is a submittable, reviewable record with a uniform lifecycle:

```
                       ┌──── (Company not yet verified) ────┐
                       ▼                                     │
   draft ──submit──▶ waiting ──identity approved──▶ in review ──┬──▶ approved
     ▲                                                          │
     └────────────────── re-edit ◀── rejected ◀─────────────────┘
```

- **waiting** — submitted, but the Company isn't verified yet. Auto-advances to *in review* when identity clears.
- **error** — invalid provider state, rare, usually retryable.
- **not_started** — in the catalog but the customer hasn't started.

Approved requirements can be **edited** (e.g. business address change); editing re-enters review.
If the identity is later revoked/rejected, every capability on the Company cascades to unusable
(one deterministic hop — see [usability](#usability-cascade)).

### Requirement catalog (capability → requirements, by country)

| Capability | US country | UK / EU country |
| --- | --- | --- |
| **Verified Identity** (foundation) | Twilio Customer Profile | Regulatory bundle (also grants the number-provisioning right) |
| **Outbound Calling** | Identity + STIR/SHAKEN | Identity / bundle |
| **Text Messaging** | Identity + A2P 10DLC (Brand + Campaign) | Identity / bundle (+ sender ID if alphanumeric) |
| **Caller ID Name** | CNAM (now) → Branded Calls (future) | Future |
| **Caller ID Passthrough** | none (rides on identity) | none (rides on identity) |
| **Alphanumeric Sender ID** | N/A (disallowed) | Identity + sender-ID registration |

**Country scope notes** (each of the Company's countries contributes its own mix):
- **US:** STIR/SHAKEN, A2P 10DLC, CNAM, Branded Calls.
- **Non-US (per-country bundle):** UK, AU, DE, FR… The bundle is that country's identity/operating
  right and also its provisioning right — a **hard prerequisite** for buying any number there.
- The business identity describes the entity; the channel requirements describe what it may do.

Rejections carry a `field` code (e.g. CNAM `30799` → `displayName`) so the edit flow can highlight
the exact field to fix rather than show a generic error.

---

## Part 3: Number management

### The model

```
Agent {
  ...                        // existing agent fields
  companyId                  // brand identity / compliance scope
  numbers: PhoneNumber[]     // may span several source pools
  autoRotate: boolean        // managed numbers only
  blockIncoming: boolean     // default false
}

PhoneNumber {
  e164
  country, region            // country = one of the Company's operating countries
  health: number             // 0–100, with screenshot evidence (see auto-rotation)
  status: "active" | "released"
  source: "managed" | "byo"  // managed = Harmony-provisioned; byo = imported/declared
  twilioSid
  acquiredAt
}
```

If a `PhoneNumber` exists, it is by definition already provisioned — so its status is just
`active | released`. In-flight acquisition (requested-but-not-yet-bought, waiting-on-verification,
retry) is **not** a number state; it lives in a separate **Provision** record (managed only).

```
Provision {
  id
  agentId
  spec: { count, regions? }                       // composition, captured at request time
  status: "pending" | "waiting_on_verification"
        | "partially_filled" | "fulfilled" | "failed"
  acquiredNumberIds: []
}
```

### Pools and multi-source agents

A number belongs to the **pool** of the source it came from — the managed pool, a BYO Twilio pool,
or a SIP-trunk pool. An **agent can own numbers from multiple pools simultaneously**: e.g. some
Harmony-managed numbers plus numbers declared over a SIP trunk. The numbers list groups by source.
Behavior branches on `source`: managed numbers run the full pipeline and auto-rotation; BYO/SIP
numbers bypass gating and are never auto-mutated.

### The agent screen

Numbers are managed inside an **agent detail view**, reached from the top-level **Agents** nav. The
detail view has tabs (Overview · **Phone numbers** · Prompt · Voice · Actions · Analytics);
everything below is the Phone numbers tab. The Source switcher lives **within** that tab, since
it's only relevant to numbers. When a managed Company isn't verified yet, the tab nests the
**"Get a phone number"** zero state (verify-your-business CTA) rather than replacing the whole agent
screen.

**Health is binary in the UI:** a number reads as **Good** or **Spam labeled** (untested counts as
Good). The underlying 0–100 score still drives rotation; the column just collapses it to two states
plus the (i) evidence affordance.

### Acquisition flow (managed)

1. Admin clicks **Add numbers** on the agent screen.
2. Specifies count + optional region(s) within one of the Company's countries. This creates a **Provision**.
3. We scan candidates for spam; only buy healthy ones.
4. Capabilities auto-attach per the Company's stack.
5. **Country not yet verified** (e.g. a bundle still pending)? Not blocked. The Provision sits in
   `waiting_on_verification` and auto-resolves when the identity/bundle clears.

### Auto-rotation (managed only)

Spam labeling is detected by a proprietary mechanism: we call each number from different carriers
and screenshot the result. **This evidence is surfaced in the UI** — an **(i) icon in the health
column**; hovering loads the screenshot so the admin can see *why* a number is flagged.

If `autoRotate = true`:
1. Acquire a replacement in the **same `{country, region}`** as the dying number.
2. Run the spam scan, pick a healthy candidate.
3. Capabilities auto-attach to the new number.
4. Release the dying number.
5. Notify admin of the swap and reason.

If `autoRotate = false`: send a health alert with a **Replace now** CTA. Admin can replace, release,
or ignore. If no replacement is available right now: release the dying number anyway, retry in the
background via a Provision, and notify if retries fail past a threshold.

Auto-rotation never applies to BYO/SIP numbers — Harmony does not mutate the customer's account.

### Manual release (managed)

When the admin releases a managed number, the modal asks:
- **Release and replace** (default) — top up with an equivalent in the same geo, keep capacity stable.
- **Release and shrink** — agent has one fewer number.

For BYO/SIP numbers, "release" means **unlink** — Harmony stops using the number; it is never
released on the customer's account.

### Incoming calls

Default: incoming calls on an agent's numbers route to that owning agent. The per-agent
`blockIncoming` toggle rejects the call (with a brief message) for outbound-only agents.

### Usability cascade

Usability lives at the **capability level (Company-scoped)** for managed sources — never on
individual numbers. If A2P is rejected, *Text Messaging* flips to unavailable for the whole Company,
applying uniformly to every managed number its agents hold. Surfaced on the agent screen with a deep
link to the requirement's fix flow. (BYO/SIP usability is governed by the customer's own account,
not this cascade — failures surface as runtime alerts instead; see [Part 5](#part-5-alerts--notifications).)

---

## Part 4: Connectivity & sources

Connectivity has three modes, all reached through the one **Source** switcher.

### Managed (the primary path)

Harmony provisions numbers and runs the full regulatory pipeline ([Part 2](#part-2-requirements-the-regulatory-layer-underneath)).
Numbers are bought, spam-scanned, capability-attached, and auto-rotated by Harmony. This is the
opinionated default; the escape hatches exist so it can stay narrow.

### BYO Twilio (escape hatch)

For customers who want to use their own Twilio account, or have needs the managed catalog doesn't
cover. Scope is **connect + import + use**:

1. **Connect** the customer's Twilio account (prefer **Twilio Connect** authorization over raw API
   keys — the customer authorizes Harmony and can revoke).
2. **Import** existing numbers — selection from the connected account (import only; no buying into
   their account at MVP). The account's number inventory is **discoverable**, so Harmony lists it.
3. **Use** them — agents call/text through them, the same machinery as managed; only the originating
   account differs.

### SIP trunk (escape hatch)

For customers who bring their own carrier/PBX, connected via Twilio Elastic SIP Trunking (BYOC). It
is the next rung of the same connectivity axis as BYO Twilio — connectivity the customer owns, not a
new product pillar.

- **Bidirectional, outbound-first:** **termination** (Harmony → customer trunk → PSTN, outbound) and
  **origination** (inbound → trunk → Harmony). A single **SIP wizard** configures both directions.
- **Numbers are declared, not discovered.** A trunk exposes no number inventory to enumerate, so the
  customer **declares** which numbers route over it rather than picking from a discovered list.
- **Voice-only.** No SMS — **Text Messaging** is permanently unavailable, and **Number Provisioning**
  is off (the customer brings numbers).
- Carries a **channel / concurrency ceiling** (max simultaneous calls).
- **STIR/SHAKEN attestation** depends on the customer's carrier; Harmony does not sign on their behalf.
- Enterprise-oriented at MVP.

*Why bring your own numbers for outbound at all (vs. disposable managed numbers)?* Customers with
established, branded, or carrier-relationship numbers — and the CNAM/reputation already built on
them — want to keep using known numbers. They manage burn themselves (rotation, warming, spreading
volume, reputation monitoring) on their own infrastructure.

### Gating is bypassed (BYO + SIP)

The most important rule for both escape hatches: **BYO/SIP numbers bypass Harmony's
capability/requirement gating** (`source = "byo"` short-circuits it). The customers who need these
are, by definition, often outside the managed catalog — a "your Company isn't verified yet" gate
would brick the escape hatch for exactly the people it exists for. The numbers just work; the
customer owns the consequences (compliance, reputation, billing).

Because gating is bypassed, these modes **fail at runtime** rather than config time — see
[Part 5](#part-5-alerts--notifications).

### Scope boundaries (BYO + SIP)

- **No auto-rotation / auto-replace.** Health scanning may still run (it's external), but Harmony
  never mutates the customer's account/trunk automatically.
- **Release = unlink**, not release-on-their-account.
- **No managed compliance.** The requirement pipeline is skipped; capability state is detected
  (BYO) or declared (SIP) and links out to the provider console.

### Model impact

- Entity **ProviderConnection** (`provider`, auth, `accountSid` / trunk config) backs BYO and SIP
  sources. Named provider-agnostically; not over-invested in speculative multi-provider abstraction.
- `PhoneNumber.source` (`managed | byo`) is the field behavior branches on.
- A Company can carry **multiple sources at once** (a managed pool plus BYO and/or SIP), and agents
  draw numbers across pools. (Sources are not mutually exclusive per Company.)

---

## Part 5: Alerts & notifications

Managed telephony fails at **config time** — the requirement gate catches problems before anything
ships. BYO and SIP **bypass that gate**, so their failures surface at **runtime** on the send path.
Outbound calls and SMS are the most vulnerable. Both kinds of signal land in one **notifications
inbox** (the bell in the header), which holds two distinct concepts:

### Alerts (open problems)

Aggregated, resolvable problems. Each alert keys off **(source × capability × error class)** and
carries:

- **severity** — `error | warning | info`
- **status** — `active | resolved` (alerts resolve where the problem actually lives)
- **source** — the chip showing which source (managed vs BYO/SIP) and its name
- **capability** and **error code** where applicable (e.g. Twilio `30034` A2P unregistered,
  `21210` caller-ID not verified, `21215` geo-permission, `30799` CNAM rejection)
- a **CTA** matched to the fix path — open the relevant section of the customer's Twilio console
  (BYO/SIP), fix the requirement in Harmony (managed), or replace a spam-labeled number.

### Notifications (point-in-time events)

Discrete lifecycle events, **read/unread**, chronological. Approvals, rejections, and number
rotations. Good news lives here too — an approval is a notification. Each carries an event kind, a
source, a short detail, and a CTA verb matched to the event (See / Fix / View). Notifications are
delivered in-app and by email to `createdBy`.

### How they relate

A **rejection** fires both a notification *and* an alert. An **approval** fires a notification and
**clears the matching alert**. The bell badges the count of **open alerts + unread notifications**.

---

## Part 6: Onboarding wizards

### Managed (capability-first)

The wizard leads with geography, not paperwork:

1. **"Where are your contacts located?"** — a **multi-select** of countries. Drives the whole
   requirement mix; asked first.
2. **Capabilities** — a section listing what's turned on. Number provisioning and Outbound Calling
   are **always on** (non-interactive); the rest default on and are toggleable. Each row shows
   **"Required for: [flags]"**; rows required in no chosen country are hidden.
3. **Identity** — business information + authorized representative (the foundation).
4. **Per-capability detail** — e.g. Text Messaging (privacy/ToS URLs), Caller ID Name (display name),
   shown only when the relevant capability/country is in scope.
5. **Review & submit** — entered identity + per-capability details, then "what happens next."

Adding a country later (from Company Info) re-runs the same requirement assembly additively.

### SIP trunk

A single wizard configures both **origination** (inbound) and **termination** (outbound), captures
the trunk's channel ceiling, and collects the **declared** numbers that route over the trunk. No
regulatory pipeline runs; the trunk's capability set is fixed to voice (no Text Messaging, no Number
Provisioning).

### BYO Twilio

Connect (authorize) → import numbers (selection from the discovered account inventory) → use. No
regulatory pipeline; capability state is detected from the connected account.

---

## How it all fits together

1. **The user navigates by capability; requirements are bookkeeping.** "I want to text" → the system
   assembles and tracks the underlying requirements and shows a roll-up.
2. **Identity and connectivity are orthogonal.** The Company answers *who you are*; the Source
   answers *what pipe you use*. Both are switched through one picker.
3. **Identity is the single foundation** for managed compliance. One rule: a regulated capability
   needs the Company verified.
4. **A Company spans multiple countries and multiple sources.** Capabilities union across countries;
   each capability declares the countries it's required for; a Company can hold managed + BYO + SIP
   pools at once.
5. **Capabilities are source-aware** — they describe what the user enables *and* what a source
   supports (SIP is voice-only).
6. **Numbers pool by source; agents can span pools.** Capabilities auto-attach to managed numbers;
   the user does zero per-number config.
7. **Requirement rejection cascades to capability usability** at the Company level (managed); BYO/SIP
   failures surface as runtime alerts instead.
8. **Provisioning is gated on the country being verified** for non-US bundle countries; US numbers
   are buyable as soon as the Company exists. In-flight intent lives in a Provision.
9. **Rotation is capability-aware** and managed-only — replacements auto-inherit capabilities.
10. **Escape hatches bypass gating** — BYO Twilio and SIP trunks just work; the customer owns the
    consequences, and runtime problems surface in the notifications inbox.

---

## Open / deferred

- **Per-agent value assignment + A/B testing** for Caller ID Name / Sender ID — the instance shape
  is modeled at MVP so these bolt on additively.
- **Multiple Companies per account** (holdco/opco, agencies, separate legal entities) — modeled;
  build the management surface only when a segment actually runs several.
- **Per-country availability derivation** — capability roll-ups currently key off the home country;
  fully evaluating each capability against each operating country's requirement set is the next step.
- **Contact-pool-driven provisioning** ("buy top states by my contact pool") — ties into CRM work.
- **Local-presence dialing** (shared number pool, pick by callee area code) — in tension with strict
  one-number-one-agent ownership; revisit deliberately.
- **Toll-free numbers** — a distinct compliance track (Toll-Free Verification, not A2P).
- **Capability expiration / renewal** — A2P/CNAM/bundles expire in reality; no renewal path yet.
- **Multi-provider connectivity beyond Twilio/SIP**, **port-in / Verified Caller IDs**, **temporary
  disable / parking**, **released-number cooldown/reuse**, **Alphanumeric Sender ID & Branded Calls**
  as live capabilities — future.
- **Alert/notification depth** — the inbox is the surface; routing rules, digests, push, and
  per-source escalation policies are a separate product track.
- **Audit log** — acquire/release, requirement status changes, and source connect/disconnect should
  emit auditable events; wire the hooks as the state machines are built.
