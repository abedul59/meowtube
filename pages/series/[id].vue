<template>
  <div class="max-w-6xl mx-auto py-8 px-4">
    <div class="flex justify-between items-center mb-6">
      <NuxtLink to="/" class="inline-flex items-center text-gray-400 hover:text-white transition-colors font-bold">
        ⬅ 返回劇院大廳
      </NuxtLink>
      <NuxtLink to="/admin" class="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-bold text-white transition-colors shadow-md">
        ⬆️ 前往上傳後台
      </NuxtLink>
    </div>

    <div v-if="pending" class="text-center text-gray-400 py-20 text-xl animate-pulse">載入影集資訊中...</div>
    <div v-else-if="error || !series" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">找不到這部影集。</div>

    <div v-else class="space-y-8 animate-fade-in">
      <div class="flex flex-col md:flex-row gap-8 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative">
        <div class="w-full md:w-64 shrink-0">
          <img v-if="series.cover_url" :src="series.cover_url" class="w-full rounded-xl shadow-lg object-cover aspect-[2/3]" />
          <div v-else class="w-full aspect-[2/3] bg-gray-900 rounded-xl flex items-center justify-center text-gray-600 font-bold">無海報</div>
        </div>
        <div class="flex-1">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">{{ series.title }}</h1>
          <p class="text-gray-300 leading-relaxed whitespace-pre-wrap">{{ series.description || '無簡介' }}</p>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-4">📺 選擇集數</h2>
        
        <div v-if="availableSeasons.length > 0" class="flex flex-wrap gap-2 mb-8">
          <button v-for="season in availableSeasons" :key="season" @click="activeSeason = season" :class="activeSeason === season ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'" class="px-6 py-2.5 rounded-lg font-bold transition-all duration-200">
            第 {{ season }} 季
          </button>
        </div>

        <div v-if="currentSeasonEpisodes.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          
          <div v-for="ep in currentSeasonEpisodes" :key="ep.id" class="relative group h-full">
            
            <div v-if="isAdmin" class="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.prevent="openEditEp(ep)" class="bg-blue-600 hover:bg-blue-700 p-1.5 rounded-md text-white shadow-md">✏️</button>
              <button @click.prevent="handleDeleteEp(ep.id, ep.tg_message_id)" class="bg-red-600 hover:bg-red-700 p-1.5 rounded-md text-white shadow-md">🗑️</button>
            </div>

            <NuxtLink :to="`/watch/ep/${ep.id}`" class="block h-full bg-gray-700/50 hover:bg-indigo-600 border border-gray-600 hover:border-indigo-400 p-4 rounded-xl text-center transition-all duration-300">
              <div class="text-gray-400 text-xs font-bold mb-1 tracking-wider uppercase">Episode {{ ep.episode }}</div>
              <div class="text-white font-bold text-xl my-2">第 {{ ep.episode }} 集</div>
              <div v-if="ep.title" class="text-xs text-gray-400 mt-2 truncate px-2">{{ ep.title }}</div>
            </NuxtLink>
          </div>

        </div>
        <div v-else class="text-center py-12 text-gray-500">這部影集還沒有上傳任何集數喔！</div>
      </div>
    </div>

    <div v-if="editingEp" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div class="bg-gray-800 p-6 rounded-2xl w-full max-w-sm border border-gray-600 shadow-2xl">
        <h3 class="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-3">✏️ 編輯單集資訊</h3>
        <div class="space-y-4">
          <div class="flex gap-4">
            <div class="flex-1"><label class="block text-gray-300 text-sm mb-2">季數</label><input v-model="epForm.season" type="number" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"></div>
            <div class="flex-1"><label class="block text-gray-300 text-sm mb-2">集數</label><input v-model="epForm.episode" type="number" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"></div>
          </div>
          <div><label class="block text-gray-300 text-sm mb-2">單集名稱 (備註)</label><input v-model="epForm.title" type="text" class="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"></div>
          
          <div class="flex justify-end gap-3 mt-6 border-t border-gray-700 pt-4">
            <button @click="editingEp = null" class="px-4 py-2 bg-gray-600 text-white rounded">取消</button>
            <button @click="saveEditEp" class="px-4 py-2 bg-blue-600 text-white rounded">儲存</button>
          </div>
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
const API_BASE_URL = 'https://lawxstudents168-meowtube-api.hf.space'

// 💡 讀取在首頁設定的全域狀態！
const isAdmin = useState('isAdmin', () => false)

const activeSeason = ref(1)
const editingEp = ref(null)
const epForm = ref({ id: '', title: '', season: 1, episode: 1 })

// 獲取影集與集數
const { data: series, pending, error } = await useAsyncData(`series-${route.params.id}`, async () => {
  const { data: seriesData } = await supabase.from('series').select('*').eq('id', route.params.id).single()
  const { data: episodesData } = await supabase.from('episodes').select('*').eq('series_id', route.params.id).order('season').order('episode')
  return { ...seriesData, episodes: episodesData || [] }
})

const availableSeasons = computed(() => {
  if (!series.value || !series.value.episodes) return []
  const seasons = series.value.episodes.map(ep => ep.season)
  return [...new Set(seasons)].sort((a, b) => a - b)
})

watchEffect(() => {
  if (availableSeasons.value.length > 0 && !availableSeasons.value.includes(activeSeason.value)) {
    activeSeason.value = availableSeasons.value[0]
  }
})

const currentSeasonEpisodes = computed(() => {
  if (!series.value || !series.value.episodes) return []
  return series.value.episodes.filter(ep => ep.season === activeSeason.value)
})

// ==========================================
// 💡 單集影片的編輯與刪除邏輯
// ==========================================
const handleDeleteEp = async (dbId, tgMessageId) => {
  if (!confirm('⚠️ 確定刪除這集影片嗎？(將同步銷毀 TG 雲端檔案)')) return
  try {
    if (tgMessageId) {
      await fetch(`${API_BASE_URL}/delete/${tgMessageId}`, { method: 'DELETE' }).catch(() => console.warn('TG 刪除失敗'))
    }
    const { error } = await supabase.from('episodes').delete().eq('id', dbId)
    if (error) throw error

    // 即時更新前端畫面
    series.value.episodes = series.value.episodes.filter(ep => ep.id !== dbId)
  } catch (e) { alert('❌ 刪除失敗: ' + e.message) }
}

const openEditEp = (ep) => {
  editingEp.value = ep
  epForm.value = { ...ep }
}

const saveEditEp = async () => {
  try {
    const { error } = await supabase.from('episodes').update({
      title: epForm.value.title,
      season: epForm.value.season,
      episode: epForm.value.episode
    }).eq('id', epForm.value.id)
    
    if (error) throw error

    // 即時更新前端畫面
    const idx = series.value.episodes.findIndex(e => e.id === epForm.value.id)
    if (idx !== -1) {
      series.value.episodes[idx] = { ...series.value.episodes[idx], ...epForm.value }
    }
    editingEp.value = null
  } catch (e) { alert('❌ 更新失敗: ' + e.message) }
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>