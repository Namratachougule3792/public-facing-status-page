import { ref, computed, onMounted, onUnmounted } from 'vue'

export const SERVICE_DEFINITIONS = [
  { id: 'kiinara-identity',  name: 'Kiinara Identity',   description: 'Authentication and user identity', category: 'infrastructure' },
  { id: 'kiinara-core',      name: 'Kiinara Core',       description: 'Management Software',              category: 'application' },
  { id: 'kiinara-accounts',  name: 'Kiinara Accounts',   description: 'Accounts management',              category: 'application' },
  { id: 'pulse-email',       name: 'Pulse — Email',      description: 'Email delivery service',           category: 'communication' },
  { id: 'pulse-whatsapp',    name: 'Pulse — WhatsApp',   description: 'WhatsApp messaging service',       category: 'communication' }
]

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
