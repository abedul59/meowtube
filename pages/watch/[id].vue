<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    
    <div class="flex items-center gap-4 mb-6">
      <button @click="$router.back()" class="inline-flex items-center text-gray-400 hover:text-white transition-colors font-bold bg-gray-800 px-4 py-2 rounded-lg shadow">
        ⬅ 返回上一頁
      </button>
      <NuxtLink to="/" class="inline-flex items-center text-gray-500 hover:text-gray-300 transition-colors text-sm">
        🏠 回劇院大廳
      </NuxtLink>
    </div>

    <div v-if="pending" class="flex justify-center items-center h-64 text-gray-400">
      <p class="text-xl animate-pulse">🎬 載入影片資訊中...</p>
    </div>
    <div v-else-if="error || !movie" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center border border-red-800">
      找不到這部電影。
    </div>
    <div v-else class="space-y-6 animate-fade-in">
      <h1 class="text-3xl font-bold text-white">{{ movie.title }}</h1>
      
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
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${movie.tg_message_id}`" type="video/mp4" />
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-xl font-semibold text-gray-200">劇情簡介</h2>
          <span v-if="isSyncing" class="text-xs text-teal-400 flex items-center gap-1">
            <span class="w-2 h-2 bg-teal-400 rounded-full animate-ping"></span> 雲端同步中...
          </span>
        </div>
        <p class="text-gray-400 leading-relaxed whitespace-pre-wrap">{{ movie.description || '無簡介' }}</p>
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

// 同時抓取「電影資訊」與「雲端播放進度」
const { data: movie, pending, error } = await useAsyncData(`movie-${route.params.id}`, async () => {
  const { data: movieData, error: movieError } = await supabase.from('movies').select('*').eq('id', route.params.id).single()
  if (movieError) throw movieError

  // 嘗試抓取雲端進度
  const { data: progressData } = await supabase.from('playback_progress').select('current_time').eq('video_id', route.params.id).single()

  return {
    ...movieData,
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
  
  setTimeout(() => { isSyncing.value = false }, 1000) // 顯示同步提示 1 秒鐘
}

// 影片載入完成後，自動跳轉到雲端記憶的時間
const resumeProgress = () => {
  if (videoPlayer.value && movie.value?.savedTime > 0) {
    videoPlayer.value.currentTime = movie.value.savedTime
  }
}

// 掛載生命週期：設定自動備份與離開網頁備份
onMounted(() => {
  // 每 10 秒自動備份一次進度到雲端
  syncInterval = setInterval(() => {
    if (videoPlayer.value && !videoPlayer.value.paused) {
      syncProgressToDB()
    }
  }, 10000)

  // 關閉視窗或重新整理前，最後同步一次
  window.addEventListener('beforeunload', syncProgressToDB)
})

// 離開此頁面前，清除計時器並強制同步
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
