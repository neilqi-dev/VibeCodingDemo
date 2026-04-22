/**
 * Segmentation Visualization Utilities
 * Provides visualization functions for drawing segments on canvas
 */

import type { Segment, SegmentColor } from '../types/segmentation'

/**
 * Color palette for segments - alternating semi-transparent colors
 */
export const SEGMENT_COLOR_PALETTE: SegmentColor[] = [
  { fill: '#87CEEB', alpha: 0.3 }, // Sky blue
  { fill: '#FFB6C1', alpha: 0.3 }, // Light pink
  { fill: '#98FB98', alpha: 0.3 }, // Pale green
  { fill: '#FFD700', alpha: 0.3 }, // Gold
  { fill: '#DDA0DD', alpha: 0.3 }, // Plum
  { fill: '#F0E68C', alpha: 0.3 }, // Khaki
]

/**
 * Gets color for a segment based on its index
 *
 * @param segmentIndex - Index of the segment
 * @returns Color object with fill and alpha
 */
export function getSegmentColor(segmentIndex: number): SegmentColor {
  return SEGMENT_COLOR_PALETTE[segmentIndex % SEGMENT_COLOR_PALETTE.length]
}

/**
 * Draws segment visualization on canvas
 *
 * @param canvas - HTML canvas element
 * @param segments - Array of segments to draw
 * @param duration - Total audio duration in seconds
 * @param activeSegmentIndex - Currently active segment index (-1 for none)
 */
export function drawSegments(
  canvas: HTMLCanvasElement,
  segments: Segment[],
  duration: number,
  activeSegmentIndex: number = -1
): void {
  const context = canvas.getContext('2d')
  if (!context) return

  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height)

  if (segments.length === 0 || duration <= 0) return

  const pixelsPerSecond = canvas.width / duration

  segments.forEach((segment, index) => {
    const startPixel = segment.startTime * pixelsPerSecond
    const width = (segment.endTime - segment.startTime) * pixelsPerSecond

    const color = getSegmentColor(index)
    
    // Draw segment rectangle
    context.fillStyle = `rgba(${hexToRgb(color.fill).join(',')},${color.alpha})`
    context.fillRect(startPixel, 0, width, canvas.height)

    // Draw border for active segment
    if (index === activeSegmentIndex) {
      context.strokeStyle = `rgba(${hexToRgb(color.fill).join(',')},0.8)`
      context.lineWidth = 2
      context.strokeRect(startPixel, 0, width, canvas.height)
    }

    // Draw boundary lines
    context.strokeStyle = `rgba(0,0,0,0.1)`
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(startPixel, 0)
    context.lineTo(startPixel, canvas.height)
    context.stroke()
  })

  // Draw final boundary
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1]
    const endPixel = lastSegment.endTime * pixelsPerSecond
    context.strokeStyle = `rgba(0,0,0,0.1)`
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(endPixel, 0)
    context.lineTo(endPixel, canvas.height)
    context.stroke()
  }
}

/**
 * Draws a draggable boundary highlight on canvas
 *
 * @param canvas - HTML canvas element
 * @param boundaryPixelX - X position of boundary in pixels
 */
export function drawBoundaryHighlight(
  canvas: HTMLCanvasElement,
  boundaryPixelX: number
): void {
  const context = canvas.getContext('2d')
  if (!context) return

  // Draw highlight for draggable boundary
  context.strokeStyle = 'rgba(255, 0, 0, 0.6)'
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(boundaryPixelX, 0)
  context.lineTo(boundaryPixelX, canvas.height)
  context.stroke()
}

/**
 * Finds segment boundary near a given pixel position
 *
 * @param segments - Array of segments
 * @param canvasWidth - Width of canvas in pixels
 * @param duration - Total audio duration in seconds
 * @param pixelX - X position to check (in canvas pixels)
 * @param tolerance - Tolerance in pixels (default 5)
 * @returns Object with segment index, boundary type, and position, or null
 */
export function findNearestBoundary(
  segments: Segment[],
  canvasWidth: number,
  duration: number,
  pixelX: number,
  tolerance: number = 5
): {
  segmentIndex: number
  boundaryType: 'start' | 'end'
  boundaryTime: number
  pixelPosition: number
} | null {
  if (segments.length === 0 || duration <= 0) return null

  const pixelsPerSecond = canvasWidth / duration

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    // Check end boundary
    const endPixel = segment.endTime * pixelsPerSecond
    if (Math.abs(pixelX - endPixel) < tolerance) {
      return {
        segmentIndex: i,
        boundaryType: 'end',
        boundaryTime: segment.endTime,
        pixelPosition: endPixel,
      }
    }

    // Check start boundary
    const startPixel = segment.startTime * pixelsPerSecond
    if (Math.abs(pixelX - startPixel) < tolerance) {
      return {
        segmentIndex: i,
        boundaryType: 'start',
        boundaryTime: segment.startTime,
        pixelPosition: startPixel,
      }
    }
  }

  return null
}

/**
 * Converts pixel position to time
 *
 * @param pixelX - X position in pixels
 * @param canvasWidth - Canvas width in pixels
 * @param duration - Audio duration in seconds
 * @returns Time in seconds
 */
export function pixelToTime(
  pixelX: number,
  canvasWidth: number,
  duration: number
): number {
  if (canvasWidth <= 0 || duration <= 0) return 0
  return (pixelX / canvasWidth) * duration
}

/**
 * Converts time to pixel position
 *
 * @param time - Time in seconds
 * @param canvasWidth - Canvas width in pixels
 * @param duration - Audio duration in seconds
 * @returns Pixel position
 */
export function timeToPixel(
  time: number,
  canvasWidth: number,
  duration: number
): number {
  if (duration <= 0) return 0
  return (time / duration) * canvasWidth
}

/**
 * Snaps time to grid interval
 *
 * @param time - Time in seconds
 * @param gridIntervalMs - Grid interval in milliseconds
 * @returns Snapped time in seconds
 */
export function snapTimeToGrid(time: number, gridIntervalMs: number): number {
  const gridIntervalSeconds = gridIntervalMs / 1000
  return Math.round(time / gridIntervalSeconds) * gridIntervalSeconds
}

/**
 * Converts hex color to RGB array
 *
 * @param hex - Hex color string (e.g., '#FF0000')
 * @returns Array of [R, G, B] values (0-255)
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0]
}

/**
 * Gets segment info string for display
 *
 * @param segmentIndex - Current segment index
 * @param totalSegments - Total number of segments
 * @param segment - Current segment data
 * @returns Formatted info string
 */
export function getSegmentInfoString(
  segmentIndex: number,
  totalSegments: number,
  segment: Segment
): string {
  const startTime = formatTime(segment.startTime)
  const endTime = formatTime(segment.endTime)
  return `Segment ${segmentIndex + 1} of ${totalSegments}, ${startTime}-${endTime}`
}

/**
 * Formats time in seconds to MM:SS format
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
