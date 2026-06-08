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

    <div v-if="pending" class="flex justify-center items-center h-64 text-gray-400"><p class="text-xl animate-pulse">載入中...</p></div>
    <div v-else-if="error || !episode" class="bg-red-900/20 text-red-500 p-6 rounded-lg text-center">找不到這集檔案。</div>
    
    <div v-else class="space-y-6 animate-fade-in">
      <div>
        <h2 class="text-indigo-400 font-bold mb-1">{{ episode.series.title }}</h2>
        <h1 class="text-2xl md:text-3xl font-bold text-white">
          第 {{ episode.season }} 季 第 {{ episode.episode }} 集
          <span v-if="episode.title" class="text-gray-400 ml-2 text-xl">- {{ episode.title }}</span>
        </h1>
      </div>
      
      <div v-if="episode.series.is_audio" class="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl flex flex-col items-center">
        <div class="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-gray-700 shadow-2xl mb-8 relative" :class="{'animate-spin-slow': isPlaying}">
          <img :src="episode.series.cover_url || '/default-cover.jpg'" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-black/20 rounded-full"></div>
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-900 rounded-full border-4 border-gray-800"></div>
        </div>
        
        <audio 
          ref="mediaPlayer"
          controls 
          autoplay 
          class="w-full max-w-md outline-none"
          @play="isPlaying = true; setupMediaSession()"
          @pause="isPlaying = false; syncProgressToDB()"
          @canplay="resumeProgress"
          @ended="playNextEpisode"
        >
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${episode.tg_message_id}`" type="audio/mpeg" />
        </audio>

        <p v-if="nextEpisodeId" class="text-gray-400 text-sm mt-4">💡 播完將自動為您播放下一集</p>
      </div>

      <div v-else class="relative pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
        <video 
          ref="mediaPlayer" controls autoplay class="absolute top-0 left-0 w-full h-full outline-none" controlsList="nodownload"
          @play="isPlaying = true" @pause="isPlaying = false; syncProgressToDB()" @canplay="resumeProgress" @ended="playNextEpisode"
        >
          <source :src="`https://lawxstudents168-meowtube-api.hf.space/stream/${episode.tg_message_id}`" type="video/mp4" />
        </video>
      </div>

      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold text-gray-200">正在播放：{{ episode.series.title }}</h2>
          <span v-if="isSyncing" class="text-xs text-teal-400 flex items-center gap-1"><span class="w-2 h-2 bg-teal-400 rounded-full animate-ping"></span> 同步中...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const mediaPlayer = ref(null)
const isPlaying = ref(false)
const isSyncing = ref(false)
const hasResumed = ref(false)
const nextEpisodeId = ref(null) // 儲存下一集的 ID
let syncInterval = null

// 抓取單集資訊、進度，以及計算下一集
const { data: episode, pending, error } = await useAsyncData(`ep-${route.params.id}`, async () => {
  const { data: epData } = await supabase.from('episodes').select('*, series(*)').eq('id', route.params.id).single()
  const { data: progressData } = await supabase.from('playback_progress').select('current_time').eq('video_id', route.params.id).maybeSingle()
  
  // 💡 自動抓取「同影集、排序在後面」的所有集數，找出下一集！
  if (epData) {
    const { data: allEps } = await supabase.from('episodes')
      .select('id, season, episode')
      .eq('series_id', epData.series_id)
      .order('season').order('episode')
    
    if (allEps) {
      const currentIndex = allEps.findIndex(e => e.id === epData.id)
      if (currentIndex !== -1 && currentIndex + 1 < allEps.length) {
        nextEpisodeId.value = allEps[currentIndex + 1].id
      }
    }
  }

  return { ...epData, savedTime: progressData?.current_time || 0 }
})

// ==========================================
// 📱 手機鎖屏背景播放 API (Media Session)
// ==========================================
const setupMediaSession = () => {
  if ('mediaSession' in navigator && episode.value) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `第 ${episode.value.episode} 集 ${episode.value.title ? '- ' + episode.value.title : ''}`,
      artist: episode.value.series.title,
      album: 'Meowtube 雲端劇院',
      artwork: [
        { src: episode.value.series.cover_url || '/default-cover.jpg', sizes: '512x512', type: 'image/jpeg' }
      ]
    })

    // 鎖屏上的「下一首」按鈕功能
    if (nextEpisodeId.value) {
      navigator.mediaSession.setActionHandler('nexttrack', playNextEpisode)
    } else {
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
  }
}

// 自動跳轉下一集邏輯
const playNextEpisode = () => {
  if (nextEpisodeId.value) {
    // 透過 Nuxt router 跳轉到下一集網址，網頁會自動無縫載入並播放
    router.push(`/watch/ep/${nextEpisodeId.value}`)
  }
}

// 雲端進度記憶功能
const syncProgressToDB = async () => {
  if (!mediaPlayer.value || mediaPlayer.value.currentTime <= 2) return
  isSyncing.value = true
  try {
    await supabase.from('playback_progress').upsert({
      video_id: route.params.id,
      "current_time": mediaPlayer.value.currentTime,
      updated_at: new Date().toISOString()
    }, { onConflict: 'video_id' })
  } catch (err) {} finally { setTimeout(() => { isSyncing.value = false }, 1000) }
}

const resumeProgress = () => {
  if (!hasResumed.value && mediaPlayer.value && episode.value?.savedTime > 2) {
    mediaPlayer.value.currentTime = episode.value.savedTime
    hasResumed.value = true
  }
}

onMounted(() => {
  syncInterval = setInterval(() => { if (mediaPlayer.value && !mediaPlayer.value.paused) syncProgressToDB() }, 10000)
  window.addEventListener('beforeunload', syncProgressToDB)
})

onBeforeUnmount(() => {
  clearInterval(syncInterval)
  window.removeEventListener('beforeunload', syncProgressToDB)
  syncProgressToDB()
})
</script>

<style scoped>
.animate-spin-slow { animation: spin 10s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
