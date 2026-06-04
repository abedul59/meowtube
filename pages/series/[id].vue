<template>
  <div class="max-w-6xl mx-auto py-8 px-4">
    <NuxtLink to="/" class="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors font-bold">
      ⬅ 返回劇院大廳
    </NuxtLink>

    <div v-if="pending" class="text-center text-gray-400 py-20 text-xl animate-pulse">
      載入影集資訊中...
    </div>
    
    <div v-else-if="error || !series" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">
      找不到這部影集，可能已經被刪除了。
    </div>

    <div v-else class="space-y-8 animate-fade-in">
      
      <div class="flex flex-col md:flex-row gap-8 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <div class="w-full md:w-64 shrink-0">
          <img v-if="series.cover_url" :src="series.cover_url" class="w-full rounded-xl shadow-lg object-cover aspect-[2/3]" />
          <div v-else class="w-full aspect-[2/3] bg-gray-900 rounded-xl flex items-center justify-center text-gray-600 font-bold border border-gray-700">無海報</div>
        </div>
        
        <div class="flex-1">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">{{ series.title }}</h1>
          <p class="text-gray-300 leading-relaxed whitespace-pre-wrap">{{ series.description || '這部影集還沒有寫簡介喔。' }}</p>
          
          <div class="mt-6 flex items-center gap-4 text-sm text-gray-400">
            <span class="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700">
              共收錄 {{ series.episodes.length }} 集
            </span>
            <span v-if="availableSeasons.length > 0" class="bg-gray-700 px-3 py-1 rounded-full">
              共 {{ availableSeasons.length }} 季
            </span>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">📺 選擇集數</h2>
        
        <div v-if="availableSeasons.length > 0" class="flex flex-wrap gap-2 mb-8">
          <button 
            v-for="season in availableSeasons" :key="season"
            @click="activeSeason = season"
            :class="activeSeason === season ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'"
            class="px-6 py-2.5 rounded-lg font-bold transition-all duration-200"
          >
            第 {{ season }} 季
          </button>
        </div>

        <div v-if="currentSeasonEpisodes.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <NuxtLink 
            v-for="ep in currentSeasonEpisodes" :key="ep.id"
            :to="`/watch/ep/${ep.id}`"
            class="bg-gray-700/50 hover:bg-indigo-600 border border-gray-600 hover:border-indigo-400 p-4 rounded-xl text-center group transition-all duration-300 shadow-sm"
          >
            <div class="text-gray-400 group-hover:text-indigo-200 text-xs font-bold mb-1 tracking-wider uppercase">
              Episode {{ ep.episode }}
            </div>
            <div class="text-white font-bold text-xl my-2 group-hover:scale-105 transition-transform">
              第 {{ ep.episode }} 集
            </div>
            <div v-if="ep.title" class="text-xs text-gray-400 group-hover:text-indigo-100 mt-2 truncate px-2" :title="ep.title">
              {{ ep.title }}
            </div>
          </NuxtLink>
        </div>
        
        <div v-else class="text-center py-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
          <p class="text-lg mb-2">這部影集還沒有上傳任何集數喔！</p>
          <p class="text-sm">請前往「⚙️ 管理模式」的後台上傳單集影片。</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const supabase = useSupabaseClient()
const activeSeason = ref(1) // 預設顯示第一季

// 獲取影集與其所有集數
const { data: series, pending, error } = await useAsyncData(`series-${route.params.id}`, async () => {
  // 1. 抓取影集基本資料
  const { data: seriesData, error: seriesError } = await supabase
    .from('series')
    .select('*')
    .eq('id', route.params.id)
    .single()
    
  if (seriesError) throw seriesError

  // 2. 抓取該影集的所有集數 (依照季數與集數排序)
  const { data: episodesData, error: epsError } = await supabase
    .from('episodes')
    .select('*')
    .eq('series_id', route.params.id)
    .order('season')
    .order('episode')
    
  if (epsError) throw epsError
  
  // 將兩包資料合併回傳給前端
  return { ...seriesData, episodes: episodesData || [] }
})

// ==========================================
// 邏輯運算區
// ==========================================

// 計算出總共有哪幾季 (例如抓出 1, 2, 3，並去除重複)
const availableSeasons = computed(() => {
  if (!series.value || !series.value.episodes) return []
  const seasons = series.value.episodes.map(ep => ep.season)
  return [...new Set(seasons)].sort((a, b) => a - b)
})

// 自動將預設頁籤切換到「現有」的第一個季數
watchEffect(() => {
  if (availableSeasons.value.length > 0 && !availableSeasons.value.includes(activeSeason.value)) {
    activeSeason.value = availableSeasons.value[0]
  }
})

// 過濾出「目前選中季數」的集數
const currentSeasonEpisodes = computed(() => {
  if (!series.value || !series.value.episodes) return []
  return series.value.episodes.filter(ep => ep.season === activeSeason.value)
})
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>