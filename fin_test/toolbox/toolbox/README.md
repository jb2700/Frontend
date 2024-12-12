<!--
 * Project Name: Speech to Code
 * Author: STC Team
 * Date: 12/12/2024
 * Last Modified: 12/12/2024
 * Version: 1.0
 * Copyright (c) 2024 Brown University
 * All rights reserved.
 * This file is part of the STC project.
 * Usage of this file is restricted to the terms specified in the
 * accompanying LICENSE file.
 -->

# Speech to Code Frontend Documentation

## Overview
Speech to Code (STC) is a VSCode extension that enables voice-to-code functionality, allowing developers to convert speech into code using a speech-to-text service and an AI model for code generation.

## Core Features
1. **Voice Recording Interface**
   - Real-time speech recording capabilities
   - WebSocket-based audio streaming
   - Recording controls (start/stop functionality)

2. **GitHub Authentication**
   - OAuth integration with GitHub
   - Secure user authentication flow
   - Token-based authorization

3. **Code Editor Integration**
   - Real-time cursor position tracking
   - Dynamic code insertion and modification
   - Context-aware code generation

4. **WebSocket Communication**
   - Real-time communication with backend services
   - Audio data streaming
   - Transcription and code generation results handling

## Key Components

### 1. Communication Handlers
```javascript
- connect_real_socket() // Establishes WebSocket connection for real-time transcription
- connectWebSocket() // Sets up WebSocket connection for audio streaming
- send_to_backend() // Handles communication with the backend AI service
```

### 2. Recording Functions
```javascript
- startRecording() // Initiates audio recording
- stopRecording() // Stops audio recording
- sendWavFile() // Sends recorded audio to the backend
```

### 3. UI Components
```javascript
- openSidebar() // Creates and manages the extension's sidebar interface
- openLoginView() // Handles GitHub login interface
- getWebviewContent() // Generates the HTML content for the extension's UI
```

### 4. Code Management
```javascript
- handleBackendResponseFromData() // Processes AI-generated code responses
- insertCodeAtPosition() // Inserts code at specific editor positions
- trackCursorPosition() // Monitors cursor position for context awareness
```

## Technical Details

### WebSocket Endpoints
- Transcription Service: `ws://142.112.54.19:43102`
- Backend AI Service: `http://142.112.54.19:43186`

### Authentication
- GitHub OAuth integration
- Client ID and secret configuration
- Redirect URI handling

### Audio Processing
- WAV file format support
- Real-time audio streaming
- File system integration for audio storage

## Data Flow
1. User initiates voice recording
2. Audio is captured and streamed to the transcription service
3. Transcribed text is sent to the AI backend
4. Generated code is received and displayed in the editor
5. User can accept or reject the generated code

## Usage Instructions
1. Install the extension in VSCode
2. Authenticate with GitHub
3. Open the STC sidebar
4. Click the record button to start voice input
5. Review and accept/reject the generated code

## Dependencies
- Express.js for local server
- WebSocket for real-time communication
- Node-microphone for audio capture
- WAV for audio processing
- VSCode Extension API

## Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure GitHub OAuth credentials
4. Run the extension in debug mode

## Error Handling
- WebSocket connection management
- Audio recording fallbacks
- GitHub authentication error handling
- Backend service communication retries