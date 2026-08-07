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
          v-if="videoUrl"
          :key="episodeData.id"
          ref="videoPlayer"
          controls preload="none"
          autoplay
          crossorigin="anonymous"
          class="w-full h-full outline-none"
          controlsList="nodownload"
          @loadedmetadata="resumeProgress"
          @timeupdate="onTimeUpdate"
        >
          <!-- 💡 這裡使用的是您原本就寫對的帶有 ?is_secret=true 的網址 -->
          <source :src="videoUrl" type="video/mp4" />
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
const config = useRuntimeConfig()

const episodeId = route.params.id

const pending = ref(true)
const error = ref(null)
const episodeData = ref(null)
const videoUrl = ref('')
const videoPlayer = ref(null)
const savedTime = ref(0)
const actionMessage = ref('')

// 💡 修正 2：改用動態取得 API 網址，與公開頁面標準統一
const getActiveApiUrl = () => {
  return config.public.apiBase || 'https://meowtube-api-10n0.onrender.com'
}

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
    
    // 2. 組裝影片網址，確保帶有 is_secret 參數
    if (data && data.tg_message_id) {
      videoUrl.value = `${getActiveApiUrl()}/stream/${data.tg_message_id}?is_secret=true`
    } else {
      throw new Error("找不到對應的 Telegram 影片 ID")
    }

    // 3. 雲端優先讀取觀看進度
    const { data: progressData } = await supabase
      .from('playback_progress')
      .select('current_time')
      .eq('video_id', episodeId)
      .maybeSingle()

    if (progressData && progressData.current_time > 0) {
      savedTime.value = progressData.current_time
    } else {
      const progressKey = `progress_secret_ep_${episodeId}`
      const localProgress = localStorage.getItem(progressKey)
      if (localProgress) savedTime.value = parseFloat(localProgress)
    }

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

const showMessage = (msg) => {
  actionMessage.value = msg
  setTimeout(() => { actionMessage.value = '' }, 3000)
}

const manualSaveProgress = async () => {
  if (videoPlayer.value && episodeData.value) {
    const currentTime = videoPlayer.value.currentTime
    
    // 寫入本機
    const progressKey = `progress_secret_ep_${episodeData.value.id}`
    localStorage.setItem(progressKey, currentTime)
    savedTime.value = currentTime

    // 寫入雲端 (Upsert)
    const { error: upsertError } = await supabase
      .from('playback_progress')
      .upsert({ 
        video_id: episodeData.value.id, 
        current_time: currentTime,
        updated_at: new Date().toISOString()
      }, { onConflict: 'video_id' })

    if (upsertError) {
      console.error(upsertError)
      showMessage('❌ 雲端同步失敗，僅存於本機')
    } else {
      showMessage('☁️ ✅ 觀看進度已手動儲存至雲端！')
    }
  }
}

const clearProgress = async () => {
  if (episodeData.value) {
    // 清除本機
    const progressKey = `progress_secret_ep_${episodeData.value.id}`
    localStorage.removeItem(progressKey)
    savedTime.value = 0

    // 清除雲端
    const { error: deleteError } = await supabase
      .from('playback_progress')
      .delete()
      .eq('video_id', episodeData.value.id)

    if (deleteError) {
      console.error(deleteError)
      showMessage('❌ 雲端清除失敗')
    } else {
      showMessage('🗑️ 雲端與本機的觀看紀錄已成功清除！')
    }
  }
}

const resumeProgress = () => {
  if (videoPlayer.value && savedTime.value > 0) {
    videoPlayer.value.currentTime = savedTime.value
  }
}

const onTimeUpdate = () => {
  if (videoPlayer.value && episodeData.value && Math.floor(videoPlayer.value.currentTime) % 5 === 0) {
    const progressKey = `progress_secret_ep_${episodeData.value.id}`
    localStorage.setItem(progressKey, videoPlayer.value.currentTime)
  }
}
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
</style>
