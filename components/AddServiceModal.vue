<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close'])

const form = ref({
  name:        '',
  description: '',
  category:    'application',
  url:         ''
})

const categories = [
  { value: 'infrastructure', label: 'Core Infrastructure' },
  { value: 'application',    label: 'Application Services' },
  { value: 'communication',  label: 'Communication' },
  { value: 'platform',       label: 'Platform' }
]
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

      <!-- Info banner -->
      <div class="mb-5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
        <p class="text-xs text-blue-400 leading-relaxed">
          Services are managed through the Kiinara Service Simulator. Use the simulator buttons to set each service status — it updates here in real time via Supabase.
        </p>
      </div>

      <div class="space-y-4 opacity-50 pointer-events-none select-none">
        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Service Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Payment Gateway"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Health Check URL</label>
          <input
            v-model="form.url"
            type="text"
            placeholder="https://your-service.com/api/ping"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none"
          />
          <p class="text-xs text-slate-700 mt-1">Pinged every 30 seconds to check status</p>
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Description</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="Brief description of this service"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs text-slate-500 mb-1.5">Category</label>
          <select
            v-model="form.category"
            class="w-full bg-[#0f1117] border border-[#1e2433] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none"
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
          Close
        </button>
        <button
          disabled
          class="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 opacity-40 text-sm text-white font-medium cursor-not-allowed"
        >
          Add & Check
        </button>
      </div>

    </div>
  </div>
</template>
