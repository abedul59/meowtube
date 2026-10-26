<template>
  <div class="p-4 md:p-8 text-white min-h-screen bg-black">
    <div v-if="pending" class="flex justify-center items-center h-64">
      <div class="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <span class="ml-4 text-xl text-purple-400 font-bold">⏳ 正在載入私密影片...</span>
    </div>
    
    <div v-else-if="error" class="text-red-500 text-xl font-bold bg-gray-900 p-6 rounded-lg border border-red-800">
      ❌ 無法載入影片: {{ error.message }}
    </div>
    
    <div v-else class="max-w-5xl mx-auto animate-fade-in">
      
      <!-- 返回按鈕 -->
      <button 
        @click="router.back()" 
        class="mb-6 inline-flex items-center text-gray-400 hover:text-white transition font-bold bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm"
      >
        ⬅ 返回影集列表
      </button>

      <!-- 影片標題 -->
      <h1 class="text-2xl md:text-3xl font-bold mb-6 text-purple-400">
        第 {{ episodeData?.episode }} 集：{{ episodeData?.title || '未命名私密影片' }}
      </h1>

      <!-- 影片播放器 -->
      <div class="aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800 mb-6">
        <!-- 💡 修正 1：補上 preload="none" 與 :key 綁定，防止幽靈連線與重置問題 -->
        <video 
          v-if="episodeData?.tg_message_id"
          :key="episodeData.id"
          :src="`${apiBaseUrl}/stream/${episodeData.tg_message_id}?is_secret=true`"
          ref="videoPlayer"
          controls preload="none"
          autoplay
          crossorigin="anonymous"
          class="w-full h-full outline-none"
          controlsList="nodownload"
          @loadedmetadata="handleLoadedMetadata"
          @error="handleVideoError"
          @timeupdate="onTimeUpdate"
          @pause="onPause"
          @play="onPlay"
          @ended="onEnded"
        >
          您的瀏覽器不支援 HTML5 影片播放。
        </video>
      </div>

      <!-- 💡 升級功能：觀看紀錄控制面板 (專為私密影片加入) -->
      <div class="flex flex-wrap items-center gap-3 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
        <button @click="manualSaveProgress" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded shadow transition">
          💾 記憶觀看時間
        </button>
        <button @click="clearProgress" class="px-4 py-2 bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-white text-sm font-bold rounded shadow transition">
          🗑️ 消除記憶紀錄
        </button>
        <span v-if="actionMessage" class="text-green-400 text-sm font-bold animate-pulse">
          {{ actionMessage }}
        </span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const episodeId = route.params.id

const pending = ref(true)
const error = ref(null)
const episodeData = ref(null)
const videoPlayer = ref(null)
const actionMessage = ref('')

const showMessage = (msg) => {
  actionMessage.value = msg
  setTimeout(() => { actionMessage.value = '' }, 3000)
}

const {
  savedTime,
  loadProgress,
  resumeProgress,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
  saveProgress,
  clearProgress: clearStoredProgress
} = usePlaybackProgress({ supabase, videoPlayer, onMessage: showMessage })

const {
  apiBaseUrl,
  handleLoadedMetadata,
  handleVideoError
} = useVideoApiFailover({ videoPlayer, resumeProgress, onMessage: showMessage })

onMounted(async () => {
  try {
    pending.value = true
    
    // 1. 取得私密影片資料
    const { data, error: fetchError } = await supabase
      .from('secret_episodes')
      .select('*')
      .eq('id', episodeId)
      .single()

    if (fetchError) throw fetchError
    episodeData.value = data
    
    // 2. 確認有可供三個 API 線路使用的 Telegram 影片 ID
    if (!data?.tg_message_id) {
      throw new Error("找不到對應的 Telegram 影片 ID")
    }

    await loadProgress(episodeId, `progress_secret_ep_${episodeId}`)

  } catch (err) {
    console.error('影片載入失敗:', err)
    error.value = err
  } finally {
    pending.value = false
  }
})

// ==========================================
// 進度控制邏輯
// ==========================================

const manualSaveProgress = async () => {
  await saveProgress({ force: true, notify: true })
}

const clearProgress = async () => {
  await clearStoredProgress()
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
</style>
