const express = require("express");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process"); // For managing the recording process
const { exec } = require("child_process");

// Set up Express server
const app = express();
const port = 4001;

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

// Create the 'audio' folder if it doesn't exist
const audioFolder = path.join(__dirname, "audio");
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder);
}

// Store the WebSocket clients
let wsClient = null;

// Handle incoming WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client connected");
  wsClient = ws;

  // Send message to client to request microphone access
  ws.send(JSON.stringify({ command: "request-microphone" }));

  ws.on("message", (message) => {
    const messageString = message.toString();
    console.log(`Received message: ${messageString}`);
    // Handle start and stop recording
    if (messageString === "start") {
      startRecording();
    } else if (messageString === "stop") {
      stopRecording();
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Start Express server and handle WebSocket upgrade
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Upgrade the HTTP server to WebSocket
server.on("upgrade", (request, socket, head) => {
  // Handle WebSocket upgrade
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Start recording process
let recordingProcess = null;

function startRecording() {
  const outputFilePath = path.join(__dirname, "audio", "recording.wav");

  // Start recording with sox (for macOS)
  exec(`sox -d ${outputFilePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting recording: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });

  console.log("Recording started...");
}

function stopRecording() {
  // Stop the recording by sending a SIGINT to the sox process
  exec("pkill sox", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error stopping recording: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log("Recording stopped and saved.");
  });
}
// Serve static files (for WebView)
app.use(express.static(path.join(__dirname, "public")));
