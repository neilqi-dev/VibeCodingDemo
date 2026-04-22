import React from 'react'
import type { Segment } from '../../services/segmentationApi'
import './SegmentList.css'

interface SegmentListProps {
  segments: Segment[]
  selectedSegment: Segment | null
  onSegmentClick?: (segment: Segment) => void
}

export const SegmentList: React.FC<SegmentListProps> = ({ segments, selectedSegment, onSegmentClick }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  return (
    <div className="segment-list">
      <h3>Segments</h3>
      <div className="segments-container">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`segment-item ${selectedSegment?.id === segment.id ? 'selected' : ''}`}
            onClick={() => onSegmentClick?.(segment)}
          >
            <div className="segment-header">
              <span className="segment-id">#{segment.id}</span>
              <span className="segment-time">
                {formatTime(segment.start)} - {formatTime(segment.end)}
              </span>
            </div>
            <div className="segment-text">{segment.text}</div>
            <div className="segment-confidence">
              Confidence: {(segment.confidence * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}