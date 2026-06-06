<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <button @click="$router.back()" class="mb-6 inline-flex items-center text-gray-300 hover:text-white transition-colors font-bold bg-gray-800 px-4 py-2 rounded-lg shadow border border-gray-700">
      ⬅ 返回上一頁
    </button>
    <h1 class="text-3xl font-bold mb-8 text-white">⚙️ 劇院管理後台</h1>

    <div class="flex flex-wrap gap-2 mb-6">
      <button @click="activeTab = 'movie'" :class="activeTab === 'movie' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'" class="px-5 py-3 rounded-t-xl font-bold transition-colors flex-1 sm:flex-none">
        🎬 單部電影
      </button>
      <button @click="activeTab = 'series'" :class="activeTab === 'series' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'" class="px-5 py-3 rounded-t-xl font-bold transition-colors flex-1 sm:flex-none">
        🆕 新建影集
      </button>
      <button @click="activeTab = 'episode'" :class="activeTab === 'episode' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'" class="px-5 py-3 rounded-t-xl font-bold transition-colors flex-1 sm:flex-none">
        📺 單集上傳
      </button>
      <button @click="activeTab = 'batch'" :class="activeTab === 'batch' ? 'bg-teal-600 text-white shadow-lg' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'" class="px-5 py-3 rounded-t-xl font-bold transition-colors flex-1 sm:flex-none">
        📚 批次上傳整季
      </button>
    </div>

    <div class="bg-gray-800 p-6 md:p-8 rounded-b-xl rounded-tr-xl border border-gray-700 shadow-xl relative overflow-hidden">
      
      <form v-if="activeTab === 'movie'" @submit.prevent="handleUploadMovie" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-4 text-red-500 border-b border-gray-700 pb-2">上傳獨立電影</h2>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">選擇影片檔 (MP4)</label><input type="file" @change="e => file = e.target.files[0]" accept="video/*" required class="file-input" /></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">電影名稱</label><input type="text" v-model="movieForm.title" required class="form-input" /></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">劇情簡介</label><textarea v-model="movieForm.description" rows="3" class="form-input"></textarea></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">海報圖片網址 (選填)</label><input type="url" v-model="movieForm.coverUrl" class="form-input" /></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID (若無可留空)</label><input type="number" v-model="movieForm.topicId" class="form-input" /></div>
        <button type="submit" :disabled="isUploading" class="submit-btn bg-red-600 hover:bg-red-700"><span v-if="isUploading" class="spinner"></span>{{ isUploading ? uploadStatus : '🚀 確認上傳並發布電影' }}</button>
      </form>

      <form v-if="activeTab === 'series'" @submit.prevent="handleCreateSeries" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-4 text-indigo-400 border-b border-gray-700 pb-2">建立新影集 (免上傳檔案)</h2>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">影集名稱</label><input type="text" v-model="seriesForm.title" required class="form-input" /></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">劇情簡介</label><textarea v-model="seriesForm.description" rows="3" class="form-input"></textarea></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">影集海報網址</label><input type="url" v-model="seriesForm.coverUrl" class="form-input" /></div>
        <button type="submit" :disabled="isUploading" class="submit-btn bg-indigo-600 hover:bg-indigo-700"><span v-if="isUploading" class="spinner"></span>{{ isUploading ? '建立中...' : '✨ 建立新影集' }}</button>
      </form>

      <form v-if="activeTab === 'episode'" @submit.prevent="handleUploadEpisode" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-4 text-indigo-400 border-b border-gray-700 pb-2">上傳影集單集</h2>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">選擇影集</label><select v-model="episodeForm.seriesId" required class="form-input"><option value="" disabled>請選擇影集...</option><option v-for="s in seriesList" :key="s.id" :value="s.id">{{ s.title }}</option></select></div>
        <div class="flex gap-4">
          <div class="flex-1"><label class="block text-sm font-medium text-gray-300 mb-2">第幾季？</label><input type="number" v-model="episodeForm.season" required min="1" class="form-input" /></div>
          <div class="flex-1"><label class="block text-sm font-medium text-gray-300 mb-2">第幾集？</label><input type="number" v-model="episodeForm.episode" required min="1" class="form-input" /></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">單集名稱 (選填)</label><input type="text" v-model="episodeForm.title" class="form-input" /></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID (若無可留空)</label><input type="number" v-model="episodeForm.topicId" class="form-input" /></div>
        <div><label class="block text-sm font-medium text-gray-300 mb-2">選擇影片檔</label><input type="file" @change="e => file = e.target.files[0]" accept="video/*" required class="file-input" /></div>
        <button type="submit" :disabled="isUploading || seriesList.length === 0" class="submit-btn bg-indigo-600 hover:bg-indigo-700"><span v-if="isUploading" class="spinner"></span>{{ isUploading ? uploadStatus : '🚀 確認上傳集數' }}</button>
      </form>

      <form v-if="activeTab === 'batch'" @submit.prevent="handleBatchUpload" class="space-y-6 animate-fade-in">
        <h2 class="text-xl font-semibold mb-2 text-teal-400 border-b border-gray-700 pb-2">📚 批次排隊上傳</h2>
        <p class="text-sm text-teal-200 mb-4 bg-teal-900/30 p-3 rounded-lg border border-teal-800">
          💡 系統會採用「排隊模式」一集傳完才傳下一集，完美避開雲端超載問題。上傳期間請<b>不要關閉或重新整理此網頁</b>。
        </p>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">目標影集</label>
          <select v-model="batchForm.seriesId" required class="form-input focus:border-teal-500">
            <option value="" disabled>請選擇要上傳到的影集...</option>
            <option v-for="s in seriesList" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>

        <div class="flex gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">這是第幾季？(Season)</label>
            <input type="number" v-model="batchForm.season" required min="1" class="form-input focus:border-teal-500" />
          </div>
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-300 mb-2">起始集數 (Episode)</label>
            <input type="number" v-model="batchForm.startEpisode" required min="1" class="form-input focus:border-teal-500" />
            <p class="text-xs text-gray-400 mt-1">例如填入 1，選擇的檔案就會依序被標記為 1, 2, 3...</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID (若無可留空)</label>
          <input type="number" v-model="batchForm.topicId" class="form-input focus:border-teal-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">選擇該季的所有影片 (可多選)</label>
          <input type="file" @change="onBatchFileChange" accept="video/*" multiple required class="file-input bg-gray-800 border border-gray-600" />
        </div>

        <div v-if="batchFiles.length > 0 && !batchStatus.isUploading" class="bg-gray-900 rounded-lg p-4 border border-gray-700 max-h-48 overflow-y-auto">
          <h3 class="text-sm font-bold text-gray-300 mb-2">即將上傳 {{ batchFiles.length }} 個檔案 (系統已自動排序)：</h3>
          <ul class="text-sm text-gray-400 space-y-1">
            <li v-for="(f, i) in batchFiles" :key="i" class="flex justify-between">
              <span class="truncate pr-4"><span class="text-teal-400 font-bold w-12 inline-block">EP {{ batchForm.startEpisode + i }}</span> {{ f.name }}</span>
              <span class="text-gray-500 shrink-0">{{ (f.size / 1024 / 1024).toFixed(1) }} MB</span>
            </li>
          </ul>
        </div>

        <div v-if="batchStatus.isUploading || batchStatus.log" class="bg-black rounded-lg p-4 border border-gray-700">
          <div class="flex justify-between items-center mb-2">
            <span class="text-teal-400 font-bold text-sm">
              {{ batchStatus.isUploading ? `上傳進度: ${batchStatus.currentIndex} / ${batchStatus.total}` : '批次上傳已結束' }}
            </span>
            <span class="text-gray-400 text-xs">成功: {{ batchStatus.success }} | 失敗: {{ batchStatus.fail }}</span>
          </div>
          <div class="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
            <div class="bg-teal-500 h-2 rounded-full transition-all duration-300" :style="`width: ${(batchStatus.currentIndex / batchStatus.total) * 100}%`"></div>
          </div>
          <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{{ batchStatus.log }}</pre>
        </div>

        <button type="submit" :disabled="batchStatus.isUploading || batchFiles.length === 0" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center gap-2">
          <span v-if="batchStatus.isUploading" class="spinner"></span>
          {{ batchStatus.isUploading ? '批次上傳執行中... 請勿關閉網頁' : `🚀 開始批次上傳 ${batchFiles.length} 集` }}
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

// ==========================================
// 表單資料綁定
// ==========================================
const movieForm = reactive({ title: '', description: '', coverUrl: '', topicId: '' })
const seriesForm = reactive({ title: '', description: '', coverUrl: '' })
const episodeForm = reactive({ seriesId: '', season: 1, episode: 1, title: '', topicId: '' })

// 批次上傳表單與狀態
const batchForm = reactive({ seriesId: '', season: 1, startEpisode: 1, topicId: '' })
const batchFiles = ref([])
const batchStatus = ref({ isUploading: false, currentIndex: 0, total: 0, success: 0, fail: 0, log: '' })

// ==========================================
// 載入初始資料
// ==========================================
const fetchSeries = async () => {
  const { data } = await supabase.from('series').select('id, title').order('created_at', { ascending: false })
  if (data) seriesList.value = data
}

onMounted(() => {
  fetchSeries()
})

// ==========================================
// 共用：上傳檔案至 Hugging Face 函數
// ==========================================
const uploadToHF = async (captionText, topicId, fileToUpload = file.value) => {
  uploadStatus.value = '正在上傳至 Hugging Face (轉發至 TG)...'
  const formData = new FormData()
  formData.append('file', fileToUpload)
  formData.append('caption', captionText)
  
  if (topicId) {
    formData.append('topic_id', parseInt(topicId))
  }

  const uploadRes = await fetch(`${API_BASE_URL}/upload/`, { method: 'POST', body: formData })
  if (!uploadRes.ok) throw new Error('伺服器回應錯誤')
  const uploadData = await uploadRes.json()
  if (!uploadData.success) throw new Error(`上傳失敗: ${uploadData.detail}`)
  
  return uploadData.message_id
}

// ==========================================
// 🎬 處理：上傳單部電影
// ==========================================
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
      topic_id: movieForm.topicId ? parseInt(movieForm.topicId) : null,
      tg_message_id: messageId
    })
    if (error) throw error

    alert('✅ 電影上傳並發布成功！')
    movieForm.title = ''; movieForm.description = ''; movieForm.coverUrl = ''; movieForm.topicId = ''; file.value = null
    document.querySelector('input[type="file"]').value = ''
  } catch (error) { alert(`❌ 發生錯誤：\n${error.message}`) } 
  finally { isUploading.value = false }
}

// ==========================================
// 🆕 處理：建立新影集 (免上傳影片)
// ==========================================
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

// ==========================================
// 📺 處理：上傳影集單集
// ==========================================
const handleUploadEpisode = async () => {
  if (!file.value) return alert('請先選擇影片檔案！')
  if (!episodeForm.seriesId) return alert('請選擇要上傳的影集！')

  try {
    isUploading.value = true
    const selectedSeries = seriesList.value.find(s => s.id === episodeForm.seriesId)
    const captionText = `📺 ${selectedSeries.title} - S${episodeForm.season}E${episodeForm.episode} ${episodeForm.title}`
    
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
    
    episodeForm.episode++ 
    episodeForm.title = ''; file.value = null
    document.querySelector('input[type="file"]').value = ''
  } catch (error) { alert(`❌ 發生錯誤：\n${error.message}`) } 
  finally { isUploading.value = false }
}

// ==========================================
// 📚 處理：批次檔案選取與排序
// ==========================================
const onBatchFileChange = (e) => {
  const filesArray = Array.from(e.target.files)
  filesArray.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  batchFiles.value = filesArray
}

// ==========================================
// 📚 處理：執行序列化批次上傳
// ==========================================
const handleBatchUpload = async () => {
  if (batchFiles.value.length === 0) return alert('請選擇至少一個影片檔案！')
  if (!batchForm.seriesId) return alert('請選擇要上傳的影集！')

  const selectedSeries = seriesList.value.find(s => s.id === batchForm.seriesId)
  
  batchStatus.value = { 
    isUploading: true, 
    currentIndex: 0, 
    total: batchFiles.value.length, 
    success: 0, 
    fail: 0, 
    log: `🎬 開始排隊上傳 ${selectedSeries.title} 第 ${batchForm.season} 季...\n` 
  }

  let currentEpNum = parseInt(batchForm.startEpisode)

  for (let i = 0; i < batchFiles.value.length; i++) {
    const currentFile = batchFiles.value[i]
    batchStatus.value.currentIndex = i + 1
    batchStatus.value.log += `\n⏳ [${i+1}/${batchStatus.value.total}] 正在上傳 EP ${currentEpNum}: ${currentFile.name}...`

    try {
      const captionText = `📺 ${selectedSeries.title} - S${batchForm.season}E${currentEpNum}`
      const messageId = await uploadToHF(captionText, batchForm.topicId, currentFile)

      batchStatus.value.log += `\n📦 檔案已上傳至雲端，寫入資料庫...`

      const { error } = await supabase.from('episodes').insert({
        series_id: batchForm.seriesId,
        season: batchForm.season,
        episode: currentEpNum,
        title: currentFile.name, 
        tg_message_id: messageId
      })
      
      if (error) throw error

      batchStatus.value.success++
      batchStatus.value.log += ` ✅ 成功！`
    } catch (err) {
      batchStatus.value.fail++
      batchStatus.value.log += ` ❌ 失敗: ${err.message}`
    }

    currentEpNum++ 
  }

  batchStatus.value.isUploading = false
  batchStatus.value.log += `\n\n🎉 批次任務結束！共計成功: ${batchStatus.value.success} 集, 失敗: ${batchStatus.value.fail} 集。`
  
  if (batchStatus.value.fail === 0) {
    batchFiles.value = []
    // 確保抓取到批次上傳的 input file 元素並清空
    const batchInput = document.querySelector('input[multiple]')
    if (batchInput) batchInput.value = ''
    batchForm.startEpisode = currentEpNum 
  }
}
</script>

<style scoped>
.form-input { @apply w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-indigo-500 transition-colors; }
.file-input { @apply w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 focus:outline-none cursor-pointer; }
.submit-btn { @apply w-full text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center gap-2; }
.spinner { @apply w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin; }
.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
