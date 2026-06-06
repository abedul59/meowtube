<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    
    <div class="flex items-center gap-4 mb-6">
      <button @click="$router.back()" class="inline-flex items-center text-gray-400 hover:text-white transition-colors font-bold bg-gray-800 px-4 py-2 rounded-lg shadow">
        ⬅ 返回上一頁
      </button>
      <NuxtLink v-if="episode" :to="`/series/${episode.series_id}`" class="inline-flex items-center text-gray-500 hover:text-gray-300 transition-colors text-sm">
        📺 回選集頁面
      </NuxtLink>
    </div>

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
        <video 
          ref="videoPlayer"
          controls 
          autoplay 
          class="absolute top-0 left-0 w-full h-full outline-none" 
          controlsList="nodownload"
          @loadedmetadata="resumeProgress"
          @pause="syncProgressToDB"
        >
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${episode.tg_message_id}`" type="video/mp4" />
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-semibold text-gray-200">正在觀看：{{ episode.series.title }}</h2>
              <span v-if="isSyncing" class="text-xs text-teal-400 flex items-center gap-1">
                <span class="w-2 h-2 bg-teal-400 rounded-full animate-ping"></span> 雲端同步中...
              </span>
            </div>
            <p class="text-gray-400 mt-1">S{{ episode.season }}E{{ episode.episode }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const supabase = useSupabaseClient()

const videoPlayer = ref(null)
const isSyncing = ref(false)
let syncInterval = null

// 同時抓取「單集資訊」與「雲端播放進度」
const { data: episode, pending, error } = await useAsyncData(`ep-${route.params.id}`, async () => {
  const { data: epData, error: epError } = await supabase.from('episodes').select('*, series(*)').eq('id', route.params.id).single()
  if (epError) throw epError

  // 嘗試抓取雲端進度
  const { data: progressData } = await supabase.from('playback_progress').select('current_time').eq('video_id', route.params.id).single()

  return {
    ...epData,
    savedTime: progressData?.current_time || 0
  }
})

// 💡 同步進度到 Supabase (雲端)
const syncProgressToDB = async () => {
  if (!videoPlayer.value || videoPlayer.value.currentTime <= 1) return

  isSyncing.value = true
  await supabase.from('playback_progress').upsert({
    video_id: route.params.id,
    current_time: videoPlayer.value.currentTime,
    updated_at: new Date()
  }, { onConflict: 'video_id' })

  setTimeout(() => { isSyncing.value = false }, 1000)
}

// 影片載入完成後，自動跳轉
const resumeProgress = () => {
  if (videoPlayer.value && episode.value?.savedTime > 0) {
    videoPlayer.value.currentTime = episode.value.savedTime
  }
}

// 掛載生命週期
onMounted(() => {
  syncInterval = setInterval(() => {
    if (videoPlayer.value && !videoPlayer.value.paused) {
      syncProgressToDB()
    }
  }, 10000)
  window.addEventListener('beforeunload', syncProgressToDB)
})

// 卸載前強制同步
onBeforeUnmount(() => {
  clearInterval(syncInterval)
  window.removeEventListener('beforeunload', syncProgressToDB)
  syncProgressToDB()
})
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
