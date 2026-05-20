<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'add'])

const form = ref({
  name: '',
  description: '',
  category: 'application',
  url: ''
})

const errors = ref({})
const loading = ref(false)

const categories = [
  { value: 'infrastructure', label: 'Core Infrastructure' },
  { value: 'application', label: 'Application Services' },
  { value: 'communication', label: 'Communication' },
  { value: 'platform', label: 'Platform' }
]

const validate = () => {
  errors.value = {}
  if (!form.value.name.trim()) errors.value.name = 'Required'
  if (!form.value.url.trim()) errors.value.url = 'Required'
  if (form.value.url && !form.value.url.startsWith('http')) {
    errors.value.url = 'Must start with http:// or https://'
  }
  return Object.keys(errors.value).length === 0
}

const submit = async () => {
  if (!validate()) return
  loading.value = true
  emit('add', {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    category: form.value.category,
    url: form.value.url.trim()
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
    <div class="bg-[#141824] border border-[#1e2433] rounded-xl w-full max-w-md p-6">

      <div class="flex items-center justify-between mb-6">
        <h2 class="text-sm font-semibold text-slate-200">Add Service</h2>
        <button
          @click="$emit('close')"
          class="text-slate-600 hover:text-slate-400 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Service Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Payment Gateway"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <p v-if="errors.name" class="text-xs text-red-400 mt-1">{{ errors.name }}</p>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Health Check URL</label>
          <input
            v-model="form.url"
            type="text"
            placeholder="https://your-service.com/api/ping"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <p v-if="errors.url" class="text-xs text-red-400 mt-1">{{ errors.url }}</p>
          <p class="text-xs text-slate-700 mt-1">Pinged every 30 seconds to check status</p>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Description</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Brief description of this service"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Category</label>
          <select
            v-model="form.category"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors"
          >
            <option v-for="cat in categories" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          @click="$emit('close')"
          class="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2433] text-sm text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-colors"
        >
          Cancel
        </button>
        <button
          @click="submit"
          :disabled="loading"
          class="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm text-white font-medium transition-colors"
        >
          {{ loading ? 'Adding...' : 'Add & Check' }}
        </button>
      </div>

    </div>
  </div>
</template>