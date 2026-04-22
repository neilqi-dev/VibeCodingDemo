/**
 * SegmentationCanvas Component
 * Canvas overlay for visualizing audio segments
 */

import React, { useEffect, useRef, useCallback, useState } from 'react'
import type { Segment } from '../../types/segmentation'
import {
  drawSegments,
  findNearestBoundary,
  pixelToTime,
  snapTimeToGrid,
} from '../../utils/segmentationVisualization'
import './SegmentationCanvas.css'

export interface SegmentationCanvasProps {
  /** Array of segments to visualize */
  segments: Segment[]
  /** Total audio duration in seconds */
  duration: number
  /** Currently active segment index (-1 for none) */
  activeSegmentIndex: number
  /** Whether canvas should be visible */
  visible: boolean
  /** Grid snap interval in milliseconds */
  gridSnapInterval: number
  /** Callback when a segment boundary is adjusted */
  onBoundaryAdjust: (segmentIndex: number, boundaryType: 'start' | 'end', newTime: number) => void
  /** Callback when drag starts */
  onDragStart?: () => void
  /** Callback when drag ends */
  onDragEnd?: () => void
  /** Canvas width in pixels (for responsive sizing) */
  canvasWidth?: number
  /** CSS class name for styling */
  className?: string
}

/**
 * Segmentation Canvas Component
 * Renders segments as colored bands on canvas with drag-to-adjust boundaries
 */
export const SegmentationCanvas: React.FC<SegmentationCanvasProps> = ({
  segments,
  duration,
  activeSegmentIndex,
  visible,
  gridSnapInterval,
  onBoundaryAdjust,
  onDragStart,
  onDragEnd,
  canvasWidth = 800,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedBoundary, setDraggedBoundary] = useState<{
    segmentIndex: number
    boundaryType: 'start' | 'end'
  } | null>(null)
  const [hoveredBoundary, setHoveredBoundary] = useState<number | null>(null)

  // Draw segments
  useEffect(() => {
    if (!visible || !canvasRef.current) return

    const canvas = canvasRef.current
    // Set canvas width to match actual width
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    drawSegments(canvas, segments, duration, activeSegmentIndex)
  }, [segments, duration, activeSegmentIndex, visible, canvasWidth])

  // Handle mouse move for boundary detection and highlighting
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !visible) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const pixelX = e.clientX - rect.left

      if (isDragging && draggedBoundary) {
        // Update boundary position during drag
        const newTime = pixelToTime(pixelX, canvas.width, duration)
        const snappedTime = snapTimeToGrid(newTime, gridSnapInterval)

        // Validate time bounds
        const segment = segments[draggedBoundary.segmentIndex]
        if (!segment) return

        let validTime = snappedTime
        if (draggedBoundary.boundaryType === 'start') {
          validTime = Math.max(0, Math.min(validTime, segment.endTime - 0.1))
        } else {
          validTime = Math.min(duration, Math.max(validTime, segment.startTime + 0.1))
        }

        onBoundaryAdjust(draggedBoundary.segmentIndex, draggedBoundary.boundaryType, validTime)
      } else {
        // Check for boundary proximity for hover effect
        const boundary = findNearestBoundary(segments, canvas.width, duration, pixelX, 5)
        setHoveredBoundary(boundary ? boundary.pixelPosition : null)

        // Update cursor
        if (boundary) {
          canvas.style.cursor = 'ew-resize'
        } else {
          canvas.style.cursor = 'default'
        }
      }
    },
    [isDragging, draggedBoundary, segments, duration, gridSnapInterval, onBoundaryAdjust, visible]
  )

  // Handle mouse down to start boundary dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !visible) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const pixelX = e.clientX - rect.left

      const boundary = findNearestBoundary(segments, canvas.width, duration, pixelX, 5)
      if (boundary) {
        setIsDragging(true)
        setDraggedBoundary({
          segmentIndex: boundary.segmentIndex,
          boundaryType: boundary.boundaryType,
        })
        onDragStart?.()
      }
    },
    [segments, duration, onDragStart, visible]
  )

  // Handle mouse up to end boundary dragging
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setDraggedBoundary(null)
      onDragEnd?.()
    }
  }, [isDragging, onDragEnd])

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoveredBoundary(null)
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default'
      }
    }
  }, [isDragging])

  // Add window event listeners for mouse up
  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseUp])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className={`segmentation-canvas-container ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvasRef}
        className="segmentation-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: hoveredBoundary !== null ? 'ew-resize' : 'default',
        }}
      />
    </div>
  )
}
