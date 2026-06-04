<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-8 text-white">⚙️ 劇院管理後台</h1>

    <!-- 模式切換標籤 -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button 
        @click="activeTab = 'movie'"
        :class="activeTab === 'movie' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'"
        class="px-6 py-3 rounded-t-lg font-bold transition-colors flex-1 sm:flex-none"
      >
        🎬 上傳單部電影
      </button>
      <button 
        @click="activeTab = 'series'"
        :class="activeTab === 'series' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'"
        class="px-6 py-3 rounded-t-lg font-bold transition-colors flex-1 sm:flex-none"
      >
        🆕 建立新影集
      </button>
      <button 
        @click="activeTab = 'episode'"
        :class="activeTab === 'episode' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'"
        class="px-6 py-3 rounded-t-lg font-bold transition-colors flex-1 sm:flex-none"
      >
        📺 上傳影集單集
      </button>
    </div>

    <div class="bg-gray-800 p-6 md:p-8 rounded-b-xl rounded-tr-xl border border-gray-700 shadow-xl">
      
      <!-- ========================================== -->
      <!-- 模式 1：上傳單部電影 -->
      <!-- ========================================== -->
      <form v-if="activeTab === 'movie'" @submit.prevent="handleUploadMovie" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-4 text-red-500 border-b border-gray-700 pb-2">上傳獨立電影</h2>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">選擇影片檔 (MP4)</label>
          <input type="file" @change="e => file = e.target.files[0]" accept="video/*" required class="file-input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">電影名稱</label>
          <input type="text" v-model="movieForm.title" required class="form-input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">劇情簡介</label>
          <textarea v-model="movieForm.description" rows="3" class="form-input"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">海報圖片網址 (選填)</label>
          <input type="url" v-model="movieForm.coverUrl" class="form-input" />
        </div>
        <!-- 💡 補回的 Topic ID 欄位 -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID (若無可留空)</label>
          <input type="number" v-model="movieForm.topicId" placeholder="例如：123" class="form-input" />
        </div>

        <button type="submit" :disabled="isUploading" class="submit-btn bg-red-600 hover:bg-red-700">
          <span v-if="isUploading" class="spinner"></span>
          {{ isUploading ? uploadStatus : '🚀 確認上傳並發布電影' }}
        </button>
      </form>

      <!-- ========================================== -->
      <!-- 模式 2：建立新影集 -->
      <!-- ========================================== -->
      <form v-if="activeTab === 'series'" @submit.prevent="handleCreateSeries" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-4 text-indigo-400 border-b border-gray-700 pb-2">建立新影集 (免上傳檔案)</h2>
        <div class="text-sm text-gray-400 mb-4">💡 提示：請先在此建立影集基本資料，建立完成後，再切換到「上傳影集單集」去上傳影片檔。</div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">影集名稱</label>
          <input type="text" v-model="seriesForm.title" required placeholder="例如：絕命毒師" class="form-input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">劇情簡介</label>
          <textarea v-model="seriesForm.description" rows="3" class="form-input"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">影集海報網址</label>
          <input type="url" v-model="seriesForm.coverUrl" class="form-input" />
        </div>

        <button type="submit" :disabled="isUploading" class="submit-btn bg-indigo-600 hover:bg-indigo-700">
          <span v-if="isUploading" class="spinner"></span>
          {{ isUploading ? '建立中...' : '✨ 建立新影集' }}
        </button>
      </form>

      <!-- ========================================== -->
      <!-- 模式 3：上傳影集單集 -->
      <!-- ========================================== -->
      <form v-if="activeTab === 'episode'" @submit.prevent="handleUploadEpisode" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-4 text-indigo-400 border-b border-gray-700 pb-2">上傳影集單集</h2>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">選擇要上傳的影集</label>
          <select v-model="episodeForm.seriesId" required class="form-input">
            <option value="" disabled>請選擇影集...</option>
            <option v-for="s in seriesList" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
          <div v-if="seriesList.length === 0" class="text-red-400 text-sm mt-1">目前沒有任何影集，請先「建立新影集」！</div>
        </div>

        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">第幾季？(Season)</label>
            <input type="number" v-model="episodeForm.season" required min="1" placeholder="例: 1" class="form-input" />
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">第幾集？(Episode)</label>
            <input type="number" v-model="episodeForm.episode" required min="1" placeholder="例: 15" class="form-input" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">單集名稱 (選填)</label>
          <input type="text" v-model="episodeForm.title" placeholder="例: 大結局" class="form-input" />
        </div>

        <!-- 💡 補回的 Topic ID 欄位 -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID (若無可留空)</label>
          <input type="number" v-model="episodeForm.topicId" placeholder="例如：123" class="form-input" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">選擇影片檔 (MP4)</label>
          <input type="file" @change="e => file = e.target.files[0]" accept="video/*" required class="file-input" />
        </div>

        <button type="submit" :disabled="isUploading || seriesList.length === 0" class="submit-btn bg-indigo-600 hover:bg-indigo-700">
          <span v-if="isUploading" class="spinner"></span>
          {{ isUploading ? uploadStatus : '🚀 確認上傳集數' }}
        </button>
      </form>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const supabase = useSupabaseClient()
const API_BASE_URL = 'https://lawxstudents168-meowtube-api.hf.space'

const activeTab = ref('movie')
const file = ref(null)
const isUploading = ref(false)
const uploadStatus = ref('')
const seriesList = ref([]) // 儲存資料庫中已建立的影集清單

// 表單資料綁定 (補上 topicId)
const movieForm = reactive({ title: '', description: '', coverUrl: '', topicId: '' })
const seriesForm = reactive({ title: '', description: '', coverUrl: '' })
const episodeForm = reactive({ seriesId: '', season: 1, episode: 1, title: '', topicId: '' })

// 載入影集清單 (提供給下拉選單使用)
const fetchSeries = async () => {
  const { data } = await supabase.from('series').select('id, title').order('created_at', { ascending: false })
  if (data) seriesList.value = data
}

onMounted(() => {
  fetchSeries()
})

// 通用上傳檔案至 Hugging Face 函數 (新增接收 topicId)
const uploadToHF = async (captionText, topicId) => {
  uploadStatus.value = '正在上傳至 Hugging Face (轉發至 TG)...'
  const formData = new FormData()
  formData.append('file', file.value)
  formData.append('caption', captionText)
  
  // 💡 如果使用者有填寫 Topic ID，就打包進去傳給 API
  if (topicId) {
    formData.append('topic_id', parseInt(topicId))
  }

  const uploadRes = await fetch(`${API_BASE_URL}/upload/`, { method: 'POST', body: formData })
  if (!uploadRes.ok) throw new Error('伺服器回應錯誤')
  const uploadData = await uploadRes.json()
  if (!uploadData.success) throw new Error(`上傳失敗: ${uploadData.detail}`)
  
  return uploadData.message_id
}

// 🎬 處理：上傳單部電影
const handleUploadMovie = async () => {
  if (!file.value) return alert('請先選擇影片檔案！')
  try {
    isUploading.value = true
    const messageId = await uploadToHF(`🎬 ${movieForm.title}\n${movieForm.description}`, movieForm.topicId)

    uploadStatus.value = '檔案已上傳！正在寫入資料庫...'
    const { error } = await supabase.from('movies').insert({
      title: movieForm.title,
      description: movieForm.description,
      cover_url: movieForm.coverUrl,
      // 如果你的 movies 資料表裡有 topic_id 欄位，這行也能幫你存進去
      topic_id: movieForm.topicId ? parseInt(movieForm.topicId) : null,
      tg_message_id: messageId
    })
    if (error) throw error

    alert('✅ 電影上傳並發布成功！')
    // 清空表單
    movieForm.title = ''; movieForm.description = ''; movieForm.coverUrl = ''; movieForm.topicId = ''; file.value = null
    document.querySelector('input[type="file"]').value = ''
  } catch (error) { alert(`❌ 發生錯誤：\n${error.message}`) } 
  finally { isUploading.value = false }
}

// 🆕 處理：建立新影集 (免上傳影片)
const handleCreateSeries = async () => {
  try {
    isUploading.value = true
    const { error } = await supabase.from('series').insert({
      title: seriesForm.title,
      description: seriesForm.description,
      cover_url: seriesForm.coverUrl
    })
    if (error) throw error

    alert('✨ 影集建立成功！請切換到「上傳影集單集」來上傳影片。')
    seriesForm.title = ''; seriesForm.description = ''; seriesForm.coverUrl = ''
    await fetchSeries() // 更新下拉選單
    activeTab.value = 'episode' // 自動切換到上傳單集頁籤
  } catch (error) { alert(`❌ 發生錯誤：\n${error.message}`) } 
  finally { isUploading.value = false }
}

// 📺 處理：上傳影集單集
const handleUploadEpisode = async () => {
  if (!file.value) return alert('請先選擇影片檔案！')
  if (!episodeForm.seriesId) return alert('請選擇要上傳的影集！')

  try {
    isUploading.value = true
    const selectedSeries = seriesList.value.find(s => s.id === episodeForm.seriesId)
    const captionText = `📺 ${selectedSeries.title} - S${episodeForm.season}E${episodeForm.episode} ${episodeForm.title}`
    
    // 傳入 caption 與 topicId
    const messageId = await uploadToHF(captionText, episodeForm.topicId)

    uploadStatus.value = '檔案已上傳！正在寫入資料庫...'
    const { error } = await supabase.from('episodes').insert({
      series_id: episodeForm.seriesId,
      season: episodeForm.season,
      episode: episodeForm.episode,
      title: episodeForm.title,
      tg_message_id: messageId
    })
    if (error) throw error

    alert('✅ 影集單集上傳成功！')
    
    // 💡 聰明的防呆設計：集數自動 +1，但「保留」 Topic ID 和季數，方便你連傳下一集！
    episodeForm.episode++ 
    episodeForm.title = ''; file.value = null
    document.querySelector('input[type="file"]').value = ''
  } catch (error) { alert(`❌ 發生錯誤：\n${error.message}`) } 
  finally { isUploading.value = false }
}
</script>

<style scoped>
.form-input {
  @apply w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-indigo-500 transition-colors;
}
.file-input {
  @apply w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 focus:outline-none cursor-pointer;
}
.submit-btn {
  @apply w-full text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center gap-2;
}
.spinner {
  @apply w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin;
}
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>