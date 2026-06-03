<template>
  <div class="max-w-2xl mx-auto py-8">
    <h1 class="text-3xl font-bold mb-8 text-white">⚙️ 劇院管理後台</h1>

    <div class="bg-gray-800 p-6 md:p-8 rounded-xl border border-gray-700 shadow-xl">
      <h2 class="text-xl font-semibold mb-6 text-red-500">上傳新電影</h2>
      
      <form @submit.prevent="handleUpload" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">選擇影片檔 (MP4)</label>
          <input 
            type="file" 
            @change="onFileChange" 
            accept="video/mp4" 
            required 
            class="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">電影名稱</label>
          <input 
            type="text" 
            v-model="form.title" 
            required 
            placeholder="例如：全面啟動"
            class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">劇情簡介</label>
          <textarea 
            v-model="form.description" 
            rows="3" 
            placeholder="輸入電影簡介..."
            class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">海報圖片網址 (選填)</label>
          <input 
            type="url" 
            v-model="form.coverUrl" 
            placeholder="https://..."
            class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Telegram Topic ID</label>
          <input 
            type="number" 
            v-model="form.topicId" 
            required
            class="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        <div class="pt-4 border-t border-gray-700">
          <button 
            type="submit" 
            :disabled="isUploading"
            class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center"
          >
            <span v-if="isUploading">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ uploadStatus }}
            </span>
            <span v-else>🚀 確認上傳並發布</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const supabase = useSupabaseClient()

// 請確保這裡的網址對應到你正在執行的 FastAPI 伺服器
const API_BASE_URL = 'https://meowtube-api.onrender.com/'

const file = ref(null)
const isUploading = ref(false)
const uploadStatus = ref('')

const form = reactive({
  title: '',
  description: '',
  coverUrl: '',
  topicId: 15 // 預設帶入一個常用的 ID，可自行修改
})

const onFileChange = (e) => {
  file.value = e.target.files[0]
}

const handleUpload = async () => {
  if (!file.value) {
    alert('請先選擇影片檔案！')
    return
  }

  try {
    isUploading.value = true
    
    // ==========================================
    // 步驟 1：先將實體檔案上傳到 FastAPI (轉發至 Telegram)
    // ==========================================
    uploadStatus.value = '步驟 1/2: 正在上傳至 Telegram，這可能需要幾分鐘...'
    
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('topic_id', form.topicId)
    formData.append('caption', form.title)

    const uploadRes = await fetch(`${API_BASE_URL}/upload/`, {
      method: 'POST',
      body: formData
    })
    
    const uploadData = await uploadRes.json()

    if (!uploadRes.ok || !uploadData.success) {
      throw new Error(`上傳 Telegram 失敗: ${uploadData.detail || '未知錯誤'}`)
    }

    // 取得 FastAPI 回傳的 message_id
    const tgMessageId = uploadData.message_id

    // ==========================================
    // 步驟 2：將影片資訊與 message_id 寫入 Supabase 資料庫
    // ==========================================
    uploadStatus.value = '步驟 2/2: 正在將資料寫入資料庫...'

    const { error: dbError } = await supabase
      .from('movies')
      .insert({
        title: form.title,
        description: form.description,
        cover_url: form.coverUrl,
        topic_id: form.topicId,
        tg_message_id: tgMessageId
      })

    if (dbError) {
      throw new Error(`寫入資料庫失敗: ${dbError.message}`)
    }

    // ==========================================
    // 完成與清理
    // ==========================================
    alert('✅ 電影上傳並發布成功！')
    
    // 清空表單
    file.value = null
    form.title = ''
    form.description = ''
    form.coverUrl = ''
    document.querySelector('input[type="file"]').value = ''

  } catch (error) {
    console.error(error)
    alert(`❌ 發生錯誤：\n${error.message}`)
  } finally {
    isUploading.value = false
    uploadStatus.value = ''
  }
}
</script>