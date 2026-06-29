export function createSpeechPlaybackController({
  synthesizeSpeech,
  fallbackSpeakSegments,
  AudioCtor = globalThis.Audio,
  URLApi = globalThis.URL,
} = {}) {
  let runId = 0
  let currentAudio = null
  let currentUrl = null
  let currentCancel = null

  function cleanupCurrent() {
    const cancel = currentCancel
    currentCancel = null
    if (currentAudio) {
      currentAudio.onended = null
      currentAudio.onerror = null
      try { currentAudio.pause?.() } catch (_err) {}
      try { currentAudio.currentTime = 0 } catch (_err) {}
      try { currentAudio.src = '' } catch (_err) {}
      currentAudio = null
    }
    if (currentUrl) {
      try { URLApi?.revokeObjectURL?.(currentUrl) } catch (_err) {}
      currentUrl = null
    }
    cancel?.()
  }

  function stop() {
    runId += 1
    cleanupCurrent()
  }

  async function playAudioBlob(blob, activeRunId) {
    if (activeRunId !== runId) return false
    const url = URLApi.createObjectURL(blob)
    currentUrl = url
    try {
      const audio = new AudioCtor(url)
      currentAudio = audio
      const completed = await new Promise((resolve, reject) => {
        currentCancel = () => resolve(false)
        audio.onended = () => resolve(true)
        audio.onerror = reject
        const maybePromise = audio.play?.()
        if (maybePromise?.catch) maybePromise.catch(reject)
      })
      return completed && activeRunId === runId
    } finally {
      if (currentCancel) currentCancel = null
      if (currentAudio?.src === url || currentUrl === url) cleanupCurrent()
      else URLApi?.revokeObjectURL?.(url)
    }
  }

  async function speakSegments(segments) {
    const cleanSegments = (segments || []).filter((segment) => segment?.text)
    if (!cleanSegments.length) {
      stop()
      return false
    }

    stop()
    const activeRunId = runId
    try {
      for (const segment of cleanSegments) {
        if (activeRunId !== runId) return false
        const blob = await synthesizeSpeech(segment.text, segment.lang)
        if (activeRunId !== runId) return false
        const completed = await playAudioBlob(blob, activeRunId)
        if (!completed || activeRunId !== runId) return false
      }
      return true
    } catch (_err) {
      if (activeRunId !== runId) return false
      cleanupCurrent()
      return fallbackSpeakSegments?.(cleanSegments) || false
    }
  }

  return { speakSegments, stop }
}
