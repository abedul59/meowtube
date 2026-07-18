<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
      <!-- 頂部導覽列 -->
      <div class="flex justify-between items-center mb-8">
        <button @click="$router.push('/')" class="text-gray-400 hover:text-white transition font-bold bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 shadow-sm">
          🏠 返回首頁
        </button>
        <!-- 🔒 私密後台按鈕 -->
        <button @click="goToPrivateZone" class="bg-gray-800 border border-gray-700 hover:border-red-500 px-4 py-2 rounded text-gray-400 hover:text-red-500 transition font-bold">
          🔞 前往私密後台
        </button>
      </div>

      <div class="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
        <div class="p-6 border-b border-gray-700 bg-gray-800/80">
          <h2 class="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎬 上傳影片至 Meowtube</span>
          </h2>
        </div>

        <form @submit.prevent="handleUpload" class="p-6 space-y-6">
          
          <!-- 💡 私密影片開關 -->
          <div class="bg-gray-900 p-4 rounded-lg border border-gray-700 transition-colors" :class="{ 'border-red-500/50 bg-red-900/10': uploadForm.isSecret }">
            <label class="flex items-center cursor-pointer gap-3">
              <input 
                type="checkbox" 
                v-model="uploadForm.isSecret"
                class="w-6 h-6 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
              >
              <span class="text-white font-bold text-lg" :class="{ 'text-red-400': uploadForm.isSecret }">
                🔞 標記為私密影片 (上傳至私密 Telegram 群組與獨立資料表)
              </span>
            </label>
          </div>

          <!-- 影片類型選擇 -->
          <div class="grid grid-cols-2 gap-4">
            <label :class="['cursor-pointer border p-4 rounded-lg text-center font-bold transition', uploadForm.type === 'movie' ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300' : 'border-gray-700 hover:bg-gray-700 text-gray-400']">
              <input type="radio" v-model="uploadForm.type" value="movie" class="hidden">
              獨立電影
            </label>
            <label :class="['cursor-pointer border p-4 rounded-lg text-center font-bold transition', uploadForm.type === 'episode' ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300' : 'border-gray-700 hover:bg-gray-700 text-gray-400']">
              <input type="radio" v-model="uploadForm.type" value="episode" class="hidden">
              影集單集
            </label>
          </div>

          <!-- 檔案上傳 -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">選擇影片檔案 (MP4)</label>
            <input type="file" accept="video/mp4,video/x-m4v,video/*" @change="onFileChange" required class="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition" />
          </div>

          <!-- 基本資訊 -->
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">標題</label>
            <input type="text" v-model="uploadForm.title" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">描述 (選填)</label>
            <textarea v-model="uploadForm.description" rows="3" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"></textarea>
          </div>

          <!-- 影集專屬資訊 -->
          <div v-if="uploadForm.type === 'episode'" class="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-2">選擇所屬影集</label>
              <select v-model="uploadForm.seriesId" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500">
                <option value="" disabled>請選擇影集...</option>
                <option v-for="s in currentSeriesList" :key="s.id" :value="s.id">{{ s.title }}</option>
              </select>
              <p v-if="uploadForm.isSecret" class="text-xs text-red-400 mt-1">⚠️ 提示：目前正在讀取 `secret_series` 資料表。</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">季數 (Season)</label>
                <input type="number" v-model="uploadForm.season" min="1" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-2">集數 (Episode)</label>
                <input type="number" v-model="uploadForm.episode" min="1" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
              </div>
            </div>
          </div>

          <!-- 提交按鈕 -->
          <button type="submit" :disabled="isUploading" :class="[
            'w-full font-bold py-3 px-4 rounded-lg transition shadow flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
            uploadForm.isSecret ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          ]">
            <span v-if="isUploading" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ isUploading ? '上傳與處理中，請勿關閉視窗...' : (uploadForm.isSecret ? '🔞 確認上傳私密影片' : '開始上傳影片') }}
          </button>
          
          <p v-if="uploadStatus" :class="['text-center font-bold mt-4', statusColor]">{{ uploadStatus }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const supabase = useSupabaseClient()

// 從工具函式獲取自動分流的 API 網址 (如果您尚未建立 utils/apiManager.js，請直接將函數寫在這裡)
const getActiveApiUrl = () => {
  const today = new Date().getDate();
  if (today <= 15) return 'https://meowtube-api-lawxstudent168.onrender.com';
  return 'https://meowtube-api-10n0.onrender.com';
}

const API_BASE_URL = getActiveApiUrl()

const isUploading = ref(false)
const uploadStatus = ref('')
const statusType = ref('info')

const publicSeriesList = ref([])
const secretSeriesList = ref([])

const uploadForm = ref({
  type: 'movie',
  isSecret: false, // 預設為公開影片
  file: null,
  title: '',
  description: '',
  seriesId: '',
  season: 1,
  episode: 1
})

const statusColor = computed(() => {
  if (statusType.value === 'error') return 'text-red-400'
  if (statusType.value === 'success') return 'text-green-400'
  return 'text-indigo-400'
})

// 根據是否勾選私密，動態切換顯示的影集清單
const currentSeriesList = computed(() => {
  return uploadForm.value.isSecret ? secretSeriesList.value : publicSeriesList.value
})

// 前端簡易防護：前往私密後台
const goToPrivateZone = () => {
  const pwd = prompt('🔒 這是私密區域，請輸入管理員密碼：')
  if (pwd === 'pornporn') {
    // 寫入 sessionStorage，關閉瀏覽器即失效
    sessionStorage.setItem('secret_auth', 'granted')
    router.push('/secret-zone') 
  } else if (pwd !== null) {
    alert('❌ 密碼錯誤，拒絕存取。')
  }
}

// 載入公開與私密影集清單
const fetchSeries = async () => {
  // 讀取公開影集
  const { data: publicData } = await supabase.from('series').select('id, title').order('created_at', { ascending: false })
  if (publicData) publicSeriesList.value = publicData

  // 讀取私密影集 (假設您已經在 Supabase 建立了 secret_series 資料表)
  const { data: secretData } = await supabase.from('secret_series').select('id, title').order('created_at', { ascending: false })
  if (secretData) secretSeriesList.value = secretData
}

onMounted(() => {
  fetchSeries()
})

// 當切換公開/私密時，清空已經選取的影集 ID，避免資料錯亂
watch(() => uploadForm.value.isSecret, () => {
  uploadForm.value.seriesId = ''
})

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    uploadForm.value.file = file
    // 自動帶入檔名作為預設標題
    if (!uploadForm.value.title) {
      uploadForm.value.title = file.name.replace(/\.[^/.]+$/, "")
    }
  }
}

const handleUpload = async () => {
  if (!uploadForm.value.file) {
    uploadStatus.value = '請選擇影片檔案'
    statusType.value = 'error'
    return
  }

  if (uploadForm.value.type === 'episode' && !uploadForm.value.seriesId) {
    uploadStatus.value = '請選擇所屬影集'
    statusType.value = 'error'
    return
  }

  try {
    isUploading.value = true
    uploadStatus.value = '正在上傳至 Telegram (請保持網頁開啟)...'
    statusType.value = 'info'

    const formData = new FormData()
    formData.append('file', uploadForm.value.file)
    formData.append('title', uploadForm.value.title)
    
    // 💡 關鍵：將私密狀態傳給 Python API
    formData.append('is_secret', uploadForm.value.isSecret) 

    // 1. 上傳至 Python API
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.detail || 'API 上傳失敗')
    }

    const result = await response.json()
    const tgMessageId = result.tg_message_id

    uploadStatus.value = 'Telegram 上傳成功，正在寫入資料庫...'

    // 2. 決定要寫入哪一張 Supabase 資料表
    const targetMoviesTable = uploadForm.value.isSecret ? 'secret_movies' : 'movies'
    const targetEpisodesTable = uploadForm.value.isSecret ? 'secret_episodes' : 'episodes'

    if (uploadForm.value.type === 'movie') {
      const { error: dbError } = await supabase.from(targetMoviesTable).insert({
        title: uploadForm.value.title,
        description: uploadForm.value.description,
        tg_message_id: tgMessageId.toString()
      })
      if (dbError) throw dbError
    } else {
      const { error: dbError } = await supabase.from(targetEpisodesTable).insert({
        series_id: uploadForm.value.seriesId,
        season: uploadForm.value.season,
        episode: uploadForm.value.episode,
        title: uploadForm.value.title,
        tg_message_id: tgMessageId.toString()
      })
      if (dbError) throw dbError
    }

    uploadStatus.value = uploadForm.value.isSecret ? '🔞 私密影片發布成功！' : '✅ 影片發布成功！'
    statusType.value = 'success'
    
    // 重置表單 (保留原本選擇的 type 和 isSecret 狀態)
    const currentType = uploadForm.value.type
    const currentSecret = uploadForm.value.isSecret
    uploadForm.value = {
      type: currentType,
      isSecret: currentSecret,
      file: null,
      title: '',
      description: '',
      seriesId: '',
      season: 1,
      episode: 1
    }
    document.querySelector('input[type="file"]').value = ''

  } catch (error) {
    console.error('Upload Error:', error)
    uploadStatus.value = `❌ 錯誤: ${error.message}`
    statusType.value = 'error'
  } finally {
    isUploading.value = false
  }
}
</script>
