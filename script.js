// Global variables
let audioContext;
let audioElement;
let audioBuffer;
let waveformData = [];
let isPlaying = false;
let isRepeatMode = false;
let loopStart = 0;
let loopEnd = 0;
let canvas;
let ctx;

// Initialize audio context and elements
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioElement = new Audio();
    canvas = document.getElementById('waveformCanvas');
    ctx = canvas.getContext('2d');
}

// File upload handling
fileInput.addEventListener('change', handleFileSelect);
dropZone.addEventListener('click', () => fileInput.click());

// Drag and drop events
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type === 'audio/mpeg') {
        loadAudioFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    dropZone.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    dropZone.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'audio/mpeg') {
        loadAudioFile(files[0]);
    }
}

// Load and decode audio file
async function loadAudioFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Set up audio element
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    audioElement.src = url;
    
    // Generate waveform data
    generateWaveformData();
    
    // Draw waveform
    drawWaveform();
}

// Generate waveform data from audio buffer
function generateWaveformData() {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const samples = 800; // Number of bars to display
    const blockSize = Math.floor(channelData.length / samples);
    
    waveformData = [];
    
    for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        
        for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[blockStart + j]);
        }
        
        waveformData.push(sum / blockSize); // Average amplitude
    }
}

// Draw waveform on canvas
function drawWaveform() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = canvas.width / waveformData.length;
    const centerY = canvas.height / 2;
    
    ctx.fillStyle = '#007bff';
    
    waveformData.forEach((amplitude, index) => {
        const barHeight = amplitude * canvas.height;
        const x = index * barWidth;
        const y = centerY - barHeight / 2;
        
        // Highlight loop segment
        if (isRepeatMode && loopStart > 0 && loopEnd > 0) {
            const barTime = (index / waveformData.length) * audioBuffer.duration;
            if (barTime >= loopStart && barTime <= loopEnd) {
                ctx.fillStyle = '#28a745'; // Green for loop segment
            } else {
                ctx.fillStyle = '#6c757d'; // Gray for non-loop
            }
        }
        
        ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    
    // Reset fill style
    ctx.fillStyle = '#007bff';
    
    // Draw progress line if playing
    if (isPlaying && audioElement.duration) {
        drawProgressLine();
    }
}

// Draw red progress line
function drawProgressLine() {
    const progress = audioElement.currentTime / audioElement.duration;
    const x = progress * canvas.width;
    
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
}

// Playback controls
playPauseBtn.addEventListener('click', togglePlayPause);

function togglePlayPause() {
    if (!audioBuffer) return;
    
    if (isPlaying) {
        audioElement.pause();
        isPlaying = false;
        playPauseBtn.textContent = 'Play';
    } else {
        audioElement.play();
        isPlaying = true;
        playPauseBtn.textContent = 'Pause';
    }
}

// Audio element events
audioElement.addEventListener('timeupdate', updateProgress);
audioElement.addEventListener('ended', handleAudioEnd);

function updateProgress() {
    if (isPlaying) {
        // Handle loop logic
        if (isRepeatMode && loopStart > 0 && loopEnd > 0) {
            if (audioElement.currentTime >= loopEnd) {
                audioElement.currentTime = loopStart;
            }
        }
        
        drawWaveform(); // Redraw with updated progress line
    }
}

function handleAudioEnd() {
    isPlaying = false;
    playPauseBtn.textContent = 'Play';
    drawWaveform(); // Final redraw
}

// Click to seek on waveform
canvas.addEventListener('click', handleCanvasClick);

function handleCanvasClick(event) {
    if (!audioBuffer || !audioElement.duration) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / canvas.width;
    const time = progress * audioElement.duration;
    
    if (isRepeatMode) {
        // Handle loop selection
        if (loopStart === 0 && loopEnd === 0) {
            // First click - set start
            loopStart = time;
        } else if (loopEnd === 0) {
            // Second click - set end
            loopEnd = time;
            if (loopEnd <= loopStart) {
                // Invalid - reset
                loopStart = 0;
                loopEnd = 0;
            }
        } else {
            // Reset for new selection
            loopStart = time;
            loopEnd = 0;
        }
        drawWaveform();
    } else {
        // Normal seek
        audioElement.currentTime = time;
        if (!isPlaying) {
            drawWaveform(); // Update progress line even when paused
        }
    }
}

// Repeat mode functionality
repeatBtn.addEventListener('click', toggleRepeatMode);

function toggleRepeatMode() {
    if (isRepeatMode) {
        // Exit repeat mode
        isRepeatMode = false;
        repeatBtn.textContent = 'Repeat';
        loopStart = 0;
        loopEnd = 0;
        drawWaveform(); // Clear loop highlighting
    } else {
        // Enter repeat mode
        isRepeatMode = true;
        repeatBtn.textContent = 'Back to Normal';
        if (isPlaying) {
            audioElement.pause();
            isPlaying = false;
            playPauseBtn.textContent = 'Play';
        }
    }
}