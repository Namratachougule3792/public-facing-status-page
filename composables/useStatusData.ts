import { ref, computed, onMounted, onUnmounted } from 'vue'

export const SERVICE_DEFINITIONS = [
  { id: 'kiinara-identity',  name: 'Kiinara Identity',   description: 'Authentication and user identity', category: 'infrastructure' },
  { id: 'kiinara-core',      name: 'Kiinara Core',       description: 'Management Software',              category: 'application' },
  { id: 'kiinara-accounts',  name: 'Kiinara Accounts',   description: 'Accounts management',              category: 'application' },
  { id: 'pulse-email',       name: 'Pulse — Email',      description: 'Email delivery service',           category: 'communication' },
  { id: 'pulse-whatsapp',    name: 'Pulse — WhatsApp',   description: 'WhatsApp messaging service',       category: 'communication' }
]

<<<<<<< HEAD
const categoryLabels = {
  infrastructure: 'Core Infrastructure',
  application: 'Application Services',
  communication: 'Communication',
  platform: 'Platform'
}

const categoryOrder = ['infrastructure', 'application', 'communication', 'platform']

export function useStatusData() {
  const config = useRuntimeConfig()

  const serviceStates = ref({})
  const recentChecks = ref([])
  const loading = ref(true)
  const lastChecked = ref(new Date().toISOString())
  let supabase = null
  let pollInterval = null

  // Build services array from definitions + current states + history
  const services = computed(() =>
    SERVICE_DEFINITIONS.map(def => {
      const currentStatus = serviceStates.value[def.id] || 'operational'
      const history = buildHistory(def.id, recentChecks.value)
      const goodSlots = history.filter(h => h === 'operational').length
      const uptime = history.length > 0 ? +((goodSlots / history.length) * 100).toFixed(2) : 100

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        status: currentStatus,
        uptime,
        responseTime: 0,
        history
      }
    })
  )

  const overall = computed(() => {
    const statuses = Object.values(serviceStates.value)
    if (statuses.some(s => s === 'outage')) return 'outage'
    if (statuses.some(s => s === 'degraded')) return 'degraded'
    return 'operational'
  })

  const incidents = computed(() => buildIncidents(recentChecks.value))

=======
const CATEGORY_MAP: Record<string, string> = {
  'kiinara-identity': 'infrastructure',
  'kiinara-core':     'application',
  'kiinara-accounts': 'application',
  'pulse-email':      'communication',
  'pulse-whatsapp':   'communication'
}

const NAME_MAP: Record<string, string> = {
  'kiinara-identity': 'Kiinara Identity',
  'kiinara-core':     'Kiinara Core',
  'kiinara-accounts': 'Kiinara Accounts',
  'pulse-email':      'Pulse — Email',
  'pulse-whatsapp':   'Pulse — WhatsApp'
}

const DESC_MAP: Record<string, string> = {
  'kiinara-identity': 'Authentication & user identity',
  'kiinara-core':     'Management Software',
  'kiinara-accounts': 'Accounts management',
  'pulse-email':      'Email delivery service',
  'pulse-whatsapp':   'WhatsApp messaging service'
}

export function useStatusData() {
  // ── create supabase client ──────────────────────────────────────────────
  const config      = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseKey = config.public.supabaseKey as string

  if (!supabaseUrl || !supabaseKey) {
    console.error('[useStatusData] Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ── state ───────────────────────────────────────────────────────────────
  const services    = ref<any[]>([])
  const incidents   = ref<any[]>([])
  const overall     = ref<string>('checking')
  const loading     = ref<boolean>(true)
  const lastChecked = ref<string>(new Date().toISOString())
  const error       = ref<string | null>(null)

  let interval: ReturnType<typeof setInterval> | null = null

  // ── main fetch ──────────────────────────────────────────────────────────
  const fetchStatus = async () => {
    try {
      error.value = null

      // STEP 1: Read current live state from dummy_service_states
      const { data: states, error: statesErr } = await supabase
        .from('dummy_service_states')
        .select('service_id, status, updated_at')

      if (statesErr) {
        console.error('[fetchStatus] dummy_service_states error:', statesErr)
        error.value = statesErr.message
        return
      }

      console.log('[fetchStatus] states from Supabase:', states)

      // STEP 2: Read health_checks for history (last 90 per service)
      const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const { data: checks, error: checksErr } = await supabase
        .from('health_checks')
        .select('service_id, status, response_time, checked_at')
        .gte('checked_at', since90d)
        .order('checked_at', { ascending: false })

      if (checksErr) {
        console.error('[fetchStatus] health_checks error:', checksErr)
      }

      const allChecks = checks || []

      // STEP 3: Build enriched services list
      const enriched = SERVICES_ORDER.map(id => {
        // Get current status from dummy_service_states
        const stateRow  = (states || []).find((s: any) => s.service_id === id)
        const currentStatus = stateRow?.status || 'checking'

        // Get history from health_checks for this service
        const serviceChecks = allChecks
          .filter((c: any) => c.service_id === id)
          .slice(0, 90)

        // Build 90-slot history array (newest last)
        const rawHistory = serviceChecks.map((c: any) => c.status).reverse()
        const history: string[] = []
        // Pad with 'operational' at the start to reach 90 slots
        while (history.length + rawHistory.length < 90) {
          history.push('operational')
        }
        history.push(...rawHistory)

        // Calculate uptime % from real checks only
        const realChecks = serviceChecks.length
        const goodChecks = serviceChecks.filter(
          (c: any) => c.status === 'operational'
        ).length
        const uptime = realChecks > 0
          ? +((goodChecks / realChecks) * 100).toFixed(2)
          : 100

        // Latest response time
        const latestCheck = serviceChecks[0]
        const responseTime = latestCheck?.response_time || 0

        return {
          id,
          name:         NAME_MAP[id] || id,
          description:  DESC_MAP[id] || '',
          category:     CATEGORY_MAP[id] || 'application',
          status:       currentStatus,  // comes from dummy_service_states
          uptime,
          responseTime,
          history,
          lastUpdated:  stateRow?.updated_at || null
        }
      })

      services.value = enriched
      console.log('[fetchStatus] enriched services:', enriched.map(s => `${s.id}=${s.status}`))

      // STEP 4: Calculate overall status
      const statuses = enriched.map(s => s.status)
      if (statuses.includes('outage'))          overall.value = 'outage'
      else if (statuses.includes('degraded'))   overall.value = 'degraded'
      else if (statuses.every(s => s === 'operational')) overall.value = 'operational'
      else                                      overall.value = 'checking'

      lastChecked.value = new Date().toISOString()

      // STEP 5: Build incidents from health_checks log
      buildIncidents(allChecks)

    } catch (err: any) {
      console.error('[fetchStatus] unexpected error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // ── build incidents from health_checks log sequence ─────────────────────
  const buildIncidents = (allChecks: any[]) => {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentChecks = allChecks
      .filter((c: any) => c.checked_at >= since7d)
      .sort((a: any, b: any) =>
        new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
      )

    const built: any[] = []

    SERVICES_ORDER.forEach(serviceId => {
      const serviceName   = NAME_MAP[serviceId] || serviceId
      const serviceLogs   = recentChecks.filter((c: any) => c.service_id === serviceId)
      let current: any    = null

      serviceLogs.forEach((log: any) => {
        const state = log.status

        if (state !== 'operational' && !current) {
          // Incident starts
          current = {
            id:               `${serviceId}-${log.checked_at}`,
            title:            `${serviceName} ${state === 'outage' ? 'Outage' : 'Degraded Performance'}`,
            status:           state === 'outage' ? 'investigating' : 'monitoring',
            affectedServices: [serviceName],
            createdAt:        log.checked_at,
            updates: [{
              timestamp: log.checked_at,
              message:   `${serviceName} is experiencing ${state === 'outage' ? 'an outage' : 'degraded performance'}.`
            }],
            resolvedAt: null
          }
        } else if (state !== 'operational' && current) {
          // Incident worsens
          if (state === 'outage') current.status = 'investigating'
          current.updates.push({
            timestamp: log.checked_at,
            message:   `${serviceName} continues to experience issues (${state}).`
          })
        } else if (state === 'operational' && current) {
          // Incident resolves
          current.status     = 'resolved'
          current.resolvedAt = log.checked_at
          current.updates.push({
            timestamp: log.checked_at,
            message:   'Service has fully recovered and is operating normally.'
          })
          built.push({ ...current })
          current = null
        }
      })

      // Still-open incident
      if (current) built.push({ ...current })
    })

    incidents.value = built.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  // ── computed groupings ──────────────────────────────────────────────────
>>>>>>> 92f235f (changes added)
  const servicesByCategory = computed(() => {
    const map = { infrastructure: [], application: [], communication: [], platform: [] }
    services.value.forEach(s => {
      if (map[s.category]) map[s.category].push(s)
      else map['application'].push(s)
    })
    return map
  })

  async function loadCurrentStates() {
    if (!supabase) return
    const { data, error } = await supabase.from('dummy_service_states').select('*')
    if (error) { console.error('loadCurrentStates error:', error.message); return }
    if (data) {
      const newStates = {}
      data.forEach(row => {
        const mapped = row.status === 'healthy' ? 'operational' : row.status
        newStates[row.service_id] = mapped || 'operational'
      })
      serviceStates.value = newStates
      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        )
        lastChecked.value = latest.updated_at
      }
    }
  }

  async function loadRecentChecks() {
    if (!supabase) return
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('health_checks')
      .select('*')
      .gte('checked_at', since)
      .order('checked_at', { ascending: true })
    if (error) { console.error('loadRecentChecks error:', error.message); return }
    recentChecks.value = data || []
  }

<<<<<<< HEAD
  const refresh = async () => {
    loading.value = true
    await Promise.all([loadCurrentStates(), loadRecentChecks()])
    loading.value = false
  }

  onMounted(async () => {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)
    await refresh()
    pollInterval = setInterval(async () => {
      await loadCurrentStates()
      await loadRecentChecks()
    }, 10000)
=======
  // ── no-op stubs (services managed via Supabase) ─────────────────────────
  const addService    = async () => {}
  const removeService = async () => {}
  const refresh       = () => fetchStatus()

  // ── lifecycle ────────────────────────────────────────────────────────────
  onMounted(() => {
    fetchStatus()
    // Poll every 10 seconds
    interval = setInterval(fetchStatus, 10000)
>>>>>>> 92f235f (changes added)
  })

  onUnmounted(() => {
    if (pollInterval) clearInterval(pollInterval)
  })

  return {
    services,
    overall,
    incidents,
    loading,
    lastChecked,
    error,
    servicesByCategory,
    categoryLabels,
    categoryOrder,
    refresh,
    addService: async () => {},
    removeService: async () => {}
  }
}

function buildHistory(serviceId, checks) {
  const serviceChecks = checks.filter(c => c.service_id === serviceId)
  const byDay = {}

  serviceChecks.forEach(c => {
    const day = (c.checked_at || '').split('T')[0]
    if (!day) return
    if (!byDay[day]) byDay[day] = { total: 0, errors: 0, degraded: 0 }
    byDay[day].total++
    if (c.status === 'outage') byDay[day].errors++
    if (c.status === 'degraded') byDay[day].degraded++
  })

  const history = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const day = byDay[key]
    if (!day || day.total === 0) history.push('operational')
    else if (day.errors / day.total >= 0.5) history.push('outage')
    else if (day.degraded > 0 || day.errors > 0) history.push('degraded')
    else history.push('operational')
  }
  return history
}

function buildIncidents(checks) {
  const incidents = []
  const nameMap = {
    'kiinara-identity': 'Kiinara Identity',
    'kiinara-core': 'Kiinara Core',
    'kiinara-accounts': 'Kiinara Accounts',
    'pulse-email': 'Pulse — Email',
    'pulse-whatsapp': 'Pulse — WhatsApp'
  }

  Object.keys(nameMap).forEach(serviceId => {
    const serviceLogs = checks
      .filter(c => c.service_id === serviceId)
      .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())

    if (serviceLogs.length === 0) return

    let current = null

    serviceLogs.forEach(log => {
      const state = log.status
      if (state !== 'operational' && !current) {
        current = {
          id: serviceId + '-' + log.checked_at,
          title: nameMap[serviceId] + ' ' + (state === 'outage' ? 'Outage' : 'Degraded Performance'),
          status: state === 'outage' ? 'investigating' : 'monitoring',
          affectedServices: [nameMap[serviceId]],
          createdAt: log.checked_at,
          resolvedAt: null,
          updates: [{
            timestamp: log.checked_at,
            message: nameMap[serviceId] + ' is experiencing ' + (state === 'outage' ? 'an outage.' : 'degraded performance.')
          }]
        }
      } else if (state === 'operational' && current) {
        current.status = 'resolved'
        current.resolvedAt = log.checked_at
        current.updates.push({
          timestamp: log.checked_at,
          message: 'Service has fully recovered and is operating normally.'
        })
        incidents.push(Object.assign({}, current))
        current = null
      }
    })

    if (current) incidents.push(current)
  })

  return incidents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
