import { nextTick, ref } from 'vue'
import { getApiUrlsByPriority } from '~/utils/apiManager'

export const useVideoApiFailover = ({ videoPlayer, resumeProgress, onMessage }) => {
  const apiUrls = getApiUrlsByPriority()
  const apiBaseUrl = ref(apiUrls[0])

  let currentApiIndex = 0
  let retryPosition = 0
  let isSwitching = false

  const resetApiFailover = () => {
    currentApiIndex = 0
    apiBaseUrl.value = apiUrls[0]
    retryPosition = 0
    isSwitching = false
  }

  const handleLoadedMetadata = () => {
    const player = videoPlayer.value
    if (!player) return

    if (retryPosition > 0 && (!Number.isFinite(player.duration) || player.duration - retryPosition > 10)) {
      player.currentTime = retryPosition
      retryPosition = 0
      return
    }

    retryPosition = 0
    resumeProgress()
  }

  const handleVideoError = async () => {
    if (isSwitching) return

    const player = videoPlayer.value
    const currentPosition = Number(player?.currentTime)
    if (Number.isFinite(currentPosition) && currentPosition > retryPosition) {
      retryPosition = currentPosition
    }

    if (currentApiIndex >= apiUrls.length - 1) {
      onMessage?.('❌ 三個播放線路目前都無法使用，請稍後再試')
      return
    }

    isSwitching = true
    const failedLine = currentApiIndex + 1
    currentApiIndex += 1
    apiBaseUrl.value = apiUrls[currentApiIndex]
    onMessage?.(`⚠️ 線路 ${failedLine} 無法播放，正在嘗試線路 ${currentApiIndex + 1}…`)

    await nextTick()
    const nextPlayer = videoPlayer.value
    nextPlayer?.load()
    nextPlayer?.play().catch(() => {
      // 瀏覽器可能阻擋自動播放；使用者按播放後仍會使用新的線路。
    })
    isSwitching = false
  }

  return {
    apiBaseUrl,
    resetApiFailover,
    handleLoadedMetadata,
    handleVideoError
  }
}
