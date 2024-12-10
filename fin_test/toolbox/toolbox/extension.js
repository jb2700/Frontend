// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const Microphone = require("node-microphone");
const wav = require("wav");
// const { Worker } = require("worker_threads");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const app = express();
// const resampler = require("audio-resampler");
const port = 4001;
// const pcm = require("pcm");
// const AudioBufferUtils = require("audio-buffer-utils");

const fs = require("fs");
const { exec } = require("child_process");

let panel;

let socket;
let transctiption = "";
function connect_real_socket() {
  // socket = new WebSocket("ws://142.112.54.19:43102");
  socket = new WebSocket("ws://71.241.245.11:40978");
  console.log("HERE I AM ");
  socket.on("open", () => {
    console.log("gijjiorgrijoijogjioeriojgijo");
    console.log("Worker WebSocket connected");
  });

  socket.on("message", (data) => {
    const message = String(data);
    console.log("Received message from WebSocket: ", message);
    try {
      const parsedMessage = JSON.parse(message);
      transctiption = parsedMessage.transcription;
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
    // console.log(message[transcription]);
    // transctiption = message;
    console.log("here is teh transcription")
    console.log(transctiption);
    sendTranscriptionToWebview(panel);
  });
}


const wss = new WebSocket.Server({ noServer: true });


let recording_bool = false;

// Create the 'audio' folder if it doesn't exist
const audioFolder = path.join(__dirname, "audio");
if (!fs.existsSync(audioFolder)) {
  fs.mkdirSync(audioFolder);
}

let last_cursor_position = null;

let opened_editor = null;

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
      recording_bool = true;
      // startRecordingnew();
    } else if (messageString === "stop") {
      // recording_bool = false;
      console.log("Stopped recording");
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

function sendTranscriptionToWebview(panel) {
  panel.webview.postMessage({
    command: "setTranscription",
    transcription: transctiption,
  });
}

// Start recording process
let recordingProcess = null;
const outputFilePath = path.join(__dirname, "audio", "recording.wav");
function startRecording() {
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


function sendWavFile() {
  // Read the WAV file into a buffer
  fs.readFile(outputFilePath, (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return;
    }
    // Wait for the WebSocket connection to be open
    if (socket.readyState === WebSocket.OPEN) {
      // Send the file data over the WebSocket
      socket.send(data, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        } else {
          console.log("HERE is the data I sent");
          console.log(data);
          console.log("File sent successfully");
          let bool = false;
          for (let i = 0; i < data.length; i++) {
            if (data[i] < 0 || data[i] > 255) {
              bool = true;
            }
          }
          console.log("here is the boolean");
          console.log(bool);

        }
      });
    } else {
      console.error("WebSocket is not open");
    }
  });
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
  console.log("Before sending file");
  sendWavFile();
}

// Serve static files (for WebView)
app.use(express.static(path.join(__dirname, "public")));

let ws = null;

// Function to establish WebSocket connection
function connectWebSocket() {
  ws = new WebSocket("ws://localhost:4001");

  ws.on("open", () => {
    console.log("Connected to WebSocket server");
  });

  ws.on("message", (message) => {
    console.log("Received from server:", message);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

function generateRandomId() {
  return Math.floor(Math.random() * 1000000); // Example of random ID generation
}

async function send_to_backend() {
  if (opened_editor) {
    const document = opened_editor.document;
    const text = document.getText();

    const lines = text.split("\n");

    // Format the content into a key-value pair where keys are line numbers and values are line content
    const context = lines.reduce((acc, line, index) => {
      acc[(index + 1).toString()] = line; // Make sure the key is a string (like "1", "2", etc.)
      return acc;
    }, {});

    const id = generateRandomId();

    // Prepare the JSON structure
    const payload = {
      context: context,
      userid: "generated_from_github", // Replace this with actual logic to fetch the Github user ID
      conversationid: id, // Generate a random ID for the conversation
    };

    // Convert the payload to a JSON string
    const jsonString = JSON.stringify(payload, null, 2);

    // Optionally write the JSON string to a file (if required)
    const filePath = path.join(__dirname, "payload.json");

    fs.writeFile(filePath, jsonString, (err) => {
      if (err) {
        console.error("Error writing to file:", err);
      } else {
        console.log(`Payload written to ${filePath}`);
      }
    });

    // Optionally, send the payload to the backend instead of writing it to a file
    // sendToBackendAPI(payload);

    console.log("I AM HERE");

    console.log(JSON.stringify(payload));

    await fetch("http://142.112.54.19:43186/context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        // Handle the response data
        console.log(data);
      })
      .catch((error) => {
        // Handle any errors
        console.error("Error:", error);
      });
    //  async -> IP: 142.112.54.19:43186
    // send the /context endpoint first
    // and then send the user prompt (/prompt)
    // http://142.112.54.19:43186/prompt

    const new_pay = {
      userid: "generated_from_github",
      conversationid: id,
      prompt: "Edit this Calculator addition function to make it work as well as add multiplication and division",
    };
    await fetch("http://142.112.54.19:43186/prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(new_pay),
    })
      .then((response) => {
        // Check if the response is OK (status code 200-299)
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Check if the content type is JSON
        const contentType = response.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          return response.json(); // Parse the JSON response
        } else {
          return response.text(); // If it's not JSON, log the raw text
        }
      })
      .then((data) => {
        if (typeof data === "string") {
          // If data is a string (likely HTML), log the raw response
          console.log("Received non-JSON response:", data);
          // handleBackendResponseFromData(data);
        } else {
          // Handle the JSON response data
          console.log("Received JSON data:", data);
          handleBackendResponseFromData(data);
        }
      })
      .catch((error) => {
        // Handle any errors
        console.error("Error:", error);
      });
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "toolbox" is now active!');

  trackCursorPosition();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "toolbox.helloWorld",
    function () {
      vscode.window.showInformationMessage("Hello World from toolbox!");

      openSidebar();

      // startRecording();

      // openEndpoint();
    }
  );

  const github_auth = vscode.commands.registerCommand(
    "toolbox.githubauth",
    function () {
      githubauth();
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(github_auth);
}

// This function can be used to get the position based on line number
function getEditorPositionForLine(lineNumber) {
  // Assuming each line is separated by a newline and line numbers are 1-based
  return new vscode.Position(lineNumber, 0);
}

async function handleBackendResponseFromData(data) {
  console.log("HERE IS THE RESPONSE");
  console.log(data.data);

  console.log("here is data.response.code");
  console.log(data.data.code);
  // Ensure the structure exists before accessing the code
  if (data && data.data && data.data.code) {
    const codeLines = data.data.code;
    for (const [lineNumber, code] of Object.entries(codeLines)) {

      const position = getEditorPositionForLine(parseInt(lineNumber) - 1);

      while (lineNumber > opened_editor.document.lineCount) {
        await insertCodeAtPosition(
          opened_editor,
          getEditorPositionForLine(opened_editor.document.lineCount),
          "\n"
        );
      }
      const currentLineText = opened_editor.document.lineAt(
        parseInt(lineNumber) - 1
      ).text;
      if (currentLineText && currentLineText.trim() !== "") {
        await clear_code_at_position(
          opened_editor,
          position,
          " ",
          currentLineText.length,
          parseInt(lineNumber)
        );
        // Clear the current line (replace with "")
        // await insertCodeAtPosition(opened_editor, position, ""); // This clears the line
      }
      await insertCodeAtPosition(opened_editor, position, code);
    }
  } else {
    console.error("No code found in the backend response.");
  }
}

async function clear_code_at_position(editor, position, code, length, line_num) {
  const new_pos = new vscode.Position(line_num-1, length);
  const range = new vscode.Range(position, new_pos);
  console.log("Here is the range");
  console.log(range);
  try {
    const success = await editor.edit((editBuilder) => {
      // Replace the code at the specified position
      editBuilder.replace(range, code); // Replace code at the specified position with a newline
    });
    if (success) {
      console.log("Code replaced successfully!");
    } else {
      console.error("Failed to replace code.");
    }
  } catch (err) {
    // Handle any specific errors that occur during the edit
    console.error("Error during the code replace:", err);
  }

}
// this function 100% works
async function insertCodeAtPosition(editor, position, code) {
  try {
    console.log("POSITION HERE");
    console.log(position);
    console.log("CODE HERE");
    console.log(code);

    const success = await editor.edit((editBuilder) => {
      // Insert the code at the specified position
      editBuilder.insert(position, code); // Insert code at the specified position with a newline
    });
    if (success) {
      console.log("Code inserted successfully!");
    } else {
      console.error("Failed to insert code.");
    }
  } catch (err) {
    // Handle any specific errors that occur during the edit
    console.error("Error during the code insertion:", err);
  }
}

function trackCursorPosition() {
  vscode.window.onDidChangeTextEditorSelection((event) => {
    // Get the active editor
    const editor = event.textEditor;

    if (!editor) {
      // you can send the text using editor.document.getText() -> language agnostic
      return;
    }

    opened_editor = editor;
    // Get the cursor position
    const cursorPosition = editor.selection.active;
    console.log(
      `Cursor moved to: Line ${cursorPosition.line + 1}, Character ${
        cursorPosition.character
      }`
    );

    last_cursor_position = cursorPosition;

    // store the cursor position in a global variable somewhere that is constantly updated
  });
}

function githubauth() {}



function openSidebar() {
  panel = vscode.window.createWebviewPanel(
    "helloWorldSidebar",
    "Hello World Sidebar",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      enableCommandUris: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = getWebviewContent();

  connectWebSocket();
  connect_real_socket();

  panel.webview.onDidReceiveMessage((message) => {
    console.log("Message received:", message);
    switch (message.command) {
      case "play":
        console.log("Play button pressed in the sidebar.");
        if (ws) {
          ws.send("start");
        }
        break;
      case "stop":
        console.log("Stop button pressed in the sidebar.");
        if (ws) {
          ws.send("stop");
        }
        break;
      case "addCode":
        console.log("Add code called");
        send_to_backend();
        break;
    }
  });
}

// <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://*.vscodeusercontent.com; style-src 'unsafe-inline'; img-src 'self' vscode-resource:;">

function convertImageToBase64(imagePath) {
  const image = fs.readFileSync(imagePath);
  return `data:image/jpeg;base64,${image.toString("base64")}`;
}

function getWebviewContent() {
  const playImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "Record_Button.png")
  );
  const stopImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "Stop_Button.png")
  );
  const checkImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "Accept.png")
  );
  const xImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "Cancel.png")
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recording Sidebar</title>
  
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      margin: 0;
      height: 100%; 
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }

    p {
      color: #666;
      font-size: 14px;
    }

    /* Main container for buttons */
    .button-container {
      display: flex;
      flex-direction: row; 
      justify-content: center;
      width: 100%;
      padding-top: 20px;  /* Reduce space from top to make room for textarea */
      margin-top: auto;   /* Push buttons towards the bottom */
    }

    /* Each button in the row */
    .button-container img {
      width: 35px;
      height: 35px;
      margin: 10px;
      cursor: pointer;
    }

    .button-container img:hover {
      opacity: 0.8;
    }

    .hidden {
      display: none;
    }

    /* Function text area styles */
    #functionText {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      border: none;
      justify-content: center;
      align-items: center;
      border-radius: 5px;
      background-color: #1e1e1e; /* VSCode background color */
      color: #ffffff; /* White text */
      display: block;
      margin-bottom: 100px; /* Adds space below the textarea */
      resize: none; /* Disable resizing */
    }

    #functionText:disabled {
      background-color: #1e1e1e; /* Keep background dark even when disabled */
      color: #ffffff; /* Keep text white */
    }

    /* Row container for Check and X buttons */
    .check-x-container {
      display: flex;
      justify-content: center;
      width: 100%;
      margin-top: 10px; /* Space between function text and buttons */
    }

    /* Play and Stop buttons - Positioned near the bottom of the sidebar */
    #playButton, #stopButton {
      margin-top: auto; /* Pushes the Play/Stop buttons towards the bottom */
    }
  </style>
</head>
<body>

  <textarea id="functionText" rows="4" cols="50" disabled></textarea>

    <div class="button-container">
      <img id="playButton" src="${playImageBase64}" alt="Play Button">
      <img id="stopButton" class="hidden" src="${stopImageBase64}" alt="Stop Button">
      <img id="checkButton" class="hidden" src="${checkImageBase64}" alt="Check Button">
      <img id="xButton" class="hidden" src="${xImageBase64}" alt="X Button">
    </div>

  <script>
    console.log("Webview script loaded.");
    const vscode = acquireVsCodeApi();
    if (!vscode) {
      console.error("acquireVsCodeApi is not available");
    }
    console.log("I have the api for vscode");

    const xButton = document.getElementById('xButton');
    const checkButton = document.getElementById('checkButton');
    const playButton = document.getElementById('playButton');
    const stopButton = document.getElementById('stopButton');
    const functionText = document.getElementById('functionText');

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.command === 'setTranscription') {
        console.log('Received transcription:', message.transcription);

        functionText.value = message.transcription; 
      }
    });

    // Event listener for the "Play" button
    playButton.addEventListener('click', () => {
      playButton.classList.add('hidden');
      stopButton.classList.remove('hidden');
      console.log("Play button clicked");
      vscode.postMessage({ command: 'play' });
    });

    // Event listener for the "Stop" button
    stopButton.addEventListener('click', () => {
      stopButton.classList.add('hidden');
      playButton.classList.add('hidden');
      console.log("Stop button clicked");
      vscode.postMessage({ command: 'stop' });

      // When stop is clicked, make the text box editable and change its content
      functionText.style.display = 'block';
      functionText.disabled = false;
      functionText.value = "Waiting for Llama Response ..."; 
      checkButton.classList.remove('hidden');
      xButton.classList.remove('hidden');
    });

    checkButton.addEventListener('click', () => {
      functionText.disabled = true;
      functionText.value = "Here is where the LLM Response goes to"; 
      console.log("add code clicked");
      vscode.postMessage({ command: 'addCode' });
      checkButton.classList.add('hidden');
      xButton.classList.add('hidden');
      functionText.style.visibility = 'hidden';
      playButton.classList.remove('hidden');
    });

    xButton.addEventListener('click', () => {
      functionText.value = ""; 
      checkButton.classList.add('hidden');
      xButton.classList.add('hidden');
      functionText.style.visibility = 'hidden';
      playButton.classList.remove('hidden');
    });
  </script>

</body>
</html>
`;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};

// // async -> IP: 142.112.54.19:43186
// function handleBackendResponseFromFile() {
//   const filePath = path.join(__dirname, "sample_backend.json");

//   // Read the backend response from the file
//   fs.readFile(filePath, "utf8", async (err, data) => {
//     if (err) {
//       console.error("Error reading backend response file:", err);
//       return;
//     }

//     // Parse the backend JSON response
//     let backendResponse;
//     try {
//       backendResponse = JSON.parse(data);
//     } catch (parseErr) {
//       console.error("Error parsing backend response JSON:", parseErr);
//       return;
//     }

//     // Ensure the structure exists before accessing the code
//     if (
//       backendResponse &&
//       backendResponse.response &&
//       backendResponse.response.message.content.code
//     ) {
//       const codeLines = backendResponse.response.message.content.code;

//       // Iterate over the code lines from the backend and insert them in the editor at the correct positions
//       for (const [lineNumber, code] of Object.entries(codeLines)) {
//         console.log("here is the line number");
//         console.log(lineNumber);

//         // Convert lineNumber to an integer for correct position
//         const position = getEditorPositionForLine(lineNumber);
//         console.log("POSITION RETURNED FROM VSCODE");
//         console.log(position);

//         // Insert the code at the correct position
//         await insertCodeAtPosition(opened_editor, position, code + '\n'); // Await to ensure sequential execution
//       }
//     } else {
//       console.error("No code found in the backend response.");
//     }
//   });
// }
