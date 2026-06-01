import type {
  Agent,
  Alert,
  Company,
  ImportableNumber,
  Notification,
  PhoneNumber,
  Provision,
  ProviderConnection,
  Requirement,
} from '@/types'

export const seedCompanies: Company[] = [
  {
    id: 'co_acme',
    name: 'Acme Inc.',
    country: 'US',
    countries: ['US', 'UK'],
    mode: 'managed',
    createdAt: '2026-04-10T14:00:00Z',
  },
  // A second source: the customer's own Twilio account (BYO). Bypasses our
  // regulatory layer — its capabilities live in their Twilio console.
  {
    id: 'co_byo',
    name: 'Northwind Trading',
    country: 'US',
    countries: ['US'],
    mode: 'byo',
    createdAt: '2026-05-02T09:00:00Z',
  },
]

// Agents belong to a Company and own their own numbers.
export const seedAgents: Agent[] = [
  { id: 'agent_sales', name: 'Sales Agent', companyId: 'co_acme', autoRotate: true, blockIncoming: false },
  { id: 'agent_support', name: 'Support Agent', companyId: 'co_acme', autoRotate: false, blockIncoming: true },
  // BYO agent — auto-rotate is off by design (we never mutate the customer's account).
  { id: 'agent_byo', name: 'Northwind Agent', companyId: 'co_byo', autoRotate: false, blockIncoming: false },
]

// One requirement per regulatory artifact. Seed exercises a range of states:
// identity approved, calling (STIR/SHAKEN) approved, Caller ID Name (CNAM)
// rejected. Texting (A2P) is intentionally absent so it reads as "not set up".
export const seedRequirements: Requirement[] = [
  {
    id: 'req_identity',
    companyId: 'co_acme',
    type: 'identity',
    status: 'approved',
    isApproved: true,
    twilioResourceSids: ['BU0000000000000000000000000000001'],
    data: {
      business: {
        legalName: 'Acme Inc.',
        registrationType: 'EIN',
        registrationNumber: '12-3456789',
        addressLine1: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: 'US',
        companyType: 'LLC',
        businessType: 'For-profit',
        industry: 'Healthcare',
        regionsOfOperation: ['United States'],
        website: 'https://acme.example',
      },
      representative: {
        firstName: 'Jamie',
        lastName: 'Chen',
        email: 'jamie@acme.example',
        phone: '+14155551212',
        title: 'COO',
        position: 'Authorized Representative',
      },
    },
    createdBy: 'gur@harmony.ai',
    createdAt: '2026-04-10T14:00:00Z',
    updatedAt: '2026-04-14T09:21:00Z',
  },
  {
    id: 'req_stir',
    companyId: 'co_acme',
    type: 'stir_shaken',
    status: 'approved',
    isApproved: true,
    twilioResourceSids: ['ST0000000000000000000000000000001'],
    data: {},
    createdBy: 'gur@harmony.ai',
    createdAt: '2026-04-10T14:05:00Z',
    updatedAt: '2026-04-13T16:00:00Z',
  },
  {
    id: 'req_cnam',
    companyId: 'co_acme',
    type: 'cnam',
    status: 'rejected',
    isApproved: false,
    twilioResourceSids: ['CN0000000000000000000000000000001'],
    rejection: {
      message: 'The CNAM display name entered is unrelated to your registered business name.',
      field: 'displayName',
      code: '30799',
      explanation:
        'Carriers reject CNAM display names that don\'t closely match the registered legal business name. Try a shorter form of "Acme Inc." such as "Acme" or "Acme Health".',
    },
    data: { cnam: { displayName: 'AcmeRX Telehealth' } },
    createdBy: 'gur@harmony.ai',
    createdAt: '2026-04-11T10:00:00Z',
    updatedAt: '2026-04-14T11:05:00Z',
  },
]

export const seedNumbers: PhoneNumber[] = [
  {
    id: 'pn_us_1',
    agentId: 'agent_sales',
    number: '+1 (415) 555-0142',
    country: 'US',
    region: 'California',
    city: 'San Francisco, CA',
    health: 92,
    status: 'active',
    source: 'managed',
    twilioSid: 'PN0000000000000000000000000000001',
    callsLast30d: 1284,
    acquiredAt: '2026-04-15T10:00:00Z',
  },
  {
    id: 'pn_us_2',
    agentId: 'agent_sales',
    number: '+1 (415) 555-0188',
    country: 'US',
    region: 'California',
    city: 'San Francisco, CA',
    // Spam-labeled: low health with screenshot evidence behind the (i) icon.
    health: 38,
    spamScreenshotUrl: 'https://placehold.co/320x600/1f1f23/f87171?text=Spam+Likely%0A%0AT-Mobile+caller+ID',
    status: 'active',
    source: 'managed',
    twilioSid: 'PN0000000000000000000000000000002',
    callsLast30d: 642,
    acquiredAt: '2026-04-18T10:00:00Z',
  },
  {
    id: 'pn_us_3',
    agentId: 'agent_support',
    number: '+1 (212) 555-0173',
    country: 'US',
    region: 'New York',
    city: 'New York, NY',
    health: 81,
    status: 'active',
    source: 'managed',
    twilioSid: 'PN0000000000000000000000000000003',
    callsLast30d: 219,
    acquiredAt: '2026-04-20T10:00:00Z',
  },
  // Numbers imported from the BYO Twilio account (source: 'byo').
  {
    id: 'pn_byo_1',
    agentId: 'agent_byo',
    number: '+1 (628) 555-0301',
    country: 'US',
    region: 'California',
    city: 'San Francisco, CA',
    health: 88,
    status: 'active',
    source: 'byo',
    twilioSid: 'PN00000000000000000000000000000b1',
    callsLast30d: 410,
    acquiredAt: '2026-05-02T09:10:00Z',
  },
  {
    id: 'pn_byo_2',
    agentId: 'agent_byo',
    number: '+1 (646) 555-0302',
    country: 'US',
    region: 'New York',
    city: 'New York, NY',
    health: 90,
    status: 'active',
    source: 'byo',
    twilioSid: 'PN00000000000000000000000000000b2',
    callsLast30d: 133,
    acquiredAt: '2026-05-03T09:10:00Z',
  },
]

// An in-flight acquisition that's blocked on Company verification — surfaced as
// "Waiting on verification" on the agent screen.
export const seedProvisions: Provision[] = [
  {
    id: 'prov_1',
    agentId: 'agent_support',
    spec: { count: 2, region: 'New York' },
    status: 'pending',
    acquiredNumberIds: [],
    createdAt: '2026-04-21T09:00:00Z',
  },
]

// Stub alerts — a mix of BYO runtime failures and managed lifecycle events, to
// show the alert surface is platform-wide (not a BYO patch). Static for now.
export const seedAlerts: Alert[] = [
  {
    id: 'al_byo_a2p',
    severity: 'error',
    status: 'active',
    title: 'Text Messaging failing — A2P not registered',
    detail: '4,210 messages blocked in the last 24h',
    sourceName: 'Northwind Trading',
    sourceMode: 'byo',
    capability: 'Text Messaging',
    code: '30034',
    cta: {
      label: 'Open A2P 10DLC',
      kind: 'twilio',
      href: 'https://console.twilio.com/us1/develop/sms/regulatory-compliance/a2p-10dlc',
    },
    timeAgo: '12 min ago',
  },
  {
    id: 'al_byo_callerid',
    severity: 'error',
    status: 'active',
    title: 'Outbound calls rejected — caller ID not verified',
    detail: '318 calls failed in the last 24h',
    sourceName: 'Northwind Trading',
    sourceMode: 'byo',
    capability: 'Outbound Calling',
    code: '21210',
    cta: {
      label: 'Open Voice',
      kind: 'twilio',
      href: 'https://console.twilio.com/us1/develop/voice/manage',
    },
    timeAgo: '1 hr ago',
  },
  {
    id: 'al_spam',
    severity: 'warning',
    status: 'active',
    title: 'Number spam-labeled',
    detail: '+1 (415) 555-0188 flagged by T-Mobile · health 38%',
    sourceName: 'Acme Inc.',
    sourceMode: 'managed',
    capability: 'Outbound Calling',
    cta: { label: 'Replace now', kind: 'replace' },
    timeAgo: '3 hr ago',
  },
  {
    id: 'al_cnam',
    severity: 'warning',
    status: 'active',
    title: 'Caller ID Name rejected — CNAM',
    detail: "Display name doesn't match your registered business name",
    sourceName: 'Acme Inc.',
    sourceMode: 'managed',
    capability: 'Caller ID Name',
    code: '30799',
    cta: { label: 'Fix', kind: 'fix' },
    timeAgo: '1 day ago',
  },
  {
    id: 'al_resolved',
    severity: 'info',
    status: 'resolved',
    title: 'Messaging throughput restored',
    detail: 'Carrier filtering cleared — sending back to normal',
    sourceName: 'Northwind Trading',
    sourceMode: 'byo',
    capability: 'Text Messaging',
    timeAgo: '2 days ago',
    cta: { label: '', kind: 'twilio' },
  },
]

// Stub notifications — discrete lifecycle events, newest first. A capability
// approval (good news), a rejection (also surfaces as an alert), and a number
// rotation. Read/unread drives the bell's unread count.
export const seedNotifications: Notification[] = [
  {
    id: 'nt_stir_approved',
    kind: 'approved',
    title: 'Outbound Calling approved',
    detail: 'STIR/SHAKEN registration cleared review — calling is live.',
    sourceName: 'Acme Inc.',
    sourceMode: 'managed',
    read: false,
    cta: { label: 'See', to: '/capabilities' },
    timeAgo: '20 min ago',
  },
  {
    id: 'nt_cnam_rejected',
    kind: 'rejected',
    title: 'Caller ID Name rejected',
    detail: "Display name doesn't match your registered business name.",
    sourceName: 'Acme Inc.',
    sourceMode: 'managed',
    read: false,
    cta: { label: 'Fix', to: '/capabilities' },
    timeAgo: '1 day ago',
  },
  {
    id: 'nt_rotated',
    kind: 'rotated',
    title: 'Number rotated',
    detail: '+1 (415) 555-0188 was spam-labeled and replaced with +1 (415) 555-0207.',
    sourceName: 'Acme Inc.',
    sourceMode: 'managed',
    read: true,
    cta: { label: 'View', to: '/numbers' },
    timeAgo: '2 days ago',
  },
]

export const seedConnections: ProviderConnection[] = [
  {
    id: 'conn_byo',
    companyId: 'co_byo',
    provider: 'twilio',
    accountSid: 'AC00000000000000000000000000000by',
    connectedAt: '2026-05-02T09:05:00Z',
  },
]

// The pool of numbers we pretend to find in a freshly connected Twilio account.
// The import modal lists these (minus any already linked) for the user to pick.
export const mockImportableNumbers: ImportableNumber[] = [
  { number: '+1 (415) 555-0220', country: 'US', region: 'California' },
  { number: '+1 (415) 555-0231', country: 'US', region: 'California' },
  { number: '+1 (212) 555-0144', country: 'US', region: 'New York' },
  { number: '+1 (312) 555-0199', country: 'US', region: 'Illinois' },
  { number: '+1 (512) 555-0107', country: 'US', region: 'Texas' },
  { number: '+1 (206) 555-0162', country: 'US', region: 'Washington' },
  { number: '+44 20 7946 0321', country: 'UK' },
  { number: '+44 20 7946 0388', country: 'UK' },
]
