# Harmony telephony model

Design state of Harmony's telephony stack — the regulatory layer (compliance), the
operational layer (phone numbers), and the escape hatch (bring-your-own provider) —
as a handoff for fresh context.

_Last updated: May 2026._

## TL;DR

- The user thinks in **capabilities** — "I want to call my contacts," "I want to text my contacts." They never think about regulations. Capability is the top-level thing they turn on.
- Each capability resolves, underneath, to a set of **requirements** — the regulatory artifacts (business identity, A2P, STIR/SHAKEN, country bundles, CNAM) that must be approved for the capability to actually work. Requirements are bookkeeping; the user navigates by capability.
- One rule governs compliance: a regulated capability needs the **Company to be verified** (its business identity approved). Identity is the foundation everything rests on, not a capability itself.
- Requirements, identity, and capabilities all live on the **Company** (the legal entity). A Company has **exactly one identity**. If a customer wants separate identities (e.g. a separate legal entity, or a separate country's registration), they create **separate Companies**.
- Phone **numbers** belong to one **agent**. Capabilities auto-attach; the user does no per-number configuration.
- Agents have an **auto-rotate** flag. When a number gets spam-labeled (detected by calling it from multiple carriers and screenshotting the result), auto-rotate replaces it with a fresh one in the same geo. The screenshot evidence is viewable in the UI.
- **BYO Twilio** is an MVP escape hatch for customers who want to use their own account or have needs we don't support. It's deliberately minimal: connect + import + use, with all gating bypassed.

---

## Core model

```
Account                         // the Harmony customer / tenant
  └─ Company                    // the legal entity. MVP: exactly one per account
       ├─ Identity              // the verified business identity — exactly one
       ├─ Capabilities          // channels the user has enabled (+ requirement state)
       └─ Agents
            └─ Numbers
```

- **Account** — the tenant. Holds one Company in MVP (multiplicity is modeled but hidden; see [Open / deferred](#open--deferred)).
- **Company** — the legal entity that regulators recognize. Capabilities and identity are approved *for a Company*, because that's the unit a regulator approves. **One identity per Company.** User-facing, this surface is labelled **"Company Info."**
- **Agent** — belongs to one Company; inherits its brand identity and compliance scope.
- **Number** — belongs to one agent. No multi-agent sharing.

---

## Part 1: Capabilities (what the user turns on)

### Capability-first

The user reasons about *what they want to do*, not the regulations behind it. They think "I want
to text my contacts" — never "I want to register an A2P campaign." So **capability is the
top-level organizing principle.** A capability is a channel or feature the user switches on;
underneath, it fans out into the requirements the system tracks and deduplicates.

The Company's country is fixed by its identity, so the user never picks a country per-capability —
for a single-country customer (the MVP norm) the Company is effectively invisible.

### Capability catalog

**Core channels — what the user does:**

| Capability | What the user gets |
| --- | --- |
| **Calling** | Place outbound calls to contacts |
| **Texting** | Send SMS/MMS to contacts |

**Branding add-ons — how the user appears (optional, sit on top of a channel):**

| Capability | What the user gets | Notes |
| --- | --- | --- |
| **Branded Caller ID** | Business name/brand shown on outbound calls | CNAM today (US); Branded Calls future |
| **Alphanumeric Sender ID** | Brand name as the SMS sender instead of a number | EU and other supported countries; not allowed in US |

The catalog is **country-parameterized, not country-specific**. Each capability is one concept;
its requirements depend on the Company's country. A UK Company gets Calling, Texting, Alphanumeric
Sender ID, and (later) Branded Calls — comparable richness to a US Company, just a different
requirement mix underneath.

(Receiving inbound calls is **not** a capability — it carries no registration. It's a number-level
behavior, see [`blockIncoming`](#incoming-calls).)

### Two capability shapes

Capabilities come in two shapes, and they behave differently for both approval and assignment:

- **Singleton** — identity, Calling, Texting. One per Company. Binary: you can or you can't. No
  value to vary, so no copies. **Auto-attach** to all eligible numbers; the user makes no
  per-number choice.
- **Value-carrying** — Branded Caller ID (CNAM), Alphanumeric Sender ID. The thing that gets
  registered and approved *is the value* ("Acme Sales" vs "Acme Support" are two separate carrier
  filings). A Company can hold **multiple approved instances**, each with its own lifecycle.

**MVP scope for value-carrying capabilities:** model the instance shape (a value is its own
referenceable, separately-approved record — never an inlined string), but ship **single-value
only**. Per-agent value assignment and A/B testing bolt on later additively *because* the shape is
right; see [Open / deferred](#open--deferred).

### How availability is computed

A capability's availability is **derived** from its requirements' statuses:

> *Texting is available when the Company's identity is approved AND its messaging requirement
> (e.g. A2P) is approved.*

The user sees a per-capability roll-up — e.g. *"Texting: ✓  ·  Calling: ⏳ (STIR/SHAKEN in
review)."* This roll-up lives at the Company level (see [usability](#usability-cascade)); it is
never stored per number.

---

## Part 2: Requirements (the regulatory layer underneath)

### Identity is the foundation, not a capability

Everything regulated a Company does is approved against its **verified business identity** (Twilio
Customer Profile for a US Company; a regulatory bundle for a non-US one). Identity describes *who
you are*. It's shared across every capability, so it can't *be* a capability — it's the foundation
they all rest on.

In the UI this reads as a setup step ("verify your business / Company Info"), not as one item in
the list of capabilities you toggle.

### The foundation rule

There is exactly **one** cross-cutting dependency:

> **A regulated capability requires the Company to be verified.**

You can't switch on any capability until the Company's identity is approved — the same way you
can't use an app before signing up.

### Requirement lifecycle

Each requirement is a submittable, reviewable record with a uniform lifecycle:

```
                       ┌──── (Company not yet verified) ────┐
                       ▼                                     │
   draft ──submit──▶ waiting ──identity approved──▶ in review ──┬──▶ approved
     ▲                                                          │
     └────────────────── re-edit ◀── rejected ◀─────────────────┘
```

- **waiting** — submitted, but the Company isn't verified yet. Auto-advances to *in review* when
  identity clears.
- **error** — invalid provider state, rare, usually retryable.
- **not configured** — in the catalog but the customer hasn't started.

Approved requirements can be **edited** (e.g. business address change); editing re-enters review.
If the identity is later revoked/rejected, every capability on the Company cascades to unusable
(one deterministic hop — see [usability](#usability-cascade)).

### Requirement catalog (capability → requirements, by Company country)

| Capability | US Company | UK / EU Company |
| --- | --- | --- |
| **Verified Identity** (foundation) | Twilio Customer Profile | Regulatory bundle (also grants the number-provisioning right) |
| **Calling** | Identity + STIR/SHAKEN | Identity / bundle |
| **Texting** | Identity + A2P 10DLC (Brand + Campaign) | Identity / bundle (+ sender ID if alphanumeric) |
| **Branded Caller ID** | CNAM (now) → Branded Calls (future) | Future |
| **Alphanumeric Sender ID** | N/A (disallowed) | Identity + sender-ID registration |

**Country scope notes** (the Company's country drives this):
- **US Company:** STIR/SHAKEN, A2P 10DLC, CNAM, Branded Calls.
- **Non-US Company (per-country bundle):** UK, AU, DE, FR… The bundle is the Company's identity and
  also its provisioning right — a **hard prerequisite** for buying any number.
- The business identity describes the entity; the channel requirements describe what it may do.

Rejections carry a `field` code (e.g. CNAM `30799` → `displayName`) so the edit flow can highlight
the exact field to fix rather than show a generic error.

### Notifications

Approval and rejection fire notifications (in-app + email to `createdBy`). Each carries: requirement
type, new status, reason, a CTA verb matched to status (Fix / Review / See), and a short explanation.

---

## Part 3: Number management

### The model

```
Agent {
  ...                        // existing agent fields
  companyId                  // brand identity / compliance scope
  numbers: PhoneNumber[]
  autoRotate: boolean
  blockIncoming: boolean     // default false
}

PhoneNumber {
  e164
  country, region            // country = the Company's country
  health: number             // 0–100, with screenshot evidence (see auto-rotation)
  status: "active" | "released"
  source: "managed" | "byo"  // managed = Harmony-provisioned; byo = imported
  twilioSid
  acquiredAt
}
```

If a `PhoneNumber` exists, it is by definition already provisioned — so its status is just
`active | released`. In-flight acquisition (requested-but-not-yet-bought, waiting-on-verification,
retry) is **not** a number state; it lives in a separate **Provision** record.

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

A Provision lives from the moment the admin clicks "Add numbers" until the request is fulfilled (or
cancelled). This is where the "Waiting on verification" state lives — there's no persistent
provisioning skeleton on the agent itself; steady-state capacity is simply the agent's current
active numbers.

### Acquisition flow (managed)

1. Admin clicks **Add numbers** on the agent screen.
2. Specifies count + optional region(s) within the Company's country. This creates a **Provision**.
3. We scan candidates for spam; only buy healthy ones.
4. Capabilities auto-attach per the Company's stack.
5. **Company not yet verified** (e.g. a non-US Company whose bundle is still pending)? Not blocked.
   The Provision sits in `waiting_on_verification` and auto-resolves when the identity clears.
   Surfaced as "Waiting on verification" on the agent screen.

### Auto-rotation

Spam labeling is detected by a proprietary mechanism: we call each number from different carriers
and screenshot the result. **This evidence is surfaced in the UI** — an **(i) icon in the health
column** of the numbers list; hovering loads the screenshot so the admin can see *why* a number is
flagged.

If `autoRotate = true`:
1. Acquire a replacement in the **same `{country, region}`** as the dying number.
2. Run the spam scan, pick a healthy candidate.
3. Capabilities auto-attach to the new number.
4. Release the dying number.
5. Notify admin: *"Replaced +1 (415) 555-0123 with +1 (415) 555-0456 in Sarah's numbers.
   Reason: health 38% (carrier complaint)."*

If `autoRotate = false`: send a health alert with a **Replace now** CTA. Admin can replace, release,
or ignore.

If no replacement is available right now: release the dying number anyway (it's hurting reputation),
retry in the background via a Provision, and notify if retries fail past a threshold.

### Manual release (managed)

When the admin releases a managed number, the modal asks:
- **Release and replace** (default) — top up with an equivalent in the same geo, keep capacity stable.
- **Release and shrink** — agent has one fewer number.

### Incoming calls

Default: incoming calls on an agent's numbers route to that owning agent. The per-agent
`blockIncoming` toggle rejects the call (with a brief message) for outbound-only agents.

### Usability cascade

Usability lives at the **capability level (Company-scoped)** — never on individual numbers. If A2P
is rejected, *Texting* flips to unavailable for the whole Company, and that applies uniformly to
every number the Company's agents hold. Surfaced on the agent screen with a deep link to the
requirement's fix flow.

This is why there is no per-number usability field: a number's usability is derived from the
relevant capability's status for its Company.

---

## Part 4: BYO Twilio (escape hatch)

### What it is

An escape hatch — **never the primary path** — for customers who want to use their own Twilio
account, or who have requirements we don't support (a country, a carrier relationship, a special
compliance setup) at MVP or ever. It deflects long-tail demand so the managed product can stay
narrow and opinionated: "not natively, but you can BYO and handle it yourself."

### Scope: connect + import + use

That's the whole feature:
1. **Connect** the customer's Twilio account (prefer **Twilio Connect** authorization over handling
   raw API keys — the customer authorizes Harmony and can revoke).
2. **Import** their existing numbers (selection from the connected account; import only — no buying
   into their account at MVP).
3. **Use** them — agents call/text through them. This is the same machinery as managed; only the
   originating account differs.

### Gating is bypassed

The most important rule: **BYO numbers bypass Harmony's capability/requirement gating entirely**
(`source = "byo"` short-circuits it). The customers who need BYO are, by definition, often outside
our managed catalog — a "your Company isn't verified yet" gate would brick the escape hatch for
exactly the people it exists for. BYO numbers just work; the customer owns the consequences
(compliance, reputation, billing).

### BYO scope boundaries (build guidance)

To build BYO correctly, deliberately exclude:
- **Auto-rotation / auto-replace.** Health scanning may still run (it's external), but Harmony never
  mutates the customer's account automatically.
- **Release = unlink**, not release-on-their-account. We stop using the number; we never release a
  number the customer owns.
- **Managed compliance.** The onboarding/requirement pipeline is skipped. If something's wrong with
  a BYO number, the answer is "check your Twilio account."

### Model impact

- New entity **ProviderConnection** (`provider`, auth, `accountSid`) at the Company level. MVP:
  one connection, Twilio only. Named provider-agnostically, but not over-invested in speculative
  multi-provider abstraction — it's deliberately marginal.
- `PhoneNumber.source` (`managed | byo`) is the field behavior branches on.
- **One mode per Company** in MVP — a Company is either managed or BYO, not a mixed inventory.

---

## How it all fits together

1. **The user navigates by capability; requirements are bookkeeping.** "I want to text" → the
   system assembles and tracks the underlying requirements and shows a roll-up.
2. **Identity is the single foundation.** One rule: a regulated capability needs the Company
   verified. One identity per Company; separate identities = separate Companies.
3. **Capabilities auto-attach to numbers; the user does zero per-number config.** Singletons attach
   automatically; value-carrying capabilities are single-value at MVP.
4. **Requirement rejection cascades to capability usability** at the Company level, not per number.
5. **Number provisioning is gated on the Company being verified** for non-US Companies (the bundle
   is both identity and provisioning right); US numbers are buyable as soon as the Company exists.
   In-flight intent lives in a Provision, not on the number.
6. **Rotation is capability-aware** — replacements auto-inherit capabilities.
7. **BYO is the escape hatch** — gating bypassed, no auto-management, marginal by design.

---

## Open / deferred

- **Per-agent value assignment + A/B testing** for Branded Caller ID / Sender ID — the instance
  shape is modeled at MVP so these bolt on additively (per-agent default reference, then a managed
  experiment that splits values across an agent's number pool — preserving zero per-number config).
- **Multiple Companies per account** (holdco/opco, agencies, multi-country/multi-identity) — modeled
  but hidden at MVP, since multi-identity maps cleanly to multiple Companies. Build the Company
  switcher / management surface only when a segment actually runs several.
- **Contact-pool-driven provisioning** ("buy top states by my contact pool") — ties into CRM
  integration work.
- **Local-presence dialing** (a shared number pool, pick the number matching the callee's area code)
  — in tension with strict one-number-one-agent ownership; revisit deliberately.
- **Toll-free numbers** — a distinct compliance track (Toll-Free Verification, not A2P).
- **Capability expiration / renewal** — A2P/CNAM/bundles expire in reality; lifecycle has no
  renewal path yet.
- **External numbers beyond BYO** (port-in, Verified Caller IDs), **temporary disable / parking**,
  **released-number cooldown/reuse**, **Alphanumeric Sender ID & Branded Calls** as live capabilities
  — future.
- **Audit log** — acquire/release and requirement status changes should emit auditable events; wire
  the hooks as the state machines are built (important; cheap now, painful to backfill).
