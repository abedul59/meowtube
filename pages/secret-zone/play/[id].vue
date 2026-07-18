<template>
  <div class="p-4 md:p-8 text-white min-h-screen bg-black">
    <div v-if="pending" class="text-xl text-blue-400">⏳ 正在載入私密影片...</div>
    <div v-else-if="error" class="text-red-500 text-xl">❌ 無法載入影片: {{ error.message }}</div>
    <div v-else class="max-w-5xl mx-auto">
      
      <!-- 返回按鈕 -->
      <button 
        @click="router.back()" 
        class="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded text-sm text-gray-300"
      >
        ← 返回影集列表
      </button>

      <!-- 影片標題 -->
      <h1 class="text-2xl md:text-3xl font-bold mb-6 text-purple-400">
        第 {{ episodeData?.episode }} 集：{{ episodeData?.title }}
      </h1>

      <!-- 影片播放器 -->
      <div class="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl border border-gray-800">
        <video 
          v-if="videoUrl"
          controls 
          autoplay
          class="w-full h-full outline-none"
          :src="videoUrl"
        >
          您的瀏覽器不支援 HTML5 影片播放。
        </video>
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

// 從網址取得影片的 UUID
const episodeId = route.params.id

const pending = ref(true)
const error = ref(null)
const episodeData = ref(null)
const videoUrl = ref('')

// ⚠️ 請確認這裡的 API 網址是您目前正確運作中的 Render 網址！
// 根據先前的對話，今天是 18 號，應該是使用 10n0 這個分流
const apiBaseUrl = 'https://meowtube-api-10n0.onrender.com' 

onMounted(async () => {
  try {
    // 透過 UUID 去 secret_episodes 查詢 Telegram Message ID
    const { data, error: fetchError } = await supabase
      .from('secret_episodes')
      .select('*')
      .eq('id', episodeId)
      .single()

    if (fetchError) throw fetchError
    
    episodeData.value = data
    
    // 組裝影片串流網址：API_URL/stream/{tg_message_id}
    if (data && data.tg_message_id) {
      videoUrl.value = `${apiBaseUrl}/stream/${data.tg_message_id}`
    } else {
      throw new Error("找不到對應的 Telegram 影片 ID")
    }

  } catch (err) {
    console.error('影片載入失敗:', err)
    error.value = err
  } finally {
    pending.value = false
  }
})
</script>
