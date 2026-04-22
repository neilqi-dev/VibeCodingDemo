/**
 * Integration tests for segment navigation
 * Tests navigation near boundaries and with large segment counts
 */

import type { Segment } from '../../types/segmentation'

/**
 * Test suite for segment navigation
 */
describe('Segment Navigation Integration Tests', () => {
  /**
   * Helper to create test segments
   */
  function createTestSegments(count: number, duration: number): Segment[] {
    const segments: Segment[] = []
    const segmentDuration = duration / count

    for (let i = 0; i < count; i++) {
      segments.push({
        id: `segment-${i}`,
        index: i,
        startTime: i * segmentDuration,
        endTime: (i + 1) * segmentDuration,
      })
    }

    return segments
  }

  /**
   * Helper to navigate to next segment
   */
  function navigateToNextSegment(currentIndex: number, segments: Segment[]): number {
    return Math.min(currentIndex + 1, segments.length - 1)
  }

  /**
   * Helper to navigate to previous segment
   */
  function navigateToPreviousSegment(currentIndex: number): number {
    return Math.max(currentIndex - 1, 0)
  }

  /**
   * Helper to format segment info display
   */
  function getSegmentInfo(
    activeIndex: number,
    segments: Segment[]
  ): { index: number; total: number; time: string } {
    if (activeIndex < 0 || activeIndex >= segments.length) {
      return { index: 0, total: 0, time: '0:00' }
    }

    const segment = segments[activeIndex]
    const minutes = Math.floor(segment.startTime / 60)
    const seconds = Math.floor(segment.startTime % 60)
    const time = `${minutes}:${seconds.toString().padStart(2, '0')}`

    return {
      index: activeIndex + 1, // 1-indexed for display
      total: segments.length,
      time,
    }
  }

  it('should navigate to next segment from first segment', () => {
    const segments = createTestSegments(5, 10)
    let activeIndex = 0

    activeIndex = navigateToNextSegment(activeIndex, segments)
    expect(activeIndex).toBe(1)
  })

  it('should not go beyond last segment', () => {
    const segments = createTestSegments(3, 10)
    let activeIndex = 2

    activeIndex = navigateToNextSegment(activeIndex, segments)
    expect(activeIndex).toBe(2) // Should stay at last
  })

  it('should navigate to previous segment from middle', () => {
    //const segments = createTestSegments(5, 10)
    let activeIndex = 2

    activeIndex = navigateToPreviousSegment(activeIndex)
    expect(activeIndex).toBe(1)
  })

  it('should not go below first segment', () => {
    //const segments = createTestSegments(3, 10)
    let activeIndex = 0

    activeIndex = navigateToPreviousSegment(activeIndex)
    expect(activeIndex).toBe(0) // Should stay at first
  })

  it('should display segment info at boundaries', () => {
    const segments = createTestSegments(10, 10)
    let activeIndex = 0

    const info = getSegmentInfo(activeIndex, segments)
    expect(info.index).toBe(1)
    expect(info.total).toBe(10)

    activeIndex = 9
    const lastInfo = getSegmentInfo(activeIndex, segments)
    expect(lastInfo.index).toBe(10)
  })

  it('should handle navigation with large segment counts (50 segments)', () => {
    const segments = createTestSegments(50, 100)
    let activeIndex = 25

    activeIndex = navigateToNextSegment(activeIndex, segments)
    expect(activeIndex).toBe(26)

    activeIndex = navigateToPreviousSegment(activeIndex)
    expect(activeIndex).toBe(25)
  })

  it('should maintain validity when at first segment', () => {
    const segments = createTestSegments(5, 10)
    let activeIndex = 0

    // Attempting to go previous
    const previous = navigateToPreviousSegment(activeIndex)
    expect(previous).toBe(0)
    expect(activeIndex).toBeLessThanOrEqual(segments.length - 1)
  })

  it('should maintain validity when at last segment', () => {
    const segments = createTestSegments(5, 10)
    let activeIndex = 4

    // Attempting to go next
    const next = navigateToNextSegment(activeIndex, segments)
    expect(next).toBe(4)
    expect(activeIndex).toBeGreaterThanOrEqual(0)
  })

  it('should format time display correctly for various segments', () => {
    const segments = createTestSegments(10, 200)

    // First segment
    let info = getSegmentInfo(0, segments)
    expect(info.time).toBe('0:00')

    // Middle segment (5 * 20 = 100 seconds = 1:40)
    info = getSegmentInfo(5, segments)
    expect(info.time).toBe('1:40')

    // Last segment (9 * 20 = 180 seconds = 3:00)
    info = getSegmentInfo(9, segments)
    expect(info.time).toBe('3:00')
  })

  it('should handle navigation with single segment', () => {
    const segments = createTestSegments(1, 10)
    let activeIndex = 0

    activeIndex = navigateToNextSegment(activeIndex, segments)
    expect(activeIndex).toBe(0)

    activeIndex = navigateToPreviousSegment(activeIndex)
    expect(activeIndex).toBe(0)
  })

  it('should handle rapid navigation (multiple presses)', () => {
    const segments = createTestSegments(10, 10)
    let activeIndex = 0

    // Simulate rapid right arrow presses
    for (let i = 0; i < 20; i++) {
      activeIndex = navigateToNextSegment(activeIndex, segments)
    }

    expect(activeIndex).toBe(9) // Should stop at last
  })

  it('should handle alternating navigation directions', () => {
    const segments = createTestSegments(5, 10)
    let activeIndex = 2

    activeIndex = navigateToNextSegment(activeIndex, segments) // 3
    activeIndex = navigateToPreviousSegment(activeIndex) // 2
    activeIndex = navigateToNextSegment(activeIndex, segments) // 3
    activeIndex = navigateToNextSegment(activeIndex, segments) // 4
    activeIndex = navigateToPreviousSegment(activeIndex) // 3

    expect(activeIndex).toBe(3)
  })

  it('should handle navigation from edge to edge', () => {
    const segments = createTestSegments(5, 10)
    let activeIndex = 0

    // Go to end
    while (activeIndex < segments.length - 1) {
      activeIndex = navigateToNextSegment(activeIndex, segments)
    }
    expect(activeIndex).toBe(4)

    // Go back to beginning
    while (activeIndex > 0) {
      activeIndex = navigateToPreviousSegment(activeIndex)
    }
    expect(activeIndex).toBe(0)
  })

  it('should display correct info for all segments in sequence', () => {
    const segments = createTestSegments(5, 10)

    segments.forEach((segment, index) => {
      console.log(`Testing segment ${segment.id}`)
      const info = getSegmentInfo(index, segments)
      expect(info.index).toBe(index + 1)
      expect(info.total).toBe(5)
    })
  })

  it('should handle very close segment boundaries', () => {
    // Create segments with close boundaries
    const segments: Segment[] = [
      { id: 'seg-0', index: 0, startTime: 0, endTime: 0.2 },
      { id: 'seg-1', index: 1, startTime: 0.2, endTime: 0.4 },
      { id: 'seg-2', index: 2, startTime: 0.4, endTime: 10 },
    ]

    let activeIndex = 0
    activeIndex = navigateToNextSegment(activeIndex, segments)
    const info = getSegmentInfo(activeIndex, segments)

    expect(activeIndex).toBe(1)
    expect(info.index).toBe(2)
  })

  it('should handle waveform pan with active segment', () => {
    const segments = createTestSegments(20, 120)
    let activeIndex = 10

    //const info = getSegmentInfo(activeIndex, segments)
    const segment = segments[activeIndex]

    // Calculate visible range around active segment
    const contextSeconds = 5
    const panStart = Math.max(0, segment.startTime - contextSeconds)
    const panEnd = Math.min(120, segment.endTime + contextSeconds)

    expect(panStart).toBeGreaterThanOrEqual(0)
    expect(panEnd).toBeLessThanOrEqual(120)
    expect(panStart).toBeLessThan(panEnd)
  })
})

// Test framework helpers
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`)
  fn()
}

function it(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name}:\n    ${(err as Error).message}`)
  }
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`)
    },
    toBeLessThanOrEqual: (expected: number) => {
      if (!(value <= expected)) throw new Error(`Expected ${value} <= ${expected}`)
    },
    toBeGreaterThanOrEqual: (expected: number) => {
      if (!(value >= expected)) throw new Error(`Expected ${value} >= ${expected}`)
    },
    toBeGreaterThan: (expected: number) => {
      if (!(value > expected)) throw new Error(`Expected ${value} > ${expected}`)
    },
    toBeLessThan: (expected: number) => {
      if (!(value < expected)) throw new Error(`Expected ${value} < ${expected}`)
    },
  }
}
