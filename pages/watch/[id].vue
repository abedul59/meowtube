<template>
  <div class="max-w-4xl mx-auto py-8">
    <NuxtLink to="/" class="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
      ⬅ 返回劇院大廳
    </NuxtLink>

    <div v-if="pending" class="flex justify-center items-center h-64 text-gray-400">
      <p class="text-xl">🎬 載入影片資訊中...</p>
    </div>
    <div v-else-if="error || !movie" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">
      找不到這部電影。
    </div>
    <div v-else class="space-y-6">
      <h1 class="text-3xl font-bold text-white">{{ movie.title }}</h1>
      
      <div class="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video controls autoplay class="absolute top-0 left-0 w-full h-full outline-none" controlsList="nodownload">
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${movie.tg_message_id}`" type="video/mp4" />
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <h2 class="text-xl font-semibold text-gray-200 mb-3">劇情簡介</h2>
        <p class="text-gray-400 leading-relaxed whitespace-pre-wrap">{{ movie.description }}</p>
        
        <div class="mt-6 pt-6 border-t border-gray-700 flex flex-wrap gap-4">
           <a :href="`https://lawxstudents168-meowtube-api.hf.space/stream/${movie.tg_message_id}`" target="_blank" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors text-sm flex items-center">
             📥 另開視窗觀看 / 下載檔案
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

const { data: movie, pending, error } = await useAsyncData(`movie-${route.params.id}`, async () => {
  const { data, error } = await supabase.from('movies').select('*').eq('id', route.params.id).single()
  if (error) throw error
  return data
})
</script>