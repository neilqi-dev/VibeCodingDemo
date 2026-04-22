/**
 * Segmentation Types
 * Defines TypeScript types for audio segmentation functionality
 */

export type SegmentationMode = 'manual' | 'auto'

export interface Segment {
  id: string
  startTime: number
  endTime: number
  index: number
  text?: string
}

export interface SegmentState {
  segments: Segment[]
  activeSegmentIndex: number
  mode: SegmentationMode
  isAnalyzing: boolean
  error: string | null
}

export interface SegmentationResult {
  segments: Segment[]
  timestamp: number
  analysisDuration: number
}

export interface SegmentationConfig {
  silenceThreshold: number
  minSegmentDuration: number
  spectralFluxThreshold: number
  gridSnapInterval: number
}

export interface SegmentationParams {
  audioBuffer: AudioBuffer
  sampleRate: number
  config: SegmentationConfig
}

export interface SegmentColor {
  fill: string
  alpha: number
}
