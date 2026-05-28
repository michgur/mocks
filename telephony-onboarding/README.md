# Telephony Capabilities

This module models a customer's telephony stack — every carrier registration,
brand verification, and regulatory bundle — as a uniform list of **capabilities**.

## Why capabilities

Carrier compliance requirements vary by country, channel, and use case, and they
change over time. A one-time onboarding flow can't keep up. Instead, each
distinct piece of submittable, reviewable data is its own capability record:
created, validated, submitted, approved or rejected, re-edited, and assigned to
numbers — all through the same interface.

A capability is the **minimum abstraction** that lets us treat Twilio Customer
Profiles, A2P brand registrations, CNAM filings, country bundles, STIR/SHAKEN
attestations, and (future) other providers' equivalents as one thing.

## Legal entities

Capabilities don't float free — every capability belongs to a **legal entity**
(typically a registered business). An account can hold multiple legal entities
(parent + subsidiaries, holding co + operating co, etc.), each with its own
business profile and dependent capabilities. The entity switcher at the top of
the dashboard scopes everything below it.

## Lifecycle

```
                       ┌──── (dependency unmet) ────┐
                       ▼                            │
   draft ──submit──▶ waiting ──dep approved──▶ in review ──┬──▶ approved
     ▲                                                     │
     └────────────────── re-edit ◀── rejected ◀────────────┘
```

Statuses:

- **draft** — saved locally, not submitted
- **waiting** — submitted, but a dependency isn't approved yet; auto-promotes when the dependency clears
- **in review** — submitted to the carrier / Twilio; awaiting decision (usually 1–7 business days)
- **approved** — live, eligible to be assigned to numbers
- **rejected** — needs edit + resubmit; the rejection reason and the responsible field are surfaced inline
- **error** — invalid state from the provider that isn't a rejection (rare; usually retryable)
- **not configured** — capability exists in our catalog but the entity hasn't started one

## Dependencies

Some capabilities can't be submitted until another is approved. The dependency
graph is fixed per capability type:

```
business_profile ──┬──▶ stir_shaken
                   ├──▶ a2p_messaging
                   ├──▶ cnam
                   ├──▶ caller_id_passthrough
                   └──▶ branded_calls

country_bundle  (standalone, one per country)
```

A capability with an unapproved dependency lands in `waiting` on submit. When
the dependency flips to `approved`, all `waiting` dependants auto-advance to
`in review`. There's exactly one Business Profile per legal entity.

## Country scope

Each capability is either US-only, country-specific, or country-agnostic:

- **US-only**: STIR/SHAKEN, A2P 10DLC, CNAM, Branded Calls
- **Per-country bundle**: Number Provisioning is one capability per non-US/IL country (UK, AU, DE, FR…). Buying a number in a bundle country requires the bundle for that country to be approved first.
- **Country-agnostic**: Business Profile (it describes the entity, not a channel)

The Number Provisioning bundle is automatically attached when a number is
purchased in a country that requires it — the user never picks bundles by hand
post-setup.

## Number assignment

Once approved, a capability gets **assigned** to phone numbers. Eligibility is
defined per capability type:

| Capability                       | Eligible numbers              |
| -------------------------------- | ----------------------------- |
| Business Profile                 | all                           |
| STIR/SHAKEN, A2P, CNAM, Branded  | US numbers                    |
| Country Bundle (Number Prov.)    | numbers in that country       |

Each capability has an `auto_assign` flag (default on). When on, every eligible
number — including ones purchased before the capability was approved — is
assigned automatically. Flipping it off lets the user pick numbers manually;
"disabling" a capability means manually assigning it to zero numbers.

## Catalog

| Capability               | Twilio resource          | Countries | Depends on        | Notes                              |
| ------------------------ | ------------------------ | --------- | ----------------- | ---------------------------------- |
| Business Profile         | Customer Profile         | —         | —                 | one per legal entity               |
| Outbound Calling         | STIR/SHAKEN              | US        | Business Profile  | avoids spam labels / blocking      |
| Text Messaging           | A2P Brand + Campaign     | US        | Business Profile  | required to SMS US contacts        |
| Caller ID Name           | CNAM                     | US        | Business Profile  | brand name on outbound calls       |
| Number Provisioning      | Country Bundle (regulatory) | UK, AU, DE, FR, … | — | one per bundle country             |
| Caller ID Passthrough    | Any Caller ID            | —         | Business Profile  | support-only; user requests it     |
| Alphanumeric Sender ID   | Alphanumeric Sender ID   | DE, FR (EU) | —               | future                             |
| Branded Calls            | Branded Calls            | US        | Business Profile  | future                             |

## Data shape

```ts
Capability {
  id
  legalEntityId
  type                  // one of the catalog rows above
  countries             // [] for country-agnostic types
  status                // see lifecycle
  isApproved            // distinct from status: stays true even when user re-edits
  dependencies          // ids of other capabilities
  rejection?            // { message, field, code, explanation } if status === 'rejected'
  data                  // type-specific submission payload (business info, URLs, etc.)
  twilioResourceSids    // mapped Twilio resources once submitted
  autoAssign
  assignedNumberIds
  createdBy             // email; used for status notifications
  createdAt, updatedAt
}
```

Rejections include a `field` code (e.g. CNAM `30799` → `displayName`) so the
edit flow can highlight the exact field that needs fixing, not just show a
generic error.

## Notifications

Approval and rejection are the only states that fire user notifications:
in-app + email to `createdBy`. Each notification carries the capability type,
new status, status reason, a CTA verb matched to status (Fix / Review / See),
and a short explanation of what the rejection typically means.

## Mock API

For this prototype the entire capability system lives behind one typed client
at `src/api/client.ts`. Replace each function body with a real fetch call when
the backend is ready — the signatures and types are designed to map 1:1 onto
the endpoints described in the PRD's *Backend Requirements* section.
