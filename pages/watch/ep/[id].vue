<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    
    <NuxtLink v-if="episode" :to="`/series/${episode.series_id}`" class="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors font-bold">
      ⬅ 返回選集頁面
    </NuxtLink>
    <NuxtLink v-else to="/" class="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors font-bold">
      ⬅ 返回劇院大廳
    </NuxtLink>

    <div v-if="pending" class="flex justify-center items-center h-64 text-gray-400">
      <p class="text-xl animate-pulse">🎬 載入集數資訊中...</p>
    </div>
    <div v-else-if="error || !episode" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">
      找不到這集影片，可能已經被刪除了。
    </div>
    
    <div v-else class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-indigo-400 font-bold mb-1">{{ episode.series.title }}</h2>
        <h1 class="text-2xl md:text-3xl font-bold text-white">
          第 {{ episode.season }} 季 第 {{ episode.episode }} 集
          <span v-if="episode.title" class="text-gray-400 ml-2 text-xl">- {{ episode.title }}</span>
        </h1>
      </div>
      
      <div class="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video controls autoplay class="absolute top-0 left-0 w-full h-full outline-none" controlsList="nodownload">
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${episode.tg_message_id}`" type="video/mp4" />
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-200">正在觀看：{{ episode.series.title }}</h2>
            <p class="text-gray-400 mt-1">S{{ episode.season }}E{{ episode.episode }}</p>
          </div>
          
           <a :href="`https://lawxstudents168-meowtube-api.hf.space/stream/${episode.tg_message_id}`" target="_blank" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors text-sm flex items-center shadow-md">
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

// 根據網址列的 ID 向 Supabase 撈取單集資料，並順便把 series (影集資訊) 關聯拉出來
const { data: episode, pending, error } = await useAsyncData(`ep-${route.params.id}`, async () => {
  const { data, error } = await supabase
    .from('episodes')
    .select('*, series(*)') // 關聯查詢魔法：把 series 表的資料一併帶出
    .eq('id', route.params.id)
    .single()

  if (error) throw error
  return data
})
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>