<template>
  <div>
    <h1 class="text-3xl font-bold mb-8">最新上架</h1>
    
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
      <div 
        v-for="i in 5" 
        :key="i" 
        class="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer"
        @click="goToWatch(i)"
      >
        <div class="h-64 bg-gray-700 flex items-center justify-center text-gray-500">
          封面圖
        </div>
        <div class="p-4">
          <h2 class="text-lg font-semibold truncate">測試電影標題 {{ i }}</h2>
          <p class="text-sm text-gray-400 mt-1">2026 • 動作片</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToWatch = (id) => {
  router.push(`/watch/${id}`)
}
</script>