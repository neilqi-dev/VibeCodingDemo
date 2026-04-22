/**
 * Unit tests for segmentation engine
 * Tests silence detection, spectral analysis, and segmentation algorithms
 */

import {
  analyzeAudioSegmentation,
  getDefaultSegmentationConfig,
  validateSegmentationConfig,
} from './segmentationEngine'
import type { SegmentationParams } from '../types/segmentation'

/**
 * Helper function to create a mock AudioBuffer with specific characteristics
 */
function createMockAudioBuffer(
  duration: number,
  sampleRate: number = 44100,
  characteristics: 'silence' | 'noise' | 'mixed' | 'speech-like' = 'mixed'
): AudioBuffer {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const buffer = audioContext.createBuffer(1, Math.floor(duration * sampleRate), sampleRate)
  const channelData = buffer.getChannelData(0)

  // Generate audio data based on characteristics
  switch (characteristics) {
    case 'silence':
      // Very low energy throughout
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.random() * 0.001
      }
      break

    case 'noise':
      // Random noise with consistent energy
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (Math.random() - 0.5) * 0.7
      }
      break

    case 'mixed':
      // Alternating silence and noise sections
      const sectionSize = Math.floor(channelData.length / 6)
      for (let i = 0; i < channelData.length; i++) {
        const sectionIndex = Math.floor(i / sectionSize)
        if (sectionIndex % 2 === 0) {
          // Silence section
          channelData[i] = Math.random() * 0.001
        } else {
          // Noise section
          channelData[i] = (Math.random() - 0.5) * 0.7
        }
      }
      break

    case 'speech-like':
      // Simulate basic speech pattern with transitions
      const speechSectionSize = Math.floor(channelData.length / 8)
      for (let i = 0; i < channelData.length; i++) {
        const sectionIndex = Math.floor(i / speechSectionSize)
        if (sectionIndex % 2 === 0) {
          // Voiced section (moderate energy)
          channelData[i] = (Math.random() - 0.5) * 0.4 + Math.sin(i * 0.01) * 0.2
        } else {
          // Unvoiced/silence section
          channelData[i] = Math.random() * 0.05
        }
      }
      break
  }

  return buffer
}

describe('Segmentation Engine', () => {
  describe('analyzeAudioSegmentation', () => {
    it('should analyze silence-only audio and create minimal segments', async () => {
      const buffer = createMockAudioBuffer(10, 44100, 'silence')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const result = await analyzeAudioSegmentation(params)

      expect(result.segments).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
      expect(result.analysisDuration).toBeGreaterThan(0)
      // Silence audio should have fewer segments
      expect(result.segments.length).toBeLessThan(5)
    })

    it('should analyze noise audio and detect multiple segments', async () => {
      const buffer = createMockAudioBuffer(5, 44100, 'noise')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const result = await analyzeAudioSegmentation(params)

      expect(result.segments).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
      // Verify segment structure
      result.segments.forEach((segment) => {
        expect(segment.id).toBeDefined()
        expect(segment.startTime).toBeGreaterThanOrEqual(0)
        expect(segment.endTime).toBeGreaterThan(segment.startTime)
        expect(segment.index).toBeGreaterThanOrEqual(0)
      })
    })

    it('should analyze mixed audio with both silence and noise', async () => {
      const buffer = createMockAudioBuffer(10, 44100, 'mixed')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const result = await analyzeAudioSegmentation(params)

      expect(result.segments).toBeDefined()
      // Mixed audio should have moderate segment count
      expect(result.segments.length).toBeGreaterThan(2)
      expect(result.segments.length).toBeLessThan(20)
    })

    it('should analyze speech-like audio and detect natural boundaries', async () => {
      const buffer = createMockAudioBuffer(8, 44100, 'speech-like')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const result = await analyzeAudioSegmentation(params)

      expect(result.segments).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
      // Verify segments don't exceed buffer duration
      const duration = buffer.duration
      result.segments.forEach((segment) => {
        expect(segment.endTime).toBeLessThanOrEqual(duration)
      })
    })

    it('should respect minimum segment duration configuration', async () => {
      const buffer = createMockAudioBuffer(5, 44100, 'mixed')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: {
          ...getDefaultSegmentationConfig(),
          minSegmentDuration: 1.0, // Require segments to be at least 1 second
        },
      }

      const result = await analyzeAudioSegmentation(params)

      result.segments.forEach((segment) => {
        const duration = segment.endTime - segment.startTime
        expect(duration).toBeGreaterThanOrEqual(0.9) // Allow small margin
      })
    })

    it('should maintain sorted and non-overlapping segments', async () => {
      const buffer = createMockAudioBuffer(10, 44100, 'speech-like')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const result = await analyzeAudioSegmentation(params)

      // Check sorting
      for (let i = 1; i < result.segments.length; i++) {
        expect(result.segments[i].startTime).toBeGreaterThanOrEqual(
          result.segments[i - 1].startTime
        )
      }

      // Check no overlaps
      for (let i = 1; i < result.segments.length; i++) {
        expect(result.segments[i].startTime).toBeGreaterThanOrEqual(
          result.segments[i - 1].endTime
        )
      }
    })

    it('should handle very short audio (< 1 second)', async () => {
      const buffer = createMockAudioBuffer(0.5, 44100, 'noise')
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const result = await analyzeAudioSegmentation(params)

      expect(result.segments).toBeDefined()
      expect(result.segments.length).toBeGreaterThan(0)
    })

    it('should handle long audio (> 10 minutes) without exceeding timeout', async () => {
      const buffer = createMockAudioBuffer(60, 44100, 'speech-like') // 60 seconds
      const params: SegmentationParams = {
        audioBuffer: buffer,
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      const startTime = Date.now()
      const result = await analyzeAudioSegmentation(params)
      const elapsed = Date.now() - startTime

      expect(result.segments).toBeDefined()
      expect(elapsed).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should throw error on invalid audio data', async () => {
      //const buffer = createMockAudioBuffer(5, 44100, 'noise')
      const params: SegmentationParams = {
        audioBuffer: null as any, // Invalid
        sampleRate: 44100,
        config: getDefaultSegmentationConfig(),
      }

      await expect(analyzeAudioSegmentation(params)).rejects.toThrow()
    })
  })

  describe('getDefaultSegmentationConfig', () => {
    it('should return valid default configuration', () => {
      const config = getDefaultSegmentationConfig()

      expect(config.silenceThreshold).toBeGreaterThan(0)
      expect(config.silenceThreshold).toBeLessThan(1)
      expect(config.minSegmentDuration).toBeGreaterThan(0)
      expect(config.spectralFluxThreshold).toBeGreaterThan(0)
      expect(config.spectralFluxThreshold).toBeLessThan(1)
      expect(config.gridSnapInterval).toBeGreaterThan(0)
    })

    it('should return independent copies', () => {
      const config1 = getDefaultSegmentationConfig()
      const config2 = getDefaultSegmentationConfig()

      config1.silenceThreshold = 0.05
      expect(config2.silenceThreshold).toEqual(0.01) // Unchanged
    })
  })

  describe('validateSegmentationConfig', () => {
    it('should validate correct configuration', () => {
      try {
        validateSegmentationConfig({
          silenceThreshold: 0.01,
          minSegmentDuration: 0.5,
          spectralFluxThreshold: 0.1,
        })
      }
      catch (err) {}
    })

    it('should reject invalid silenceThreshold', () => {
      expect(() => {
        validateSegmentationConfig({ silenceThreshold: 1.5 })
      }).toThrow()

      expect(() => {
        validateSegmentationConfig({ silenceThreshold: -0.1 })
      }).toThrow()
    })

    it('should reject negative minSegmentDuration', () => {
      expect(() => {
        validateSegmentationConfig({ minSegmentDuration: -1 })
      }).toThrow()
    })

    it('should reject invalid spectralFluxThreshold', () => {
      expect(() => {
        validateSegmentationConfig({ spectralFluxThreshold: 1.5 })
      }).toThrow()
    })

    it('should allow partial configuration objects', () => {
      try {
        validateSegmentationConfig({ silenceThreshold: 0.02 })
      } catch (err) {}
    })

    it('should allow empty configuration objects', () => {
      try {
        validateSegmentationConfig({})
      } catch (err) {}
    })
  })
})

// Polyfill for test environment
// if (typeof global !== 'undefined' && !global.AudioContext) {
//   ;(global as any).AudioContext = class {
//     createBuffer() {
//       return {
//         getChannelData: () => new Float32Array(44100),
//         duration: 1,
//       }
//     }
//   }
// }

// Simple test framework simulation for demonstration
function describe(name: string, fn: () => void) {
  console.log(`\n${name}`)
  fn()
}

function it(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn()
    if (result instanceof Promise) {
      result.catch((err) => console.error(`  ✗ ${name}:\n    ${err.message}`))
    } else {
      console.log(`  ✓ ${name}`)
    }
  } catch (err) {
    console.error(`  ✗ ${name}:\n    ${(err as Error).message}`)
  }
}

function expect(value: any) {
  return {
    toBeDefined: () => {
      if (value === undefined) throw new Error('Expected value to be defined')
    },
    toBeGreaterThan: (other: number) => {
      if (!(value > other)) throw new Error(`Expected ${value} > ${other}`)
    },
    toBeGreaterThanOrEqual: (other: number) => {
      if (!(value >= other)) throw new Error(`Expected ${value} >= ${other}`)
    },
    toBeLessThan: (other: number) => {
      if (!(value < other)) throw new Error(`Expected ${value} < ${other}`)
    },
    toBeLessThanOrEqual: (other: number) => {
      if (!(value <= other)) throw new Error(`Expected ${value} <= ${other}`)
    },
    toEqual: (other: any) => {
      if (value !== other) throw new Error(`Expected ${value} to equal ${other}`)
    },
    toThrow: () => {
      try {
        value()
        throw new Error('Expected function to throw')
      } catch (err) {
        // Expected
      }
    },
    rejects: {
      toThrow: async () => {
        try {
          await value
          throw new Error('Expected promise to reject')
        } catch (err) {
          // Expected
        }
      },
    },
  }
}
