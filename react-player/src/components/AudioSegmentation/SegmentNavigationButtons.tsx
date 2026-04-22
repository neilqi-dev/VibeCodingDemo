/**
 * SegmentNavigationButtons Component
 * Prev/Next buttons for navigating between audio segments
 */

import React from 'react'
import './SegmentNavigationButtons.css'

export interface SegmentNavigationButtonsProps {
  /** Whether the controls should be visible */
  visible: boolean
  /** Whether previous segment button is enabled */
  canGoPrev: boolean
  /** Whether next segment button is enabled */
  canGoNext: boolean
  /** Current segment info string (e.g., "Segment 1 of 5, 0:00-1:23") */
  segmentInfo: string
  /** Callback when previous button is clicked */
  onPrev: () => void
  /** Callback when next button is clicked */
  onNext: () => void
  /** Whether buttons are disabled */
  disabled?: boolean
  /** CSS class name for styling */
  className?: string
}

/**
 * Segment Navigation Buttons Component
 * Provides Prev/Next buttons and segment info display
 * Only visible when in Auto mode with detected segments
 */
export const SegmentNavigationButtons: React.FC<SegmentNavigationButtonsProps> = ({
  visible,
  canGoPrev,
  canGoNext,
  segmentInfo,
  onPrev,
  onNext,
  disabled = false,
  className = '',
}) => {
  if (!visible) return null

  return (
    <div className={`segment-navigation ${className}`}>
      <div className="segment-info">
        <span className="segment-info-text">{segmentInfo}</span>
      </div>

      <div className="segment-nav-buttons">
        <button
          className="segment-nav-button prev-button"
          onClick={onPrev}
          disabled={!canGoPrev || disabled}
          title="Go to previous segment (←)"
          aria-label="Previous segment"
        >
          ← Prev
        </button>

        <button
          className="segment-nav-button next-button"
          onClick={onNext}
          disabled={!canGoNext || disabled}
          title="Go to next segment (→)"
          aria-label="Next segment"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
