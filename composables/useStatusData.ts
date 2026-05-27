```ts
import { ref, computed, onMounted, onUnmounted } from 'vue'

export const SERVICE_DEFINITIONS = [
  { id: 'kiinara-identity',  name: 'Kiinara Identity',  description: 'Authentication & user identity', category: 'infrastructure', icon: '🔐' },
  { id: 'kiinara-core',      name: 'Kiinara Core',      description: 'Core platform services',         category: 'application',    icon: '⚙️' },
  { id: 'kiinara-accounts',  name: 'Kiinara Accounts',  description: 'Accounts management',            category: 'application',    icon: '🏫' },
  { id: 'pulse-email',       name: 'Pulse — Email',     description: 'Email delivery service',         category: 'communication',  icon: '📧' },
  { id: 'pulse-whatsapp',    name: 'Pulse — WhatsApp',  description: 'WhatsApp messaging service',     category: 'communication',  icon: '💬' }
]

const STATUS_MAP: Record<string, string> = {
  healthy: 'operational',
  degraded: 'degraded',
  outage: 'outage'
}

export function useStatusData() {
  const config = useRuntimeConfig()

  const serviceStates = ref<Record<string, string>>(
    Object.fromEntries(SERVICE_DEFINITIONS.map(s => [s.id, 'operational']))
  )

  const recentChecks = ref<any[]>([])
  const loading = ref(true)
  const lastChecked = ref(new Date().toISOString())

  let supabase: any = null
  let pollInterval: ReturnType<typeof setInterval> | null = null

  // ---------------------------------------------------------------------------
  // Services Computed
  // ---------------------------------------------------------------------------
  const services = computed(() =>
    SERVICE_DEFINITIONS.map(def => {
      const currentStatus = serviceStates.value[def.id] || 'operational'

      const history = buildHistory(def.id, recentChecks.value)

      const goodSlots = history.filter(h => h === 'operational').length

      const uptime =
        history.length > 0
          ? +((goodSlots / history.length) * 100).toFixed(2)
          : 100

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        status: currentStatus,
        uptime,
        responseTime: 0,
        history
      }
    })
  )

  // ---------------------------------------------------------------------------
  // Overall Status
  // ---------------------------------------------------------------------------
  const overall = computed(() => {
    const statuses = Object.values(serviceStates.value)

    if (statuses.some(s => s === 'outage')) {
      return 'outage'
    }

    if (statuses.some(s => s === 'degraded')) {
      return 'degraded'
    }

    return 'operational'
  })

  // ---------------------------------------------------------------------------
  // Incidents
  // ---------------------------------------------------------------------------
  const incidents = computed(() => buildIncidents(recentChecks.value))

  // ---------------------------------------------------------------------------
  // Load Current States
  // ---------------------------------------------------------------------------
  async function loadCurrentStates() {
    if (!supabase) return

    const { data, error } = await supabase
      .from('dummy_service_states')
      .select('*')

    if (error) {
      console.error('loadCurrentStates error:', error.message)
      return
    }

    if (data) {
      data.forEach((row: any) => {
        serviceStates.value[row.service_id] =
          STATUS_MAP[row.status] || row.status || 'operational'
      })

      if (data.length > 0) {
        const latest = data.reduce((a: any, b: any) =>
          new Date(a.updated_at) > new Date(b.updated_at) ? a : b
        )

        lastChecked.value = latest.updated_at
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Load Health Checks
  // ---------------------------------------------------------------------------
  async function loadRecentChecks() {
    if (!supabase) return

    const since = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data, error } = await supabase
      .from('health_checks')
      .select('*')
      .gte('checked_at', since)
      .order('checked_at', { ascending: true })

    if (error) {
      console.error('loadRecentChecks error:', error.message)
      return
    }

    recentChecks.value = data || []
  }

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------
  const refresh = async () => {
    loading.value = true

    await Promise.all([
      loadCurrentStates(),
      loadRecentChecks()
    ])

    loading.value = false
  }

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------
  function startPolling() {
    pollInterval = setInterval(async () => {
      await loadCurrentStates()
      await loadRecentChecks()
    }, 10000)
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------
  onMounted(async () => {
    const { createClient } = await import('@supabase/supabase-js')

    supabase = createClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )

    await refresh()

    startPolling()
  })

  onUnmounted(() => {
    if (pollInterval) {
      clearInterval(pollInterval)
    }
  })

  return {
    services,
    overall,
    incidents,
    loading,
    lastChecked,
    refresh
  }
}

// ---------------------------------------------------------------------------
// Build 90-day History
// ---------------------------------------------------------------------------
function buildHistory(serviceId: string, checks: any[]) {
  const serviceChecks = checks.filter(
    c => c.service_id === serviceId
  )

  const byDay: Record<
    string,
    { total: number; errors: number; degraded: number }
  > = {}

  serviceChecks.forEach(c => {
    const day = (c.checked_at || '').split('T')[0]

    if (!day) return

    if (!byDay[day]) {
      byDay[day] = {
        total: 0,
        errors: 0,
        degraded: 0
      }
    }

    byDay[day].total++

    if (c.status === 'outage') {
      byDay[day].errors++
    }

    if (c.status === 'degraded') {
      byDay[day].degraded++
    }
  })

  const history: ('operational' | 'degraded' | 'outage')[] = []

  for (let i = 89; i >= 0; i--) {
    const d = new Date()

    d.setDate(d.getDate() - i)

    const key = d.toISOString().split('T')[0]

    const day = byDay[key]

    if (!day || day.total === 0) {
      history.push('operational')
    } else if (day.errors / day.total >= 0.5) {
      history.push('outage')
    } else if (day.degraded > 0 || day.errors > 0) {
      history.push('degraded')
    } else {
      history.push('operational')
    }
  }

  return history
}

// ---------------------------------------------------------------------------
// Build Incidents
// ---------------------------------------------------------------------------
function buildIncidents(checks: any[]) {
  const incidents: any[] = []

  const nameMap: Record<string, string> = {
    'kiinara-identity': 'Kiinara Identity',
    'kiinara-core': 'Kiinara Core',
    'kiinara-accounts': 'Kiinara Accounts',
    'pulse-email': 'Pulse — Email',
    'pulse-whatsapp': 'Pulse — WhatsApp'
  }

  Object.keys(nameMap).forEach(serviceId => {
    const serviceLogs = checks
      .filter(c => c.service_id === serviceId)
      .sort(
        (a, b) =>
          new Date(a.checked_at).getTime() -
          new Date(b.checked_at).getTime()
      )

    if (serviceLogs.length === 0) return

    let current: any = null

    serviceLogs.forEach(log => {
      const state = log.status

      if (state !== 'operational' && !current) {
        current = {
          id: `${serviceId}-${log.checked_at}`,
          title:
            `${nameMap[serviceId]} ` +
            (state === 'outage'
              ? 'Outage'
              : 'Degraded Performance'),
          status:
            state === 'outage'
              ? 'investigating'
              : 'monitoring',
          affectedServices: [nameMap[serviceId]],
          createdAt: log.checked_at,
          resolvedAt: null,
          updates: [
            {
              timestamp: log.checked_at,
              message:
                `${nameMap[serviceId]} is experiencing ` +
                (state === 'outage'
                  ? 'an outage.'
                  : 'degraded performance.')
            }
          ]
        }
      } else if (state === 'operational' && current) {
        current.status = 'resolved'

        current.resolvedAt = log.checked_at

        current.updates.push({
          timestamp: log.checked_at,
          message:
            'Service has fully recovered and is operating normally.'
        })

        incidents.push({ ...current })

        current = null
      }
    })

    if (current) {
      incidents.push({ ...current })
    }
  })

  return incidents.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  )
}
```
