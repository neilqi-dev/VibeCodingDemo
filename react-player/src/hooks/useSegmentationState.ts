/**
 * useSegmentationState Hook
 * Manages segmentation state for audio segmentation functionality
 */

import { useCallback, useReducer } from 'react'
import type { Segment, SegmentState, SegmentationMode } from '../types/segmentation'

/** Action types for segmentation state management */
type SegmentationAction =
  | { type: 'SET_SEGMENTS'; payload: Segment[] }
  | { type: 'SET_ACTIVE_SEGMENT'; payload: number }
  | { type: 'SET_MODE'; payload: SegmentationMode }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_SEGMENT'; payload: { index: number; segment: Segment } }
  | { type: 'RESET' }

/** Initial state for segmentation */
const initialState: SegmentState = {
  segments: [],
  activeSegmentIndex: -1,
  mode: 'manual',
  isAnalyzing: false,
  error: null,
}

/**
 * Reducer function for segmentation state
 */
function segmentationReducer(
  state: SegmentState,
  action: SegmentationAction
): SegmentState {
  switch (action.type) {
    case 'SET_SEGMENTS':
      return {
        ...state,
        segments: action.payload,
        activeSegmentIndex: action.payload.length > 0 ? 0 : -1,
        error: null,
      }

    case 'SET_ACTIVE_SEGMENT': {
      const index = action.payload
      if (index >= -1 && index < state.segments.length) {
        return { ...state, activeSegmentIndex: index }
      }
      return state
    }

    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        // Reset active segment when switching modes
        activeSegmentIndex: -1,
        error: null,
      }

    case 'SET_ANALYZING':
      return { ...state, isAnalyzing: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isAnalyzing: false }

    case 'UPDATE_SEGMENT': {
      const { index, segment } = action.payload
      if (index >= 0 && index < state.segments.length) {
        const newSegments = [...state.segments]
        newSegments[index] = segment
        return { ...state, segments: newSegments }
      }
      return state
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

/**
 * Custom hook for managing segmentation state
 * Provides state and action creators for segmentation functionality
 *
 * @returns Object with state and action creators
 */
export function useSegmentationState() {
  const [state, dispatch] = useReducer(segmentationReducer, initialState)

  const setSegments = useCallback((segments: Segment[]) => {
    dispatch({ type: 'SET_SEGMENTS', payload: segments })
  }, [])

  const setActiveSegment = useCallback((index: number) => {
    dispatch({ type: 'SET_ACTIVE_SEGMENT', payload: index })
  }, [])

  const setMode = useCallback((mode: SegmentationMode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }, [])

  const setAnalyzing = useCallback((isAnalyzing: boolean) => {
    console.log('useSegmentationState: setAnalyzing called with', isAnalyzing)
    dispatch({ type: 'SET_ANALYZING', payload: isAnalyzing })
  }, [])

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const updateSegment = useCallback((index: number, segment: Segment) => {
    dispatch({ type: 'UPDATE_SEGMENT', payload: { index, segment } })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    // State
    state,
    segments: state.segments,
    activeSegmentIndex: state.activeSegmentIndex,
    activeSegment: state.activeSegmentIndex >= 0 ? state.segments[state.activeSegmentIndex] : null,
    mode: state.mode,
    isAnalyzing: state.isAnalyzing,
    error: state.error,

    // Actions
    setSegments,
    setActiveSegment,
    setMode,
    setAnalyzing,
    setError,
    updateSegment,
    reset,

    // Helpers
    nextSegment: () => {
      const next = state.activeSegmentIndex + 1
      if (next < state.segments.length) {
        dispatch({ type: 'SET_ACTIVE_SEGMENT', payload: next })
      }
    },
    prevSegment: () => {
      const prev = state.activeSegmentIndex - 1
      if (prev >= 0) {
        dispatch({ type: 'SET_ACTIVE_SEGMENT', payload: prev })
      }
    },
    canGoNext: () => state.activeSegmentIndex >= 0 && state.activeSegmentIndex < state.segments.length - 1,
    canGoPrev: () => state.activeSegmentIndex > 0,
  }
}

/**
 * Type for the return value of useSegmentationState
 */
export type UseSegmentationStateReturn = ReturnType<typeof useSegmentationState>
