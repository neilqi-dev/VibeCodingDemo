/**
 * AudioSegmentationContainer
 * Main container component for audio segmentation functionality
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { useSegmentationState } from '../hooks/useSegmentationState'
import {
  getDefaultSegmentationConfig,
} from '../services/segmentationEngine'
import { uploadAudio } from '../services/segmentationApi'
import { ModeSwitch } from './AudioSegmentation/ModeSwitch'
import { SegmentNavigationButtons } from './AudioSegmentation/SegmentNavigationButtons'
//import { SegmentationCanvas } from './AudioSegmentation/SegmentationCanvas'
import { AnalysisLoadingIndicator } from './AudioSegmentation/AnalysisLoadingIndicator'
import type { Segment } from '../types/segmentation'
import {
  getSegmentInfoString,
  snapTimeToGrid,
} from '../utils/segmentationVisualization'
import './AudioSegmentationContainer.css'

interface AudioSegmentationContainerProps {
  /** Audio context for analyzing audio */
  audioContext: AudioContext | null
  /** Audio buffer to analyze */
  audioBuffer: AudioBuffer | null
  /** Audio file currently loaded for playback */
  audioFile: File | null
  /** Total duration in seconds */
  duration: number
  /** Whether repeat mode is active */
  isRepeatMode: boolean
  /** Canvas width in pixels */
  canvasWidth: number
  /** Callback when segment boundary is adjusted */
  onSegmentAdjust?: (segmentIndex: number, boundaryType: 'start' | 'end', newTime: number) => void
  /** Callback when the active segment changes */
  onActiveSegmentChange?: (index: number, segment: Segment) => void
  /** Callback when analyzing state changes (for external loading indicator) */
  onAnalyzingChange?: (isAnalyzing: boolean) => void
  /** Callback when subtitle text changes */
  onSubtitleChange?: (text: string | null) => void
  /** CSS class name */
  className?: string
}

/**
 * Audio Segmentation Container
 * Manages all segmentation functionality including analysis, visualization, and navigation
 */
export const AudioSegmentationContainer: React.FC<AudioSegmentationContainerProps> = ({
  audioBuffer,
  audioFile,
  duration,
  isRepeatMode,
  onSegmentAdjust,
  onActiveSegmentChange,
  onAnalyzingChange,
  onSubtitleChange,
  className = '',
}) => {
  const {
    segments,
    activeSegmentIndex,
    activeSegment,
    mode,
    isAnalyzing,
    error,
    setSegments,
    setMode,
    setAnalyzing,
    setError,

    updateSegment,
    nextSegment,
    prevSegment,
    canGoNext,
    canGoPrev,
  } = useSegmentationState()

  console.log('AudioSegmentationContainer: isAnalyzing =', isAnalyzing)

  //const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Handle mode switch
  const handleModeChange = useCallback(
    async (newMode: 'manual' | 'auto') => {
      console.log('handleModeChange: called with newMode =', newMode)
      setMode(newMode)

      if (newMode === 'auto') {
        if (!audioBuffer || duration <= 0 || !audioFile) {
          console.log('handleModeChange: no audio buffer, duration, or file, setting error')
          setError('Audio is not loaded for segmentation.')
          setMode('manual')
          return
        }

        console.log('handleModeChange: setting isAnalyzing to true')
        setAnalyzing(true)
        setError(null)

        try {
          // Use API-based segmentation
          console.log('handleModeChange: calling segmentation API')
          
          const response = await uploadAudio(audioFile)
          
          // Handle empty segments array
          if (!response.segments || response.segments.length === 0) {
            console.log('handleModeChange: API returned no segments')
            setError('No segments found in audio.')
            setSegments([])
            setMode('manual')
            return
          }
          
          // Map API response to internal segment format
          const mappedSegments = response.segments.map((seg, idx) => ({
            id: `segment-${idx}`,
            index: idx,
            startTime: seg.start,
            endTime: seg.end,
            text: seg.text || '',
          }))
          
          setSegments(mappedSegments)
          console.log(
            `API segmentation completed with ${mappedSegments.length} segments`
          )
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          console.log('handleModeChange: error occurred:', errorMessage)
          setError(errorMessage)
          setMode('manual')
          setSegments([])
          console.error('Segmentation failed:', errorMessage)
        } finally {
          console.log('handleModeChange: finally block, setting isAnalyzing to false')
          setAnalyzing(false)
          onAnalyzingChange?.(false)
        }
      } else {
        // Reset segments when switching to manual mode
        setSegments([])
      }
    },
    [audioBuffer, audioFile, duration, setMode, setAnalyzing, setError, setSegments, onAnalyzingChange]
  )

  // Notify parent when analyzing state changes
  useEffect(() => {
    onAnalyzingChange?.(isAnalyzing)
  }, [isAnalyzing, onAnalyzingChange])

  // Reset segmentation when audio changes or repeat mode exits
  useEffect(() => {
    if (!isRepeatMode) {
      setMode('manual')
      setSegments([])
      setError(null)
    }
  }, [isRepeatMode, setMode, setSegments, setError])

  // Handle segment boundary adjustment
  const handleBoundaryAdjust = useCallback(
    (segmentIndex: number, boundaryType: 'start' | 'end', newTime: number) => {
      if (segmentIndex < 0 || segmentIndex >= segments.length) return

      const segment = segments[segmentIndex]
      const snappedTime = snapTimeToGrid(newTime, getDefaultSegmentationConfig().gridSnapInterval)

      // Validate bounds
      let validTime = snappedTime
      if (boundaryType === 'start') {
        validTime = Math.max(0, Math.min(validTime, segment.endTime - 0.05))
      } else {
        validTime = Math.min(duration, Math.max(validTime, segment.startTime + 0.05))
      }

      // Update segment
      const updatedSegment: Segment = {
        ...segment,
        [boundaryType === 'start' ? 'startTime' : 'endTime']: validTime,
      }

      updateSegment(segmentIndex, updatedSegment)
      onSegmentAdjust?.(segmentIndex, boundaryType, validTime)
    },
    [segments, duration, updateSegment, onSegmentAdjust]
  )

  console.log('handleBoundaryAdjust:', handleBoundaryAdjust)
  // Handle keyboard navigation
  useEffect(() => {
    if (!isRepeatMode || mode !== 'auto' || segments.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevSegment()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextSegment()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRepeatMode, mode, segments.length, prevSegment, nextSegment])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [])

  const lastActiveSegmentIndexRef = useRef<number>(-1)

  useEffect(() => {
    if (mode !== 'auto' || !isRepeatMode || !activeSegment || activeSegmentIndex < 0) {
      lastActiveSegmentIndexRef.current = -1
      return
    }

    if (activeSegmentIndex !== lastActiveSegmentIndexRef.current) {
      lastActiveSegmentIndexRef.current = activeSegmentIndex
      onActiveSegmentChange?.(activeSegmentIndex, activeSegment)
    }
  }, [activeSegmentIndex, activeSegment, mode, isRepeatMode, onActiveSegmentChange])

  // Notify parent when subtitle text changes
  useEffect(() => {
    if (mode === 'auto' && isRepeatMode && activeSegment) {
      onSubtitleChange?.(activeSegment.text || null)
    } else {
      onSubtitleChange?.(null)
    }
  }, [activeSegment, mode, isRepeatMode, onSubtitleChange])

  const showModeSwitch = isRepeatMode
  const showSegmentationUI = isRepeatMode && mode === 'auto' && segments.length > 0

  return (
    <div className={`audio-segmentation-container ${className}`}>
      {/* Mode Switch */}
      <ModeSwitch
        mode={mode}
        visible={showModeSwitch}
        onChange={handleModeChange}
        disabled={isAnalyzing}
      />

      {/* Navigation Buttons and Info */}
      {showSegmentationUI && activeSegment && (
        <SegmentNavigationButtons
          visible={true}
          canGoPrev={canGoPrev()}
          canGoNext={canGoNext()}
          segmentInfo={getSegmentInfoString(
            activeSegmentIndex,
            segments.length,
            activeSegment
          )}
          onPrev={prevSegment}
          onNext={nextSegment}
          disabled={isAnalyzing}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="segmentation-error" role="alert">
          <p className="error-message">
            Segmentation failed: {error}
          </p>
          <button
            className="error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Analysis Loading Indicator */}
      <AnalysisLoadingIndicator
        visible={isAnalyzing}
        message="Analyzing audio segments..."
      />
    </div>
  )
}
