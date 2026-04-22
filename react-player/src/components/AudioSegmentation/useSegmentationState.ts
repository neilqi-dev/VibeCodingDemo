import { useState } from 'react'
import type { Segment } from '../../types/segmentation'
import type { SegmentationResponse } from '../../services/segmentationApi'
import { uploadAudio } from '../../services/segmentationApi'
export interface SegmentationState {
  segments: Segment[]
  loading: boolean
  error: string | null
  selectedSegment: Segment | null
}

export function useSegmentationState() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null)

  const loadSegments = async (filePath: string) => {
    setLoading(true)
    setError(null)
    try {
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new Error('A valid file path is required for segmentation.')
      }

      const response: SegmentationResponse = await uploadAudio(filePath)
      
      // Validate segments data
      if (!Array.isArray(response.segments)) {
        throw new Error('Invalid response: segments must be an array')
      }
      
      for (const segment of response.segments) {
        if (typeof segment.id !== 'number' ||
            typeof segment.text !== 'string' ||
            typeof segment.start !== 'number' ||
            typeof segment.end !== 'number' ||
            typeof segment.confidence !== 'number') {
          throw new Error('Invalid segment data structure')
        }
        if (segment.start >= segment.end) {
          throw new Error('Invalid segment: start time must be less than end time')
        }
        if (segment.confidence < 0 || segment.confidence > 1) {
          throw new Error('Invalid confidence value: must be between 0 and 1')
        }
      }
      const adaptedSegments = response.segments.map((seg, i) => ({
        id: seg.text,
        startTime: seg.start,
        endTime: seg.end,
        index: i
      }))

      setSegments(adaptedSegments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const selectSegment = (segment: Segment) => {
    setSelectedSegment(segment)
  }

  const clearSelection = () => {
    setSelectedSegment(null)
  }

  const clearSegments = () => {
    setSegments([])
    setSelectedSegment(null)
    setError(null)
  }

  return {
    segments,
    loading,
    error,
    selectedSegment,
    loadSegments,
    selectSegment,
    clearSelection,
    clearSegments
  }
}