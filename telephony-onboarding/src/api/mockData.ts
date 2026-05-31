import type {
  Agent,
  Company,
  ImportableNumber,
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
]

// Agents belong to a Company and own their own numbers.
export const seedAgents: Agent[] = [
  { id: 'agent_sales', name: 'Sales Agent', companyId: 'co_acme', autoRotate: true, blockIncoming: false },
  { id: 'agent_support', name: 'Support Agent', companyId: 'co_acme', autoRotate: false, blockIncoming: true },
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

export const seedConnections: ProviderConnection[] = []

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
