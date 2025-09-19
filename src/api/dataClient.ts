const STORAGE_KEY = 'paltra-local-data'

type EntityKey =
  | 'dimensions'
  | 'liveLoads'
  | 'callIns'
  | 'btx'
  | 'truckloads'
  | 'changeovers'
  | 'lineCounts'
  | 'dockDoors'

interface BaseRecord {
  id: string
  created_date: string
  updated_date: string
  created_by: string
  [key: string]: unknown
}

interface UserRecord extends BaseRecord {
  email: string
  full_name?: string
  department?: string
  role?: string
  company?: string
  is_approved?: boolean
}

interface DataStore {
  currentUserId: string | null
  users: UserRecord[]
  dimensions: BaseRecord[]
  liveLoads: BaseRecord[]
  callIns: BaseRecord[]
  btx: BaseRecord[]
  truckloads: BaseRecord[]
  changeovers: BaseRecord[]
  lineCounts: BaseRecord[]
  dockDoors: BaseRecord[]
}

type EntityApi<T extends BaseRecord = BaseRecord> = {
  list: (orderBy?: string, limit?: number) => Promise<T[]>
  filter: (criteria: Partial<T>) => Promise<T[]>
  create: (payload: Partial<T>) => Promise<T>
  update: (id: string, updates: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<void>
}

interface AuthApi {
  me: () => Promise<UserRecord>
  list: (orderBy?: string, limit?: number) => Promise<UserRecord[]>
  update: (id: string, updates: Partial<UserRecord>) => Promise<UserRecord>
  delete: (id: string) => Promise<void>
  logout: () => Promise<void>
}

const nowIso = (): string => new Date().toISOString()

const createDoorRecords = (): BaseRecord[] => {
  const timestamp = nowIso()
  const doorNumbers = [
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '23',
    '25',
    '27',
    '28',
    '29',
    '30',
    '31',
    '32',
  ]

  return doorNumbers.map((door) => ({
    id: `dock_${door}`,
    door_number: door,
    status: 'Available',
    carrier: '',
    trailer_number: '',
    created_date: timestamp,
    updated_date: timestamp,
    created_by: 'system@paltra.local',
  }))
}

const defaultTimestamp = nowIso()

const userDefaults: Omit<UserRecord, 'id' | 'email'> = {
  full_name: '',
  department: '',
  role: 'user',
  company: 'Paltra',
  is_approved: false,
  created_date: defaultTimestamp,
  updated_date: defaultTimestamp,
  created_by: 'system@paltra.local',
}

const defaultStore: DataStore = {
  currentUserId: 'user-admin',
  users: [
    {
      id: 'user-admin',
      email: 'admin@paltra.local',
      full_name: 'Paltra Admin',
      department: 'Operations',
      role: 'admin',
      company: 'Paltra',
      is_approved: true,
      created_date: defaultTimestamp,
      updated_date: defaultTimestamp,
      created_by: 'system@paltra.local',
    },
    {
      id: 'user-operator',
      email: 'operator@paltra.local',
      full_name: 'Warehouse Operator',
      department: 'Logistics',
      role: 'user',
      company: 'Paltra',
      is_approved: false,
      created_date: defaultTimestamp,
      updated_date: defaultTimestamp,
      created_by: 'system@paltra.local',
    },
  ],
  dimensions: [],
  liveLoads: [],
  callIns: [],
  btx: [],
  truckloads: [],
  changeovers: [],
  lineCounts: [],
  dockDoors: createDoorRecords(),
}

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

let inMemoryStore: DataStore | null = null

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const hydrateStore = (incoming: Partial<DataStore> | null): DataStore => {
  const base = deepClone(defaultStore)

  if (!incoming) {
    return base
  }

  return {
    currentUserId: incoming.currentUserId ?? base.currentUserId,
    users: incoming.users
      ? incoming.users.map((user) => ({
          ...userDefaults,
          ...user,
          created_date: user.created_date ?? defaultTimestamp,
          updated_date: user.updated_date ?? user.created_date ?? defaultTimestamp,
          created_by: user.created_by ?? 'system@paltra.local',
        }))
      : base.users,
    dimensions: incoming.dimensions ?? base.dimensions,
    liveLoads: incoming.liveLoads ?? base.liveLoads,
    callIns: incoming.callIns ?? base.callIns,
    btx: incoming.btx ?? base.btx,
    truckloads: incoming.truckloads ?? base.truckloads,
    changeovers: incoming.changeovers ?? base.changeovers,
    lineCounts: incoming.lineCounts ?? base.lineCounts,
    dockDoors: incoming.dockDoors ?? base.dockDoors,
  }
}

const loadStore = (): DataStore => {
  if (inMemoryStore) {
    return inMemoryStore
  }

  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DataStore>
        inMemoryStore = hydrateStore(parsed)
        return inMemoryStore
      }
    } catch (error) {
      console.warn('Failed to parse local data store, falling back to defaults.', error)
    }
  }

  inMemoryStore = deepClone(defaultStore)
  return inMemoryStore
}

const persistStore = (store: DataStore): void => {
  inMemoryStore = store
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch (error) {
      console.warn('Failed to persist local data store.', error)
    }
  }
}

const getCurrentUser = (store: DataStore): UserRecord => {
  const fallback = store.users[0]
  if (!store.currentUserId) {
    return fallback
  }
  const found = store.users.find((user) => user.id === store.currentUserId)
  return found ?? fallback
}

const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const matchesCriteria = (record: BaseRecord, criteria: Partial<BaseRecord>): boolean => {
  return Object.entries(criteria).every(([key, value]) => {
    const recordValue = record[key]
    if (Array.isArray(value)) {
      return Array.isArray(recordValue) && value.every((val) => (recordValue as unknown[]).includes(val))
    }
    return recordValue === value
  })
}

const sortRecords = <T extends BaseRecord>(records: T[], orderBy?: string): T[] => {
  if (!orderBy) {
    return [...records]
  }

  const direction = orderBy.startsWith('-') ? -1 : 1
  const field = orderBy.startsWith('-') ? orderBy.slice(1) : orderBy

  const sorted = [...records].sort((a, b) => {
    const aValue = a[field]
    const bValue = b[field]

    if (aValue == null && bValue == null) return 0
    if (aValue == null) return -1 * direction
    if (bValue == null) return 1 * direction

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction
    }

    const dateA = Date.parse(String(aValue))
    const dateB = Date.parse(String(bValue))

    if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
      return (dateA - dateB) * direction
    }

    return String(aValue).localeCompare(String(bValue)) * direction
  })

  return sorted
}

const createEntityApi = (key: EntityKey): EntityApi => ({
  async list(orderBy?: string, limit?: number) {
    const store = loadStore()
    const records = store[key]
    const sorted = sortRecords(records as BaseRecord[], orderBy)
    const sliced = typeof limit === 'number' ? sorted.slice(0, limit) : sorted
    return deepClone(sliced)
  },

  async filter(criteria) {
    const store = loadStore()
    const records = store[key]
    const filtered = records.filter((record) => matchesCriteria(record, criteria))
    return deepClone(filtered)
  },

  async create(payload) {
    const store = loadStore()
    const timestamp = nowIso()
    const currentUser = getCurrentUser(store)

    const record: BaseRecord = {
      id: generateId(key.slice(0, 3)),
      created_date: timestamp,
      updated_date: timestamp,
      created_by: currentUser.email,
      ...payload,
    }

    store[key] = [record, ...store[key]]
    persistStore(store)
    return deepClone(record)
  },

  async update(id, updates) {
    const store = loadStore()
    const records = store[key]
    const index = records.findIndex((record) => record.id === id)

    if (index === -1) {
      throw new Error(`Unable to update ${key}: record not found`)
    }

    const timestamp = nowIso()

    const updated = {
      ...records[index],
      ...updates,
      updated_date: timestamp,
    }

    records[index] = updated
    persistStore(store)
    return deepClone(updated)
  },

  async delete(id) {
    const store = loadStore()
    const next = store[key].filter((record) => record.id !== id)
    store[key] = next
    persistStore(store)
  },
})

const createAuthApi = (): AuthApi => ({
  async me() {
    const store = loadStore()
    return deepClone(getCurrentUser(store))
  },

  async list(orderBy?: string, limit?: number) {
    const store = loadStore()
    const sorted = sortRecords(store.users, orderBy)
    const sliced = typeof limit === 'number' ? sorted.slice(0, limit) : sorted
    return deepClone(sliced)
  },

  async update(id, updates) {
    const store = loadStore()
    const index = store.users.findIndex((user) => user.id === id)

    if (index === -1) {
      throw new Error('Unable to update user: record not found')
    }

    const timestamp = nowIso()
    const updated: UserRecord = {
      ...store.users[index],
      ...updates,
      updated_date: timestamp,
    }

    store.users[index] = updated
    persistStore(store)
    return deepClone(updated)
  },

  async delete(id) {
    const store = loadStore()
    store.users = store.users.filter((user) => user.id !== id)

    if (store.currentUserId === id) {
      store.currentUserId = store.users[0]?.id ?? null
    }

    persistStore(store)
  },

  async logout() {
    const store = loadStore()
    store.currentUserId = null
    persistStore(store)
  },
})

export const dataClient: { entities: Record<string, EntityApi>; auth: AuthApi } = {
  entities: {
    Dimension: createEntityApi('dimensions'),
    LiveLoad: createEntityApi('liveLoads'),
    CallIn: createEntityApi('callIns'),
    BTX: createEntityApi('btx'),
    Truckload: createEntityApi('truckloads'),
    Changeover: createEntityApi('changeovers'),
    LineCount: createEntityApi('lineCounts'),
    DockDoor: createEntityApi('dockDoors'),
  },
  auth: createAuthApi(),
}
