import { ref, computed, onMounted, onUnmounted } from 'vue'

const MONITORING_API = 'https://main.d1o8f3eh3hg0bw.amplifyapp.com'

export const SERVICE_DEFINITIONS = [
  { id: 'kiinara-identity',  name: 'Kiinara Identity',  description: 'Authentication and user identity', category: 'infrastructure' },
  { id: 'kiinara-core',      name: 'Kiinara Core',      description: 'Core platform services',           category: 'application' },
  { id: 'kiinara-accounts',  name: 'Kiinara Accounts',  description: 'Accounts management',              category: 'application' },
  { id: 'pulse-email',       name: 'Pulse Email',       description: 'Email delivery service',           category: 'communication' },
  { id: 'pulse-whatsapp',    name: 'Pulse WhatsApp',    description: 'WhatsApp messaging service',       category: 'communication' }
]

export function useStatusData() {
  const services = ref([])
  const incidents = ref([])
  const overall = ref('checking')
  const loading = ref(true)
  const lastChecked = ref(new Date().toISOString())
  let interval = null

  const servicesByCategory = computed(() => {
    const map = {
      infrastructure: [],
      application: [],
      communication: [],
      platform: []
    }
    services.value.forEach((s) => {
      if (map[s.category]) map[s.category].push(s)
      else map['application'].push(s)
    })
    return map
  })

  const categoryLabels = {
    infrastructure: 'Core Infrastructure',
    application: 'Application Services',
    communication: 'Communication',
    platform: 'Platform'
  }

  const categoryOrder = ['infrastructure', 'application', 'communication', 'platform']

  const fetchStatus = async () => {
    try {
      const data = await $fetch(MONITORING_API + '/api/public/status')
      services.value = data.services || []
      incidents.value = data.incidents || []
      overall.value = data.overall || 'operational'
      lastChecked.value = data.lastChecked || new Date().toISOString()
    } catch (err) {
      console.error('Failed to fetch status:', err)
      overall.value = 'checking'
    } finally {
      loading.value = false
    }
  }

  const refresh = () => fetchStatus()

  const addService = async (data) => {
    console.log('Service management handled in monitoring app')
  }

  const removeService = async (id) => {
    console.log('Service management handled in monitoring app')
  }

  onMounted(() => {
    fetchStatus()
    interval = setInterval(fetchStatus, 30000)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return {
    services,
    incidents,
    overall,
    loading,
    lastChecked,
    servicesByCategory,
    categoryLabels,
    categoryOrder,
    addService,
    removeService,
    refresh
  }
}
