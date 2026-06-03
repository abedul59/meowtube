<template>
  <div class="max-w-4xl mx-auto py-8">
    <NuxtLink to="/" class="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
      </svg>
      返回劇院大廳
    </NuxtLink>

    <div v-if="pending" class="flex justify-center items-center h-64 text-gray-400">
      <p class="text-xl">🎬 載入影片資訊中...</p>
    </div>

    <div v-else-if="error || !movie" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">
      找不到這部電影，或資料庫讀取失敗。
    </div>

    <div v-else class="space-y-6">
      <h1 class="text-3xl md:text-4xl font-bold text-white">{{ movie.title }}</h1>
      
      <div class="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video 
          controls 
          autoplay 
          class="absolute top-0 left-0 w-full h-full outline-none"
          controlsList="nodownload"
        >
          <source :src="`https://meowtube-api.onrender.com/stream/${movie.tg_message_id}`" type="video/mp4" />
          你的瀏覽器不支援 HTML5 影片播放。
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h2 class="text-xl font-semibold text-gray-200 mb-3">劇情簡介</h2>
        <p class="text-gray-400 leading-relaxed whitespace-pre-wrap">{{ movie.description || '這部電影還沒有寫簡介喔。' }}</p>
        
        <div class="mt-6 pt-6 border-t border-gray-700 flex flex-wrap gap-4">
           <a :href="`https://meowtube-api.onrender.com/stream/${movie.tg_message_id}`" target="_blank" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm flex items-center">
             🔗 另開視窗觀看 / 下載
           </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const supabase = useSupabaseClient()

// 根據網址列的 ID (route.params.id) 向 Supabase 撈取單筆電影資料
const { data: movie, pending, error } = await useAsyncData(`movie-${route.params.id}`, async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', route.params.id)
    .single() // 告訴 Supabase 我們只要拿一筆資料

  if (error) {
    console.error('讀取影片失敗:', error)
    throw error
  }
  
  return data
})
</script>