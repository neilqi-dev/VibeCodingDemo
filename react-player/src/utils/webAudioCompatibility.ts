/**
 * Web Audio API Detection and Fallback Utilities
 * Provides graceful degradation when Web Audio API is unavailable
 */

/**
 * Web Audio compatibility information
 */
export interface WebAudioCompatibility {
  isSupported: boolean
  audioContextAvailable: boolean
  offlineAudioContextAvailable: boolean
  analyzerSupported: boolean
  userMediaSupported: boolean
  reasonIfUnsupported?: string
  warnings?: string[]
}

/**
 * Detects Web Audio API availability and features
 * Returns detailed compatibility information for graceful fallback
 *
 * @returns Compatibility object with support status and details
 */
export function detectWebAudioSupport(): WebAudioCompatibility {
  const window_ = typeof window !== 'undefined' ? window : ({} as any)
  const warnings: string[] = []

  // Check basic Web Audio API availability
  const audioContextClass = (window_ as any).AudioContext || (window_ as any).webkitAudioContext
  const offlineContextClass =
    (window_ as any).OfflineAudioContext || (window_ as any).webkitOfflineAudioContext

  const audioContextAvailable = !!audioContextClass
  const offlineAudioContextAvailable = !!offlineContextClass

  // Check individual features
  let analyzerSupported = false
  let userMediaSupported = false

  if (audioContextAvailable) {
    // Test AnalyserNode support
    try {
      const context = new audioContextClass()
      analyzerSupported = !!context.createAnalyser
      context.close()
    } catch (err) {
      warnings.push('Failed to create AudioContext for feature detection')
    }
  }

  // Check getUserMedia support
  if (window_?.navigator?.mediaDevices?.getUserMedia) {
    userMediaSupported = true
  } else if ((window_ as any)?.navigator?.getUserMedia) {
    // Legacy API
    userMediaSupported = true
  }

  const isSupported = audioContextAvailable && analyzerSupported

  let reasonIfUnsupported: string | undefined
  if (!audioContextAvailable) {
    reasonIfUnsupported = 'Web Audio API is not supported in this browser'
  } else if (!analyzerSupported) {
    reasonIfUnsupported = 'AnalyserNode is not available in this browser'
  }

  return {
    isSupported,
    audioContextAvailable,
    offlineAudioContextAvailable,
    analyzerSupported,
    userMediaSupported,
    reasonIfUnsupported,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Check if segmentation analysis can be performed
 *
 * @returns True if Web Audio API is available for analysis
 */
export function isSegmentationAnalysisAvailable(): boolean {
  const compatibility = detectWebAudioSupport()
  return compatibility.isSupported && compatibility.analyzerSupported
}

/**
 * Gets a user-friendly message about Web Audio support
 * Useful for error messages or UI warnings
 *
 * @returns Human-readable compatibility message
 */
export function getWebAudioSupportMessage(): string {
  const compatibility = detectWebAudioSupport()

  if (compatibility.isSupported) {
    return 'Web Audio API is fully supported. Auto segmentation is available.'
  }

  if (compatibility.audioContextAvailable && !compatibility.analyzerSupported) {
    return 'Web Audio API is available but some features are missing. Auto segmentation may not work correctly.'
  }

  if (!compatibility.audioContextAvailable) {
    const browserHint = detectBrowser()
    if (browserHint) {
      return `Web Audio API is not supported in ${browserHint}. Please use a modern browser like Chrome, Firefox, Safari, or Edge.`
    }
    return 'Web Audio API is not supported in your browser. Auto segmentation is not available. Please use a modern browser.'
  }

  return 'Unable to determine Web Audio API support.'
}

/**
 * Detects browser type for better error messages
 *
 * @returns Browser name or null if unknown
 */
function detectBrowser(): string | null {
  if (typeof navigator === 'undefined') return null

  const userAgent = navigator.userAgent

  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  if (userAgent.includes('IE')) return 'Internet Explorer'

  return null
}

/**
 * Creates an AudioContext with fallback handling
 * Attempts to create context with vendor prefix support
 *
 * @returns AudioContext instance or null if unavailable
 */
export function createAudioContext(): AudioContext | null {
  try {
    const window_ = typeof window !== 'undefined' ? (window as any) : {}
    const AudioContext = window_.AudioContext || window_.webkitAudioContext

    if (!AudioContext) {
      return null
    }

    return new AudioContext()
  } catch (err) {
    console.warn('Failed to create AudioContext:', err)
    return null
  }
}

/**
 * Creates an OfflineAudioContext for analysis
 * Useful for segmentation without real-time constraints
 *
 * @param channels - Number of audio channels
 * @param length - Number of samples
 * @param sampleRate - Sample rate in Hz
 * @returns OfflineAudioContext or null if unavailable
 */
export function createOfflineAudioContext(
  channels: number,
  length: number,
  sampleRate: number
): OfflineAudioContext | null {
  try {
    const window_ = typeof window !== 'undefined' ? (window as any) : {}
    const OfflineContext =
      window_.OfflineAudioContext || window_.webkitOfflineAudioContext

    if (!OfflineContext) {
      return null
    }

    return new OfflineContext(channels, length, sampleRate)
  } catch (err) {
    console.warn('Failed to create OfflineAudioContext:', err)
    return null
  }
}

/**
 * Safely gets an AnalyserNode from a context
 *
 * @param context - AudioContext instance
 * @returns AnalyserNode or null if unavailable
 */
export function createAnalyserNode(context: AudioContext): AnalyserNode | null {
  try {
    return context.createAnalyser()
  } catch (err) {
    console.warn('Failed to create AnalyserNode:', err)
    return null
  }
}

/**
 * Feature-safe wrapper for audio buffer decoding
 * Handles errors gracefully without crashing
 *
 * @param context - AudioContext instance
 * @param arrayBuffer - Audio file data
 * @returns Promise resolving to AudioBuffer or null on error
 */
export async function decodeAudioDataSafely(
  context: AudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer | null> {
  try {
    return await context.decodeAudioData(arrayBuffer)
  } catch (err) {
    console.error('Failed to decode audio data:', err)
    return null
  }
}

/**
 * Detects if segmentation should be disabled based on platform/browser
 * Returns true if Auto mode should be hidden from UI
 *
 * @returns True if segmentation should be disabled
 */
export function shouldDisableSegmentation(): boolean {
  const compatibility = detectWebAudioSupport()

  if (!compatibility.isSupported) {
    return true
  }

  // Disable on very old browsers or mobile with memory constraints
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase()

    // Disable on IE (use Edge instead)
    if (userAgent.includes('trident')) {
      return true
    }

    // Could add more platform-specific checks here
  }

  return false
}

/**
 * Gets available Audio APIs in current environment
 * Useful for debugging compatibility issues
 *
 * @returns Array of available API names
 */
export function getAvailableAudioAPIs(): string[] {
  const apis: string[] = []
  const window_ = typeof window !== 'undefined' ? (window as any) : {}

  if (window_.AudioContext) apis.push('AudioContext')
  if (window_.webkitAudioContext) apis.push('webkitAudioContext')
  if (window_.OfflineAudioContext) apis.push('OfflineAudioContext')
  if (window_.webkitOfflineAudioContext) apis.push('webkitOfflineAudioContext')
  if (window_.navigator?.mediaDevices?.getUserMedia) apis.push('getUserMedia')
  if (window_.navigator?.getUserMedia) apis.push('getUserMedia (legacy)')

  return apis
}

/**
 * Logs detailed browser and API information for debugging
 * Useful for troubleshooting compatibility issues
 */
export function logWebAudioEnvironmentInfo(): void {
  if (typeof console === 'undefined') return

  const compatibility = detectWebAudioSupport()
  const availableAPIs = getAvailableAudioAPIs()

  console.group('Web Audio Environment Info')
  console.log('Web Audio Supported:', compatibility.isSupported)
  console.log('AudioContext Available:', compatibility.audioContextAvailable)
  console.log('OfflineAudioContext Available:', compatibility.offlineAudioContextAvailable)
  console.log('AnalyserNode Supported:', compatibility.analyzerSupported)
  console.log('getUserMedia Supported:', compatibility.userMediaSupported)
  console.log('Available APIs:', availableAPIs)

  if (compatibility.warnings) {
    console.warn('Warnings:', compatibility.warnings)
  }

  if (compatibility.reasonIfUnsupported) {
    console.warn('Reason for Unsupported:', compatibility.reasonIfUnsupported)
  }

  console.log('Browser:', detectBrowser() || 'Unknown')
  console.groupEnd()
}

/**
 * Provides fallback configuration when Web Audio is unavailable
 * Returns safe default settings for degraded mode
 *
 * @returns Configuration object for fallback mode
 */
export function getFallbackConfiguration() {
  return {
    isSegmentationAvailable: false,
    autoModeDisabled: true,
    manualModeEnabled: true,
    message: 'Auto segmentation is not available in your browser. Manual mode only.',
    enableTelemetry: true, // Track browser compatibility issues
    fallbackBehavior: 'manual' as const,
  }
}
