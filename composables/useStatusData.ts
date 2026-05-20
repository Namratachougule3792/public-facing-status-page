import { ref, computed, onMounted, onUnmounted } from 'vue'

const MONITORING_API = 'https://main.d1o8f3eh3hg0bw.amplifyapp.com'

export function useStatusData() {
  const services = ref([])
  const incidents = ref([])
  const overall = ref('checking')
  const loading = ref(true)
  const lastChecked = ref(new Date().toISOString())
  let interval: ReturnType<typeof setInterval> | null = null

  const servicesByCategory = computed(() => {
    const map: Record<string, any[]> = {
      infrastructure: [],
      application: [],
      communication: [],
      platform: []
    }
    services.value.forEach((s: any) => {
      if (map[s.category]) map[s.category].push(s)
      else map['application'].push(s)
    })
    return map
  })

  const categoryLabels: Record<string, string> = {
    infrastructure: 'Core Infrastructure',
    application: 'Application Services',
    communication: 'Communication',
    platform: 'Platform'
  }

  const categoryOrder = ['infrastructure', 'application', 'communication', 'platform']

  const fetchStatus = async () => {
    try {
      const data = await $fetch(`${MONITORING_API}/api/public/status`) as any
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

  // Dummy add/remove kept for UI compatibility
  const addService = async (data: any) => {
    console.log('Service management handled in monitoring app admin panel')
  }

  const removeService = async (id: string) => {
    console.log('Service management handled in monitoring app admin panel')
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