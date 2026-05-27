<template>
  <div class="min-h-screen flex flex-col bg-[#0f1117]">
    <header class="border-b border-[#1e2433] bg-[#0f1117] sticky top-0 z-50">
      <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center">
            <div class="w-3 h-3 bg-white rounded-sm" />
          </div>
          <span class="text-white font-semibold text-sm tracking-wide">Kiinara OS</span>
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <div class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live updates enabled
        </div>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
    <footer class="border-t border-[#1e2433] mt-16">
      <div class="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-slate-600">
        <span>Kiinara OS Status</span>
        <span>Updated every 10 seconds</span>
      </div>
    </footer>
  </div>
</template>