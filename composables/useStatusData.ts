import { createClient } from '@supabase/supabase-js'
import { ref, computed, onMounted, onUnmounted } from 'vue'

export const SERVICE_DEFINITIONS = [
  {
    id: 'kiinara-identity',
    name: 'Kiinara Identity',
    description: 'Authentication & user identity',
    category: 'infrastructure',
    icon: '🔐'
  },
  {
    id: 'kiinara-core',
    name: 'Kiinara Core',
    description: 'Core platform services',
    category: 'application',
    icon: '⚙️'
  },
  {
    id: 'kiinara-accounts',
    name: 'Kiinara Accounts',
    description: 'Accounts management',
    category: 'application',
    icon: '🏫'
  },
  {
    id: 'pulse-email',
    name: 'Pulse — Email',
    description: 'Email delivery service',
    category: 'communication',
    icon: '📧'
  },
  {
    id: 'pulse-whatsapp',
    name: 'Pulse — WhatsApp',
    description: 'WhatsApp messaging service',
    category: 'communication',
    icon: '💬'
  }
]

export const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: 'Core Infrastructure',
  application: 'Application Services',
  communication: 'Communication',
  platform: 'Platform'
}

export const CATEGORY_ORDER = [
  'infrastructure',
  'application',
  'communication',
  'platform'
]

const NAME_MAP: Record<string, string> = {
  'kiinara-identity': 'Kiinara Identity',
  'kiinara-core': 'Kiinara Core',
  'kiinara-accounts': 'Kiinara Accounts',
  'pulse-email': 'Pulse — Email',
  'pulse-whatsapp': 'Pulse — WhatsApp'
}

function normalizeStatus(
  raw: string
): 'operational' | 'degraded' | 'outage' {
  if (!raw) return 'operational'

  const s = raw.toLowerCase().trim()

  if (s === 'healthy') return 'operational'
  if (s === 'operational') return 'operational'
  if (s === 'degraded') return 'degraded'
  if (s === 'outage') return 'outage'
  if (s === 'down') return 'outage'
  if (s === 'error') return 'outage'

  console.warn('[normalizeStatus] unknown status:', raw)

  return 'outage'
}

export function useStatusData() {
  const config = useRuntimeConfig()

  let supabase: ReturnType<typeof createClient> | null = null

  const serviceStates = ref<
    Record<string, 'operational' | 'degraded' | 'outage'>
  >(
    Object.fromEntries(
      SERVICE_DEFINITIONS.map((s) => [s.id, 'operational'])
    )
  )

  const recentChecks = ref<any[]>([])
  const loading = ref(true)
  const lastChecked = ref(new Date().toISOString())
  const fetchError = ref<string | null>(null)

  let pollInterval: ReturnType<typeof setInterval> | null = null

  const categoryLabels = CATEGORY_LABELS
  const categoryOrder = CATEGORY_ORDER

  const services = computed(() =>
    SERVICE_DEFINITIONS.map((def) => {
      const currentStatus =
        serviceStates.value[def.id] || 'operational'

      const history = buildHistory(
        def.id,
        recentChecks.value
      )

      const goodSlots = history.filter(
        (h) => h === 'operational'
      ).length

      const uptime =
        history.length > 0
          ? +(
              (goodSlots / history.length) *
              100
            ).toFixed(2)
          : 100

      const serviceChecks = recentChecks.value.filter(
        (c) => c.service_id === def.id
      )

      const latest =
        serviceChecks[serviceChecks.length - 1]

      const responseTime = latest?.response_time || 0

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        status: currentStatus,
        uptime,
        responseTime,
        history
      }
    })
  )

  const servicesByCategory = computed(() => {
    const map: Record<string, any[]> = {
      infrastructure: [],
      application: [],
      communication: [],
      platform: []
    }

    services.value.forEach((s) => {
      if (map[s.category]) {
        map[s.category].push(s)
      } else {
        map.application.push(s)
      }
    })

    return map
  })

  const overall = computed(() => {
    const statuses = Object.values(serviceStates.value)

    if (statuses.some((s) => s === 'outage')) {
      return 'outage'
    }

    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded'
    }

    return 'operational'
  })

  const incidents = computed(() =>
    buildIncidents(recentChecks.value)
  )

  async function loadCurrentStates() {
    if (!supabase) return

    const { data, error } = await supabase
      .from('dummy_service_states')
      .select('service_id, status, updated_at')

    if (error) {
      console.error(
        '[loadCurrentStates]',
        error.message
      )

      fetchError.value = error.message
      return
    }

    if (data && data.length > 0) {
      data.forEach((row: any) => {
        const normalized = normalizeStatus(
          row.status
        )

        serviceStates.value[row.service_id] =
          normalized
      })

const latest = data.reduce((a: any, b: any) => {
  return new Date(a.updated_at).getTime() >
    new Date(b.updated_at).getTime()
    ? a
    : b
}, data[0] as any)
      lastChecked.value = latest.updated_at
    }

    fetchError.value = null
  }

  async function loadRecentChecks() {
    if (!supabase) return

    const since = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data, error } = await supabase
      .from('health_checks')
      .select(
        'service_id, status, response_time, checked_at'
      )
      .gte('checked_at', since)
      .order('checked_at', {
        ascending: true
      })

    if (error) {
      console.error(
        '[loadRecentChecks]',
        error.message
      )

      return
    }

    recentChecks.value = (data || []).map(
      (row: any) => ({
        ...row,
        status: normalizeStatus(row.status)
      })
    )
  }

  const refresh = async () => {
    loading.value = true

    await Promise.all([
      loadCurrentStates(),
      loadRecentChecks()
    ])

    loading.value = false
  }

  onMounted(async () => {
    if (typeof window === 'undefined') return

    const url = config.public.supabaseUrl as string
    const key = config.public.supabaseKey as string

    if (!url || !key) {
      fetchError.value =
        'Missing Supabase environment variables'

      loading.value = false
      return
    }

    supabase = createClient(url, key)

    await refresh()

    pollInterval = setInterval(async () => {
      await loadCurrentStates()
      await loadRecentChecks()
    }, 10000)
  })

  onUnmounted(() => {
    if (pollInterval) {
      clearInterval(pollInterval)
    }
  })

  return {
    services,
    incidents,
    overall,
    loading,
    lastChecked,
    fetchError,
    servicesByCategory,
    categoryLabels,
    categoryOrder,
    refresh
  }
}

function buildHistory(
  serviceId: string,
  checks: any[]
): ('operational' | 'degraded' | 'outage')[] {
  const serviceChecks = checks.filter(
    (c) => c.service_id === serviceId
  )

  const byDay: Record<
    string,
    {
      total: number
      errors: number
      degraded: number
    }
  > = {}

  serviceChecks.forEach((c) => {
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

  const history: (
    | 'operational'
    | 'degraded'
    | 'outage'
  )[] = []

  for (let i = 89; i >= 0; i--) {
    const d = new Date()

    d.setDate(d.getDate() - i)

    const key = d.toISOString().split('T')[0]

    const day = byDay[key]

    if (!day || day.total === 0) {
      history.push('operational')
    } else if (day.errors / day.total >= 0.5) {
      history.push('outage')
    } else if (
      day.degraded > 0 ||
      day.errors > 0
    ) {
      history.push('degraded')
    } else {
      history.push('operational')
    }
  }

  return history
}

function buildIncidents(checks: any[]) {
  const incidents: any[] = []

  SERVICE_DEFINITIONS.forEach((def) => {
    const name = NAME_MAP[def.id] || def.id

    const logs = checks
      .filter((c) => c.service_id === def.id)
      .sort(
        (a, b) =>
          new Date(a.checked_at).getTime() -
          new Date(b.checked_at).getTime()
      )

    let current: any = null

    logs.forEach((log) => {
      const state = normalizeStatus(log.status)

      if (
        state !== 'operational' &&
        !current
      ) {
        current = {
          id: `${def.id}-${log.checked_at}`,
          title: `${name} ${
            state === 'outage'
              ? 'Outage'
              : 'Degraded Performance'
          }`,
          status:
            state === 'outage'
              ? 'investigating'
              : 'monitoring',
          affectedServices: [name],
          createdAt: log.checked_at,
          resolvedAt: null,
          updates: [
            {
              timestamp: log.checked_at,
              message: `${name} is experiencing ${
                state === 'outage'
                  ? 'an outage.'
                  : 'degraded performance.'
              }`
            }
          ]
        }
      } else if (
        state !== 'operational' &&
        current
      ) {
        current.updates.push({
          timestamp: log.checked_at,
          message: `${name} continues to experience issues (${state}).`
        })
      } else if (
        state === 'operational' &&
        current
      ) {
        current.status = 'resolved'
        current.resolvedAt = log.checked_at

        current.updates.push({
          timestamp: log.checked_at,
          message: 'Service has fully recovered.'
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