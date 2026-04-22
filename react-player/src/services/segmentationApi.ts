export interface Segment {
  id: number
  text: string
  start: number
  end: number
  confidence: number
}

export interface SegmentationResponse {
  success: boolean
  language: string
  duration: number
  segments: Segment[]
}

function isValidFilePath(filePath: string): boolean {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    return false
  }

  const normalized = filePath.trim()
  const windowsPath = /^[a-zA-Z]:[\\/].+$/
  const uncPath = /^\\\\.+$/
  const posixPath = /^\/.+$/

  return windowsPath.test(normalized) || uncPath.test(normalized) || posixPath.test(normalized)
}

export async function uploadAudio(fileOrPath: File | string): Promise<SegmentationResponse> {
  const isFile = fileOrPath instanceof File

  if (!isFile && !isValidFilePath(fileOrPath)) {
    throw new Error('Invalid file path. Provide a valid Windows or POSIX file path string.')
  }

  const requestOptions: RequestInit = isFile
    ? {
        method: 'POST',
        body: (() => {
          const formData = new FormData()
          formData.append('file', fileOrPath)
          return formData
        })(),
      }
    : {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: fileOrPath }),
      }

  const res = await fetch('http://localhost:9000/v1/segment', requestOptions)

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}: ${res.statusText}`)
  }

  try {
    const data = await res.json()
    if (!data.success) {
      throw new Error(`API returned success: false - ${data.error || 'Unknown error'}`)
    }
    return data
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON response from API')
    }
    throw error
  }
}