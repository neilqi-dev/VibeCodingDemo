import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import playIcon from './assets/play.svg'
import pauseIcon from './assets/pause.svg'
// import repeatIcon from './assets/repeat.svg'
import uploadIcon from './assets/upload.svg'
import removeIcon from './assets/remove.svg'
import { AudioSegmentationContainer } from './components/AudioSegmentationContainer'
import { SegmentationCanvas } from './components/AudioSegmentation/SegmentationCanvas'
import { AnalysisLoadingIndicator } from './components/AudioSegmentation/AnalysisLoadingIndicator'
import { useSegmentationState } from './hooks/useSegmentationState'
import type { Segment } from './types/segmentation'
//import ClipLoader from "react-spinners/ClipLoader"

// Repeat interval in milliseconds between segment repeats
const REPEAT_INTERVAL_MS = 400

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [playlist, setPlaylist] = useState<Array<{id: string, title: string, src: string, file?: File}>>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRepeatMode, setIsRepeatMode] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [loopStartMarker, setLoopStartMarker] = useState<number | null>(null)
  const [canvasWidth, setCanvasWidth] = useState<number>(0)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubtitleVisible, setIsSubtitleVisible] = useState(false)
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null)
  
  // Initialize segmentation state
  const segmentationState = useSegmentationState()
  
  const LOCAL_STORAGE_KEY = 'react-player-playlist'

  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const dragItemIndexRef = useRef<number | null>(null)
  const repeatIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const savePlaylistToLocalStorage = (list: Array<{id: string, title: string, src: string, file?: File}>) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list.map(({id, title, src}) => ({id, title, src}))))
    } catch (error) {
      console.warn('Could not save playlist to local storage', error)
    }
  }

  const loadPlaylistFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPlaylist(parsed)
        setCurrentTrackIndex(0)
      }
    } catch (error) {
      console.warn('Could not load playlist from local storage', error)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file as data URL'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  const resizeCanvas = () => {
    if (!canvasRef.current || !waveformContainerRef.current) return
    const containerWidth = Math.floor(waveformContainerRef.current.clientWidth)
    if (containerWidth > 0 && containerWidth !== canvasWidth) {
      setCanvasWidth(containerWidth)
    }
  }

  // Resize canvas width to container width and sync on DOM changes
  useEffect(() => {
    resizeCanvas()

    const observer = new ResizeObserver(() => {
      resizeCanvas()
    })

    if (waveformContainerRef.current) {
      observer.observe(waveformContainerRef.current)
    }

    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      observer.disconnect()
    }
  }, [canvasWidth])

  useEffect(() => {
    loadPlaylistFromLocalStorage()
  }, [])

  useEffect(() => {
    savePlaylistToLocalStorage(playlist)
  }, [playlist])

  useEffect(() => {
    if (canvasRef.current && canvasWidth > 0) {
      canvasRef.current.width = canvasWidth
      canvasRef.current.height = 200
    }
  }, [canvasWidth])

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) {
      console.log('Canvas or waveform data not ready:', { canvas: !!canvasRef.current, waveformLength: waveformData.length })
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get canvas context')
      return
    }

    console.log('Drawing waveform with', waveformData.length, 'samples')

    const width = canvas.width
    const height = canvas.height
    const barWidth = width / waveformData.length
    console.log('Canvas dimensions:', { width, height, barWidth })

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Fill background with white
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform bars
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 1;
    let drawnBars = 0
    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * height // Increased scaling for visibility
      const x = index * barWidth
      const y = (height - barHeight) / 2
      //ctx.fillRect(x, y, barWidth - 1, barHeight)
      ctx.moveTo(x, y);
      ctx.lineTo(x, (y + barHeight));
      if (barHeight > 1) drawnBars++ // Count visible bars
    })
    ctx.stroke();
    console.log('Waveform drawing complete:', { drawnBars, totalBars: waveformData.length })

    // Draw progress line
    if (duration > 0) {
      const progressRatio = currentTime / duration
      const progressX = progressRatio * width
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(progressX, 0)
      ctx.lineTo(progressX, height)
      ctx.stroke()
    }

    // Draw loop segment highlight
    if (isRepeatMode && loopStart !== null && loopEnd !== null) {
      const startRatio = loopStart / duration
      const endRatio = loopEnd / duration
      const startX = startRatio * width
      const endX = endRatio * width

      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
      ctx.fillRect(startX, 0, endX - startX, height)

      // Draw loop boundaries
      ctx.strokeStyle = '#ffff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, height)
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, height)
      ctx.stroke()
    }

    // Draw loop start marker in repeat mode
    if (isRepeatMode && loopStartMarker !== null) {
      const markerRatio = loopStartMarker / duration
      const markerX = markerRatio * width
      ctx.strokeStyle = '#0000ff' // Blue line
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(markerX, 0)
      ctx.lineTo(markerX, height)
      ctx.stroke()
    }
  }, [waveformData, currentTime, duration, isRepeatMode, loopStart, loopEnd, loopStartMarker, canvasWidth])

  const processAudioFile = async (file: File) => {
    // Initialize AudioContext if not already created
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext()
        console.log('AudioContext initialized')
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error)
        alert('AudioContext initialization failed. Please try again.')
        return
      }
    }

    try {
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)

      // Store audio buffer for segmentation analysis
      setAudioBuffer(audioBuffer)

      // Extract waveform data from audio buffer
      const channelData = audioBuffer.getChannelData(0) // Use first channel
      const samples = 800 // Number of bars to display
      const blockSize = Math.max(1, Math.floor(channelData.length / samples))
      const waveformData: number[] = []

      console.log('Generating waveform data:', { channelDataLength: channelData.length, samples, blockSize })

      for (let i = 0; i < samples; i++) {
        const start = blockSize * i
        let sum = 0
        for (let j = 0; j < blockSize && start + j < channelData.length; j++) {
          sum += Math.abs(channelData[start + j])
        }
        waveformData.push(sum / blockSize)
      }

      console.log('Waveform data generated:', { length: waveformData.length, min: Math.min(...waveformData), max: Math.max(...waveformData), avg: waveformData.reduce((a, b) => a + b, 0) / waveformData.length })

      setWaveformData(waveformData)
      setDuration(audioBuffer.duration)

      // Create audio URL and set it to the audio element
      if (audioRef.current) {
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src)
        }
        const audioUrl = URL.createObjectURL(file)
        audioRef.current.src = audioUrl
        console.log('Audio file processed successfully, duration:', audioBuffer.duration)
      }
    } catch (error) {
      console.error('Error processing audio file:', error)
      alert('Error loading audio file. Please try a different MP3 file.')
    }
  }

  const loadTrack = async (index: number) => {
    if (index < 0 || index >= playlist.length) return

    const track = playlist[index]
    setCurrentTrackIndex(index)
    setAudioFile(track.file ?? null)

    if (audioRef.current) {
      if (track.file) {
        await processAudioFile(track.file)
      } else {
        try {
          audioRef.current.src = track.src
          setWaveformData([])
          setDuration(0)
          setCurrentTime(0)

          // Attempt waveform for URL if CORS allows
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext()
          }
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume()
          }

          const response = await fetch(track.src)
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
            setDuration(audioBuffer.duration)
            setWaveformData([])
          }
        } catch (error) {
          console.warn('Could not generate waveform for URL track:', error)
        }
      }
    }

    setIsPlaying(false)
  }

  const moveTrack = (from: number, to: number) => {
    if (from < 0 || from >= playlist.length || to < 0 || to >= playlist.length || from === to) return
    const updated = [...playlist]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)

    let nextIndex = currentTrackIndex
    if (currentTrackIndex === from) {
      nextIndex = to
    } else if (from < currentTrackIndex && to >= currentTrackIndex) {
      nextIndex = currentTrackIndex - 1
    } else if (from > currentTrackIndex && to <= currentTrackIndex) {
      nextIndex = currentTrackIndex + 1
    }

    setPlaylist(updated)
    setCurrentTrackIndex(nextIndex)

    if (nextIndex >= 0) {
      loadTrack(nextIndex)
    }
  }

  const removeTrack = (index: number) => {
    if (index < 0 || index >= playlist.length) return

    const updated = playlist.filter((_, i) => i !== index)
    let nextIndex = currentTrackIndex

    if (index === currentTrackIndex) {
      if (updated.length === 0) {
        nextIndex = -1
        setWaveformData([])
        setDuration(0)
        setCurrentTime(0)
        setIsPlaying(false)
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.src = ''
        }
      } else if (index >= updated.length) {
        nextIndex = updated.length - 1
      }
    } else if (index < currentTrackIndex) {
      nextIndex = currentTrackIndex - 1
    }

    setPlaylist(updated)
    setCurrentTrackIndex(nextIndex)

    if (nextIndex >= 0) {
      loadTrack(nextIndex)
    }
  }

  const selectTrack = async (index: number) => {
    if (index < 0 || index >= playlist.length) return
    await loadTrack(index)
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const onDragStart = (index: number) => {
    dragItemIndexRef.current = index
  }

  const onDragOver = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault()
  }

  const onDrop = (index: number) => {
    const from = dragItemIndexRef.current
    if (from === null) return
    moveTrack(from, index)
    dragItemIndexRef.current = null
  }

  const isValidAudioFile = (file: File) => {
    return file.type === 'audio/mpeg' || file.name.toLowerCase().endsWith('.mp3')
  }

  const createTrackFromFile = async (file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const src = await fileToDataUrl(file)
    return { id, title: file.name, src, file }
  }

  const handleFilesUpload = async (files: FileList) => {
    const selectedFiles = Array.from(files)
    const acceptedFiles = selectedFiles.filter(isValidAudioFile)
    const rejectedFiles = selectedFiles.filter((file) => !isValidAudioFile(file))

    if (rejectedFiles.length > 0) {
      alert('Some files were skipped because they are not valid MP3 files.')
    }

    if (acceptedFiles.length === 0) return

    const newTracks = await Promise.all(acceptedFiles.map(createTrackFromFile))
    const updated = [...playlist, ...newTracks]
    setPlaylist(updated)

    const firstNewIndex = playlist.length
    setCurrentTrackIndex(firstNewIndex)
    setAudioFile(acceptedFiles[0])
    await processAudioFile(acceptedFiles[0])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFilesUpload(files)
    }
  }

  const togglePlayPause = async () => {
    if (playlist.length === 0 || !audioRef.current) return

    if (currentTrackIndex < 0 && playlist.length > 0) {
      await selectTrack(0)
      return
    }

    if (currentTrackIndex >= 0 && playlist[currentTrackIndex] && !audioRef.current.src) {
      await selectTrack(currentTrackIndex)
      return
    }

    // Resume audio context if suspended (required by modern browsers)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.error('Play failed:', err)
      })
    }
  }

  const setRepeatMode = (mode: boolean) => {
    setIsRepeatMode(mode)
    if (!mode && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
    // Reset loop selection when exiting repeat mode
    if (mode) {
      setLoopStart(null)
      setLoopEnd(null)
      setLoopStartMarker(null) // Clear marker when exiting repeat mode
      // Reset segmentation state when exiting repeat mode
      segmentationState.reset()
    }
  }

  // const toggleRepeatMode = () => {
  //   setRepeatMode(!isRepeatMode)
  // }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioRef.current || duration === 0) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const clickRatio = x / rect.width
    const seekTime = clickRatio * duration

    if (isRepeatMode) {
      // In repeat mode, set loop start/end positions
      if (loopStart === null) {
        setLoopStart(seekTime)
        setLoopStartMarker(seekTime) // Set marker for visual feedback
      } else if (loopEnd === null) {
        setLoopEnd(seekTime)
        setLoopStartMarker(null) // Remove marker when loop starts
        // Start playing the loop
        audioRef.current.currentTime = loopStart
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
      }
    } else {
      // Normal seek
      audioRef.current.currentTime = seekTime
    }
  }

  const handleActiveSegmentChange = useCallback(
    (_index: number, segment: Segment) => {
      setLoopStart(segment.startTime)
      setLoopEnd(segment.endTime)
      setLoopStartMarker(null)

      if (audioRef.current) {
        audioRef.current.currentTime = segment.startTime
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.error('Could not start segment playback:', error)
          })
      }
    },
    []
  )

  return (
    <div className="app">
      <div className="player-container">
        <div className="player-grid">
          <div>
            {/* Waveform Component */}
            <div className="waveform-container" ref={waveformContainerRef}>
              <canvas
                ref={canvasRef}
                height={200}
                onClick={handleCanvasClick}
                className="waveform-canvas"
              />
              
              {/* Segmentation Visualization Overlay */}
              {isRepeatMode && segmentationState.mode === 'auto' && (
                <div className="segmentation-overlay">
                  <SegmentationCanvas
                    segments={segmentationState.segments}
                    duration={duration}
                    activeSegmentIndex={segmentationState.activeSegmentIndex}
                    visible={true}
                    gridSnapInterval={100}
                    canvasWidth={canvasWidth}
                    onBoundaryAdjust={(segmentIndex, boundaryType, newTime) => {
                      const segment = segmentationState.segments[segmentIndex]
                      if (segment) {
                        segmentationState.updateSegment(segmentIndex, {
                          ...segment,
                          [boundaryType === 'start' ? 'startTime' : 'endTime']: newTime,
                        })
                      }
                    }}
                  />
                </div>
              )}

              {/* Loading Indicator Overlay */}
              <AnalysisLoadingIndicator
                visible={isAnalyzing}
                message="Analyzing audio segments..."
              />
            </div>
            {isAnalyzing}
            {/* Subtitle Display Area */}
            {isSubtitleVisible && (
              <div className="subtitle-display">
                {currentSubtitle ? (
                  <p className="subtitle-text">{currentSubtitle}</p>
                ) : (
                  <p className="subtitle-placeholder">No subtitle available</p>
                )}
              </div>
            )}

            {/* Controls Component */}
            <div className="controls">
              <button
                type="button"
                className="icon-button"
                onClick={togglePlayPause}
                disabled={playlist.length === 0}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <img src={isPlaying ? pauseIcon : playIcon} alt="" aria-hidden="true" width="24" height="24" />
                <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Repeat Mode Switcher */}
              <div className="playback-mode-switch">
                <label className="playback-mode-switch-label">
                  <input
                    type="checkbox"
                    checked={isRepeatMode}
                    onChange={(e) => setRepeatMode(e.target.checked)}
                    disabled={playlist.length === 0}
                    className="playback-mode-switch-input"
                  />
                  <span className="playback-mode-switch-slider"></span>
                  <span className="playback-mode-switch-text">
                    {isRepeatMode ? 'Repeat' : 'Normal'}
                  </span>
                </label>
              </div>

              {/* Segmentation Controls */}
              <AudioSegmentationContainer
                audioContext={audioContextRef.current}
                audioBuffer={audioBuffer}
                audioFile={audioFile}
                duration={duration}
                isRepeatMode={isRepeatMode}
                canvasWidth={canvasWidth}
                onActiveSegmentChange={handleActiveSegmentChange}
                onAnalyzingChange={setIsAnalyzing}
                onSubtitleChange={setCurrentSubtitle}
              />

              {/* Subtitle Switcher - Only visible in repeat + auto mode  && segmentationState.mode === 'auto' */}
              {isRepeatMode && (
                <div className="playback-mode-switch">
                  <label className="playback-mode-switch-label">
                    <input
                      type="checkbox"
                      checked={isSubtitleVisible}
                      onChange={(e) => setIsSubtitleVisible(e.target.checked)}
                      className="playback-mode-switch-input"
                    />
                    <span className="playback-mode-switch-slider"></span>
                    <span className="playback-mode-switch-text">
                      {isSubtitleVisible ? 'Show' : 'Hide'} Subtitle
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="track-info">
              <strong>Current Track:</strong>{' '}
              {currentTrackIndex >= 0 && playlist[currentTrackIndex]
                ? playlist[currentTrackIndex].title
                : 'No track selected'}
            </div>

            <div className="track-status">
              <span>{Math.floor(currentTime)}s / {Math.floor(duration)}s</span>
            </div>
          </div>
        </div>
        <div className="playlist-panel">
          <h2>Playlist</h2>
{/* File Upload Component */}
        <div className="file-upload">
          <input
            type="file"
            accept=".mp3"
            multiple
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) {
                handleFilesUpload(files)
              }
            }}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className={`drop-zone ${isDragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            aria-label="Upload MP3 file(s)"
          >
            {playlist.length > 1 ? (
              <>
                <img src={uploadIcon} alt="Uploaded tracks" width="18" height="18" />
                <span>{playlist.length} files selected</span>
              </>
            ) : audioFile ? (
              <>
                <img src={uploadIcon} alt="Uploaded track" width="18" height="18" />
                <span className="sr-only">Loaded:</span> {audioFile.name}
              </>
            ) : (
              <>
                <img src={uploadIcon} alt="Upload icon" width="18" height="18" aria-hidden="true" />
                &nbsp;&nbsp;
                <span className="sr-only">Click to upload or drag MP3 file(s) here</span>
                <span>Click to upload or drag MP3 file(s) here</span>
              </>
            )}
          </label>
        </div>

          {playlist.length === 0 ? (
            <p>No tracks in playlist. Upload an MP3 file using the control above.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {playlist.map((track, index) => (
                <li
                  key={track.id}
                  className={`playlist-item ${index === currentTrackIndex ? 'active' : ''}`}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(index)}
                >
                  <span
                    style={{ cursor: 'move', flex: 1 }}
                    onClick={() => selectTrack(index)}
                  >
                    {track.title}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeTrack(index)}
                    aria-label={`Remove ${track.title}`}
                  >
                    <img src={removeIcon} alt="" aria-hidden="true" width="20" height="20" />
                    <span className="sr-only">Remove {track.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => {
            if (audioRef.current) {
              const newTime = audioRef.current.currentTime
              setCurrentTime(newTime)

              if (isRepeatMode && loopEnd !== null && newTime >= loopEnd && audioRef.current) {
                // Clear any existing interval timeout
                if (repeatIntervalRef.current) {
                  clearTimeout(repeatIntervalRef.current)
                }
                
                // Pause playback and set timeout to resume after interval
                audioRef.current.pause()
                repeatIntervalRef.current = setTimeout(() => {
                  if (audioRef.current && loopStart !== null) {
                    audioRef.current.currentTime = loopStart
                    audioRef.current.play()
                    setIsPlaying(true)
                  }
                }, REPEAT_INTERVAL_MS)
              }
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration)
              console.log('Audio metadata loaded, duration:', audioRef.current.duration)
            }
          }}
          onEnded={() => {
            console.log('Audio ended')
            if (isRepeatMode && loopStart !== null && loopEnd !== null && audioRef.current) {
              audioRef.current.currentTime = loopStart
              audioRef.current.play()
              setIsPlaying(true)
              return
            }

            const nextIndex = currentTrackIndex + 1
            if (nextIndex < playlist.length) {
              selectTrack(nextIndex)
            } else {
              setIsPlaying(false)
            }
          }}
          onError={(e) => {
            console.error('Audio error:', e)
          }}
          onCanPlay={() => {
            console.log('Audio can play')
          }}
        />
      </div>
    </div>
  )
}

export default App
