import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadAudio } from './segmentationApi'

describe('segmentationApi uploadAudio', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn() as any
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.resetAllMocks()
  })

  it('uploads a File using multipart/form-data', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        language: 'en',
        duration: 1,
        segments: [{ id: 1, text: 'segment', start: 0, end: 1, confidence: 0.9 }],
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const file = new File(['dummy audio'], 'test.mp3', { type: 'audio/mpeg' })
    const result = await uploadAudio(file)

    expect(result.success).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const fetchOptions = (globalThis.fetch as any).mock.calls[0][1]
    expect(fetchOptions.method).toBe('POST')
    expect(fetchOptions.body).toBeInstanceOf(FormData)
    expect((fetchOptions.body as FormData).get('file')).toBe(file)
  })

  it('sends JSON with file_path when passed a string path', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        language: 'en',
        duration: 1,
        segments: [{ id: 1, text: 'segment', start: 0, end: 1, confidence: 0.9 }],
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const result = await uploadAudio('C:\\Users\\user\\test.mp3')

    expect(result.success).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const fetchOptions = (globalThis.fetch as any).mock.calls[0][1]
    expect(fetchOptions.method).toBe('POST')
    expect(fetchOptions.headers['Content-Type']).toBe('application/json')
    expect(fetchOptions.body).toBe(JSON.stringify({ file_path: 'C:\\Users\\user\\test.mp3' }))
  })

  // Task 5.3: Content-Type headers test
  it('sets correct Content-Type header for FormData (File)', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        language: 'en',
        duration: 1,
        segments: [{ id: 1, text: 'segment', start: 0, end: 1, confidence: 0.9 }],
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const file = new File(['dummy audio'], 'test.mp3', { type: 'audio/mpeg' })
    await uploadAudio(file)

    const fetchOptions = (globalThis.fetch as any).mock.calls[0][1]
    // FormData automatically sets Content-Type with boundary, we should NOT set it manually
    expect(fetchOptions.headers).toBeUndefined()
  })

  it('sets application/json Content-Type for string path', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        language: 'en',
        duration: 1,
        segments: [{ id: 1, text: 'segment', start: 0, end: 1, confidence: 0.9 }],
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const filePath = 'C:\\Users\\test\\audio.mp3'
    await uploadAudio(filePath)

    const fetchOptions = (globalThis.fetch as any).mock.calls[0][1]
    expect(fetchOptions.headers['Content-Type']).toBe('application/json')
  })

  // Task 5.4: Integration test for auto-repeat mode with file path
  it('handles Windows file paths with spaces and special characters', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        language: 'en',
        duration: 5,
        segments: [
          { id: 1, text: 'segment1', start: 0, end: 2.5, confidence: 0.9 },
          { id: 2, text: 'segment2', start: 2.5, end: 5, confidence: 0.85 },
        ],
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const filePath = 'C:\\Users\\A472180\\OneDrive - Volvo Group\\#H\\My Documents\\DictationTool\\MP3\\test.mp3'
    const result = await uploadAudio(filePath)

    expect(result.success).toBe(true)
    expect(result.segments).toHaveLength(2)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    
    const fetchCall = (globalThis.fetch as any).mock.calls[0]
    expect(fetchCall[0]).toBe('http://localhost:9000/v1/segment')
    
    const fetchOptions = fetchCall[1]
    const bodyObj = JSON.parse(fetchOptions.body)
    expect(bodyObj.file_path).toBe(filePath)
  })

  // Task 5.5: Backward compatibility verification
  it('maintains backward compatibility with File uploads', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: true,
        language: 'en',
        duration: 10,
        segments: [{ id: 1, text: 'segment', start: 0, end: 10, confidence: 0.95 }],
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const file = new File(['audio content'], 'legacy.mp3', { type: 'audio/mpeg' })
    const result = await uploadAudio(file)

    expect(result.success).toBe(true)
    expect(result.segments).toHaveLength(1)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    
    const fetchOptions = (globalThis.fetch as any).mock.calls[0][1]
    expect(fetchOptions.method).toBe('POST')
    expect(fetchOptions.body).toBeInstanceOf(FormData)
  })

  it('provides proper error messages for invalid file paths', async () => {
    const invalidPaths = ['', '  ', 'relative/path.mp3', 'no-separator-path.mp3']

    for (const invalidPath of invalidPaths) {
      await expect(uploadAudio(invalidPath)).rejects.toThrow('Invalid file path')
    }

    // Should not call fetch for invalid paths
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('handles API errors gracefully for both file types', async () => {
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }

    ;(globalThis.fetch as any).mockResolvedValue(errorResponse)

    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
    
    await expect(uploadAudio(file)).rejects.toThrow('API request failed with status 500')

    // Reset mock
    ;(globalThis.fetch as any).mockClear()

    // Test with string path
    ;(globalThis.fetch as any).mockResolvedValue(errorResponse)
    await expect(uploadAudio('C:\\audio\\test.mp3')).rejects.toThrow('API request failed with status 500')
  })

  it('handles JSON parse errors correctly', async () => {
    const invalidJsonResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => {
        throw new SyntaxError('Unexpected token')
      },
    }

    ;(globalThis.fetch as any).mockResolvedValue(invalidJsonResponse)

    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })
    
    await expect(uploadAudio(file)).rejects.toThrow('Invalid JSON response from API')
  })

  it('handles API success: false response', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        success: false,
        error: 'Invalid audio format',
      }),
    }

    ;(globalThis.fetch as any).mockResolvedValue(fakeResponse)

    const file = new File(['invalid'], 'test.mp3', { type: 'audio/mpeg' })
    
    await expect(uploadAudio(file)).rejects.toThrow('API returned success: false - Invalid audio format')
  })
})
