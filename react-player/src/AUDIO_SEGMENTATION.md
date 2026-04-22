/**
 * # Audio Segmentation Feature Documentation
 *
 * ## Overview
 *
 * The Audio Segmentation feature provides automatic and manual audio segmentation
 * capabilities for the React Player component, allowing users to break audio
 * into logical segments (sentences, phrases) for easier navigation and editing.
 *
 * ## Features
 *
 * ### Manual Mode (Default)
 * - Traditional repeat loop functionality
 * - Fixed start/end points for looping
 * - No automatic analysis required
 * - Compatible with all browsers
 *
 * ### Auto Mode (Web Audio API)
 * - Automatic segment detection based on audio characteristics
 * - Silence detection using energy levels
 * - Spectral flux analysis for acoustic transitions
 * - Interactive boundary adjustment with drag-and-drop
 * - Visual representation of segments on waveform
 * - Keyboard navigation (arrow keys)
 *
 * ## Architecture
 *
 * ### Core Components
 *
 * #### AudioSegmentationContainer
 * Main container managing all segmentation functionality
 *
 * ```typescript
 * interface AudioSegmentationContainerProps {
 *   audioContext: AudioContext | null
 *   audioBuffer: AudioBuffer | null
 *   duration: number
 *   isRepeatMode: boolean
 *   canvasWidth: number
 *   onSegmentAdjust?: (segmentIndex: number, boundaryType: 'start' | 'end', newTime: number) => void
 *   className?: string
 * }
 * ```
 *
 * #### ModeSwitch
 * Toggle control for Manual/Auto modes
 *
 * Properties:
 * - Visible only when repeat mode is active
 * - Auto-hides when repeat mode is exited
 * - Styled to match existing repeat UI
 * - Full keyboard and screen reader support
 *
 * #### SegmentationCanvas
 * Canvas overlay for visualizing segments
 *
 * Features:
 * - Semi-transparent colored bands for each segment
 * - Responsive to window/container resize
 * - Supports 2-20 visible segments
 * - Interactive boundary dragging with visual feedback
 *
 * #### SegmentNavigationButtons
 * Prev/Next controls for segment navigation
 *
 * Features:
 * - Disabled when at first/last segment
 * - Styled consistently with repeat UI
 * - ARIA labels for accessibility
 * - Keyboard focus indicators\n *
 * #### AnalysisLoadingIndicator
 * Shows analysis progress and status
 *
 * Features:
 * - \"Analyzing...\" spinner during processing
 * - Timeout detection (>10 seconds)
 * - Error message display
 * - Progress indication for long analyses
 *
 * ### Services
 *
 * #### segmentationEngine.ts\n * Core analysis engine with three main algorithms:
 *\n * **1. Silence Detection**
 * - Uses energy (RMS) calculation for each frame
 * - Default threshold: 0.01 (1% of max amplitude)
 * - Frame size: 2048 samples (~46ms at 44.1kHz)\n * - Identifies periods of low audio energy
 *\n * **2. Spectral Flux Analysis**
 * - Measures change in spectral magnitude frame-to-frame
 * - Detects acoustic state changes (consonants, phoneme transitions)
 * - Uses 70th percentile as detection threshold
 * - Helps find natural speech boundaries\n *\n * **3. Boundary Finding**
 * - Combines silence and spectral flux detection
 * - Enforces minimum segment duration (default: 0.5 seconds)
 * - Applies grid snapping (default: 100ms intervals)
 * - Ensures non-overlapping segments\n * **Configuration**
 *\n * Default values in `segmentationEngine.ts`:\n * ```typescript
 * const DEFAULT_CONFIG: SegmentationConfig = {
 *   silenceThreshold: 0.01,      // Energy threshold for silence (0-1)\n *   minSegmentDuration: 0.5,     // Minimum segment length in seconds\n *   spectralFluxThreshold: 0.1,   // Flux threshold for transitions (0-1)\n *   gridSnapInterval: 100,        // Snap grid in milliseconds\n * }
 * ```\n * ### Hooks\n * #### useSegmentationState()\n * Custom hook for managing segmentation state\n *\n * Returns:\n * ```typescript
 * {
 *   segments: Segment[]
 *   activeSegmentIndex: number
 *   mode: SegmentationMode\n *   setSegments: (segments: Segment[]) => void
 *   setActiveSegment: (index: number) => void
 *   setMode: (mode: SegmentationMode) => void
 *   resetState: () => void
 * }
 * ```\n * ### Types\n * #### Segment\n * ```typescript
 * interface Segment {
 *   id: string                 // Unique identifier\n *   index: number              // Position in segment array\n *   startTime: number          // Start time in seconds\n *   endTime: number            // End time in seconds\n * }
 * ```\n * #### SegmentationConfig\n * ```typescript
 * interface SegmentationConfig {
 *   silenceThreshold: number
 *   minSegmentDuration: number
 *   spectralFluxThreshold: number
 *   gridSnapInterval: number
 * }
 * ```\n * ## User Workflows\n *\n * ### Entering Auto Mode\n * 1. User enters repeat mode (click repeat button)\n * 2. Mode switch appears (Manual/Auto toggle)\n * 3. User clicks \"Auto\" in the switch\n * 4. \"Analyzing...\" spinner appears\n * 5. Audio buffer is analyzed (typically <5 seconds)\n * 6. Segments appear on waveform as colored bands\n * 7. Segment info displays: \"Segment 3 of 12, 1:45-2:15\"\n *\n * ### Adjusting Boundaries\n * 1. Hover near segment boundary on waveform\n * 2. Cursor changes to \"resize-horizontal\"\n * 3. Click and drag boundary to new position\n * 4. Boundary snaps to 100ms grid during drag\n * 5. Visualization updates in real-time\n * 6. Segment metadata is updated on mouse release\n *\n * ### Navigating Segments\n * **Using Buttons:**\n * 1. Click \"Previous\" or \"Next\" buttons\n * 2. Active segment index updates\n * 3. Waveform pans to show active segment with context\n * 4. Segment info updates\n * 5. Optional: auto-play starts at segment beginning\n *\n * **Using Keyboard:**\n * 1. Ensure focus is on repeat mode container\n * 2. Press \"Left Arrow\" for previous segment\n * 3. Press \"Right Arrow\" for next segment\n * 4. Navigation works across entire audio duration\n * 5. Edge case: can't navigate past first/last segment\n *\n * ### Exiting Auto Mode\n * 1. User clicks repeat button again (exits repeat mode)\n * 2. Mode switch disappears\n * 3. Segmentation state is reset\n * 4. Returns to standard player controls\n *\n * ## Performance Considerations\n *\n * ### Analysis Time\n * - Small files (<1 min): ~500ms\n * - Medium files (5-10 min): ~2-3 seconds\n * - Large files (30+ min): ~5-8 seconds\n * - Timeout: 10 seconds maximum\n *\n * ### Memory Usage\n * - AudioBuffer: Stored in Web Audio context\n * - Segment array: Minimal (~100 bytes per segment)\n * - Canvas: Uses hardware acceleration on modern browsers\n * - No significant memory leaks observed in testing\n *\n * ### Canvas Rendering\n * - Optimized for 2-20 segments\n * - Responsive canvas resize on window change\n * - Semi-transparent rendering with hardware acceleration\n * - Smooth drag updates at 60 FPS\n *\n * ## Browser Compatibility\n *\n * | Feature | Chrome | Firefox | Safari | Edge |\n * |---------|--------|---------|--------|------|\n * | AudioContext | ✓ | ✓ | ✓ | ✓ |\n * | OfflineAudioContext | ✓ | ✓ | ✓ | ✓ |\n * | AnalyserNode | ✓ | ✓ | ✓ | ✓ |\n * | Canvas | ✓ | ✓ | ✓ | ✓ |\n * | **Auto Mode** | ✓ | ✓ | ✓ | ✓ |\n *\n * **Fallback Behavior:** If Web Audio API is unavailable, Auto mode is disabled\n * and only Manual mode is available.\n *\n * ## Development\n *\n * ### Testing\n * - Unit tests: `segmentationEngine.test.ts`\n * - Integration tests: `SegmentationCanvas.test.ts`, `BoundaryDrag.test.ts`,\n *   `KeyboardNavigation.test.ts`, `SegmentNavigation.test.ts`\n * - E2E workflow testing recommended\n *\n * ### Debugging\n * Enable debug logging:\n * ```typescript\n * import { logWebAudioEnvironmentInfo } from './utils/webAudioCompatibility'\n * logWebAudioEnvironmentInfo() // Logs browser capabilities\n * ```\n *\n * ### Known Issues\n * - Very fast audio transitions may create overlapping boundary suggestions\n * - Touch drag on mobile may have slight latency\n * - Memory spike on files >60 minutes (consider chunked analysis)\n *\n * ### Future Enhancements\n * - Chunked analysis for very large files\n * - User-trainable segmentation model\n * - Export segments as markers\n * - Audio preprocessing (noise reduction) before analysis\n * - Multi-language phoneme detection\n *\n * ## API Reference\n *\n * ### Creating AudioContext\n * ```typescript\n * import { createAudioContext } from './utils/webAudioCompatibility'\n * const ctx = createAudioContext()\n * ```\n *\n * ### Analyzing Audio\n * ```typescript\n * import { analyzeAudioSegmentation } from './services/segmentationEngine'\n * const result = await analyzeAudioSegmentation({\n *   audioBuffer: myAudioBuffer,\n *   sampleRate: 44100,\n *   config: {\n *     silenceThreshold: 0.01,\n *     minSegmentDuration: 0.5,\n *   }\n * })\n * ```\n *\n * ### Checking Compatibility\n * ```typescript\n * import { isSegmentationAnalysisAvailable } from './utils/webAudioCompatibility'\n * if (isSegmentationAnalysisAvailable()) {\n *   // Show Auto mode option\n * }\n * ```\n *\n * ## Keyboard Shortcuts\n *\n * When repeat mode is active and segments are available:\n *\n * | Key | Action |\n * |-----|--------|\n * | Left Arrow | Previous segment |\n * | Right Arrow | Next segment |\n * | (Escape) | Exit repeat mode (existing) |\n * | (Enter) | Play current segment (if configured) |\n *\n * ## Accessibility\n *\n * - All controls have ARIA labels\n * - Keyboard navigation fully supported\n * - Screen reader compatible\n * - High contrast mode tested\n * - Focus indicators visible on all interactive elements\n * - Button text clearly describes action (\"Previous Segment\", \"Next Segment\")\n * - Segment info text announced programmatically\n *\n * ## Troubleshooting\n *\n * **Problem: Auto mode unavailable**\n * - Solution: Check browser compatibility (Chrome, Firefox, Safari, Edge recommended)\n * - Verify Web Audio API is not blocked by security policy\n * - Run `logWebAudioEnvironmentInfo()` to diagnose\n *\n * **Problem: Analysis takes too long**\n * - Solution: File may be very large (>30min recommended for optimization)\n * - Try reducing `minSegmentDuration` (may reduce accuracy)\n * - Clear browser cache and try again\n *\n * **Problem: Segments don't appear**\n * - Solution: Check AudioBuffer is properly loaded\n * - Verify audio file is not corrupted\n * - Try a different audio file to isolate issue\n *\n * **Problem: Dragging boundaries is sluggish**\n * - Solution: Enable hardware acceleration in browser\n * - Close other tabs/applications using GPU\n * - Check canvas size is reasonable (<4000px width)\n */\n