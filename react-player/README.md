# React MP3 Audio Player with Waveform

A React-based MP3 audio player featuring waveform visualization, progress tracking, click-to-seek functionality, and repeat mode for selected audio segments.

## Features

- **File Upload**: Upload MP3 files via file input or drag-and-drop
- **Waveform Visualization**: Real-time waveform display using Web Audio API
- **Progress Tracking**: Red progress indicator showing current playback position
- **Click-to-Seek**: Click anywhere on the waveform to jump to that position
- **Repeat Mode**: Select start and end positions to loop audio segments
- **Responsive Design**: Clean, modern UI with hover effects

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd react-player
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5174`

### Build for Production

```bash
npm run build
```

## Usage

1. **Upload an MP3 file**:
   - Click the upload area to select a file, or
   - Drag and drop an MP3 file onto the upload area

2. **Play/Pause**: Click the Play/Pause button to control playback

3. **Seek**: Click anywhere on the waveform to jump to that position

4. **Repeat Mode**:
   - Click "Repeat" to enter repeat mode (playback pauses)
   - Click on the waveform to set the start position (first click)
   - Click again to set the end position (second click)
   - The selected segment will be highlighted and loop continuously
   - Click "Back to Normal" to exit repeat mode

## Technical Details

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Audio Processing**: Web Audio API for waveform generation
- **Rendering**: HTML5 Canvas for waveform visualization
- **Styling**: CSS with responsive design

## Browser Support

- Chrome 14+
- Firefox 25+
- Safari 6+
- Edge 12+

(Browsers that support Web Audio API)

## Development

### Project Structure

```
src/
├── App.tsx          # Main application component
├── App.css          # Application styles
├── main.tsx         # Application entry point
└── assets/          # Static assets
```

### Key Components

- **App Component**: Main container managing all state and logic
- **File Upload**: Handles MP3 file selection and validation
- **Waveform Canvas**: Renders audio waveform and handles click events
- **Playback Controls**: Play/pause and repeat mode toggles

## License

This project is part of the VIbeCodeDemo workspace.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
