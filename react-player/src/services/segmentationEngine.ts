/**
 * Segmentation Engine
 * Provides audio analysis and segmentation functionality
 */

import type {
  Segment,
  SegmentationConfig,
  SegmentationParams,
  SegmentationResult,
} from '../types/segmentation'

/** Default configuration for segmentation analysis */
const DEFAULT_CONFIG: SegmentationConfig = {
  silenceThreshold: 0.01,
  minSegmentDuration: 0.5,
  spectralFluxThreshold: 0.1,
  gridSnapInterval: 100, // milliseconds
}

/**
 * Analyzes audio waveform characteristics to detect potential segment boundaries
 * Combines silence detection and spectral flux analysis
 *
 * @param params - Segmentation analysis parameters
 * @returns Promise resolving to segmentation result with detected segments
 */
export async function analyzeAudioSegmentation(
  params: SegmentationParams
): Promise<SegmentationResult> {
  const startTime = performance.now()
  const config = { ...DEFAULT_CONFIG, ...params.config }

  try {
    // Extract audio data from buffer
    const channelData = params.audioBuffer.getChannelData(0)

    // Perform silence detection
    const silenceFrames = detectSilence(channelData, config.silenceThreshold)

    // Perform spectral analysis
    const spectralFlux = computeSpectralFlux(
      channelData,
      params.sampleRate,
      config.spectralFluxThreshold
    )

    // Combine analysis results to find boundaries
    const boundaries = findSegmentBoundaries(
      silenceFrames,
      spectralFlux,
      params.audioBuffer.duration,
      params.sampleRate,
      config.minSegmentDuration
    )

    // Create segment objects from boundaries
    const segments = createSegments(
      boundaries,
      params.audioBuffer.duration,
      config.gridSnapInterval
    )

    const duration = performance.now() - startTime

    return {
      segments,
      timestamp: Date.now(),
      analysisDuration: duration,
    }
  } catch (error) {
    throw new Error(
      `Audio segmentation analysis failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Detects silence regions in audio data using energy threshold
 *
 * @param channelData - Audio channel data
 * @param threshold - Energy threshold for silence detection (0-1)
 * @returns Array of frame indices where silence is detected
 */
function detectSilence(channelData: Float32Array, threshold: number): boolean[] {
  const frameSize = 2048 // ~46ms at 44.1kHz
  const silenceFrames: boolean[] = []

  for (let i = 0; i < channelData.length; i += frameSize) {
    const frame = channelData.slice(i, i + frameSize)
    const rms = calculateRMS(frame)
    silenceFrames.push(rms < threshold)
  }

  return silenceFrames
}

/**
 * Computes RMS (Root Mean Square) energy of a frame
 *
 * @param frame - Audio frame data
 * @returns RMS value (0-1)
 */
function calculateRMS(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i]
  }
  const mean = sum / frame.length
  return Math.sqrt(mean)
}

/**
 * Computes spectral flux - change in spectral magnitude over time
 * Helps detect acoustic state transitions (e.g., consonants, phoneme changes)
 *
 * @param channelData - Audio channel data
 * @param sampleRate - Sample rate in Hz
 * @param threshold - Flux threshold for detection
 * @returns Array of spectral flux values
 */
function computeSpectralFlux(
  channelData: Float32Array,
  sampleRate: number,
  threshold: number
): number[] {
  const frameSize = 2048
  const hopSize = frameSize / 2
  const flux: number[] = []

  console.log('sampleRate:', sampleRate, 'threshold:', threshold)
  // Simple spectral flux using frame-to-frame energy changes
  let prevMagnitude = 0

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    const frame = channelData.slice(i, i + frameSize)
    const magnitude = calculateRMS(frame)
    const fluxValue = Math.abs(magnitude - prevMagnitude)
    flux.push(fluxValue)
    prevMagnitude = magnitude
  }

  return flux
}

/**
 * Finds segment boundaries by combining silence detection and spectral analysis
 *
 * @param silenceFrames - Boolean array of silence detection results
 * @param spectralFlux - Array of spectral flux values
 * @param duration - Audio duration in seconds
 * @param sampleRate - Sample rate in Hz
 * @param minSegmentDuration - Minimum segment duration in seconds
 * @returns Array of boundary times in seconds
 */
function findSegmentBoundaries(
  silenceFrames: boolean[],
  spectralFlux: number[],
  duration: number,
  sampleRate: number,
  minSegmentDuration: number
): number[] {
  const frameSize = 2048
  const boundaries: Set<number> = new Set()
  boundaries.add(0) // Always start from beginning

  const minFrameDistance = Math.ceil(
    (minSegmentDuration * sampleRate) / frameSize
  )

  // Find silence boundaries
  let inSilence = false
  let silenceStart = -1

  for (let i = 0; i < silenceFrames.length; i++) {
    if (silenceFrames[i] && !inSilence) {
      silenceStart = i
      inSilence = true
    } else if (!silenceFrames[i] && inSilence) {
      // End of silence - this is a potential boundary
      const boundaryFrame = Math.floor((silenceStart + i) / 2)
      if (!isNearExistingBoundary(boundaries, boundaryFrame, minFrameDistance)) {
        const boundaryTime = (boundaryFrame * frameSize) / sampleRate
        if (boundaryTime > 0 && boundaryTime < duration) {
          boundaries.add(boundaryTime)
        }
      }
      inSilence = false
    }
  }

  // Find spectral flux peaks
  const peakThreshold = calculatePercentile(spectralFlux, 0.7)

  for (let i = 1; i < spectralFlux.length - 1; i++) {
    if (
      spectralFlux[i] > peakThreshold &&
      spectralFlux[i] > spectralFlux[i - 1] &&
      spectralFlux[i] > spectralFlux[i + 1]
    ) {
      if (!isNearExistingBoundary(boundaries, i, minFrameDistance)) {
        const boundaryTime = (i * frameSize) / sampleRate
        if (boundaryTime > 0 && boundaryTime < duration) {
          boundaries.add(boundaryTime)
        }
      }
    }
  }

  boundaries.add(duration) // Always end at duration
  return Array.from(boundaries).sort((a, b) => a - b)
}

/**
 * Checks if a frame is near an existing boundary
 *
 * @param boundaries - Set of existing boundary times
 * @param frameIndex - Frame index to check
 * @param minDistance - Minimum distance in frames
 * @returns True if near existing boundary
 */
function isNearExistingBoundary(
  boundaries: Set<number>,
  frameIndex: number,
  minDistance: number
): boolean {
  for (const boundary of boundaries) {
    // Convert boundary time (seconds) to frame index for comparison
    const boundaryFrame = (boundary * 44100) / 2048 // Assuming 44.1kHz
    if (Math.abs(frameIndex - boundaryFrame) < minDistance) {
      return true
    }
  }
  return false
}

/**
 * Calculates percentile value in an array
 *
 * @param values - Array of values
 * @param percentile - Percentile (0-1)
 * @returns Percentile value
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.floor(sorted.length * percentile)
  return sorted[index]
}

/**
 * Creates segment objects from boundary times
 *
 * @param boundaries - Array of boundary times in seconds
 * @param duration - Total audio duration
 * @param gridSnapInterval - Grid snapping interval in milliseconds
 * @returns Array of Segment objects
 */
function createSegments(
  boundaries: number[],
  duration: number,
  gridSnapInterval: number
): Segment[] {
  const segments: Segment[] = []
  const gridSnap = gridSnapInterval / 1000 // Convert to seconds

  for (let i = 0; i < boundaries.length - 1; i++) {
    const startTime = snapToGrid(boundaries[i], gridSnap)
    const endTime = snapToGrid(boundaries[i + 1], gridSnap)

    // Skip invalid segments
    if (startTime === endTime || endTime > duration) {
      continue
    }

    segments.push({
      id: `segment-${i}`,
      startTime,
      endTime,
      index: i,
    })
  }

  return segments
}

/**
 * Snaps a time value to the nearest grid interval
 *
 * @param time - Time in seconds
 * @param gridInterval - Grid interval in seconds
 * @returns Snapped time
 */
function snapToGrid(time: number, gridInterval: number): number {
  return Math.round(time / gridInterval) * gridInterval
}

/**
 * Gets default segmentation configuration
 *
 * @returns Default configuration object
 */
export function getDefaultSegmentationConfig(): SegmentationConfig {
  return { ...DEFAULT_CONFIG }
}

/**
 * Validates configuration parameters
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateSegmentationConfig(config: Partial<SegmentationConfig>): void {
  if (config.silenceThreshold !== undefined) {
    if (config.silenceThreshold < 0 || config.silenceThreshold > 1) {
      throw new Error('silenceThreshold must be between 0 and 1')
    }
  }

  if (config.minSegmentDuration !== undefined) {
    if (config.minSegmentDuration < 0) {
      throw new Error('minSegmentDuration must be positive')
    }
  }

  if (config.spectralFluxThreshold !== undefined) {
    if (config.spectralFluxThreshold < 0 || config.spectralFluxThreshold > 1) {
      throw new Error('spectralFluxThreshold must be between 0 and 1')
    }
  }
}
