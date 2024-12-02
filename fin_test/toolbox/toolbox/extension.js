// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const Microphone = require("node-microphone");
const wav = require("wav");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const app = express();
const port = 4001;

const fs = require("fs");
const { exec } = require("child_process");

const wss = new WebSocket.Server({ noServer: true });

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
      body: JSON.stringify(payload
      ),
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
      prompt: "Write a calculator function in python"
    };

    await fetch("http://142.112.54.19:43186/prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(new_pay),
    })
      .then((response) => response.json())
      .then((data) => {
        // Handle the response data
        console.log(data);
        handleBackendResponseFromData(data);

      })
      .catch((error) => {
        // Handle any errors
        console.error("Error:", error);
      });


  } else {
    console.log("No editor is open or active.");
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
  console.log("HERE IS THE DATA");
  console.log(data);
  console.log("HERE IS THE RESPONSE");
  console.log(data.response);
  console.log("HERE IS THE MESSAGE");
  console.log(data.response.message);
  console.log("HERE IS THE CONTENT");
  console.log(data.response.message.content);
  console.log("HERE IS THE CODE");
  console.log(data.code);

    // // Parse the backend JSON response
    // let backendResponse;
    // try {
    //   backendResponse = JSON.parse(data);
    // } catch (parseErr) {
    //   console.error("Error parsing backend response JSON:", parseErr);
    //   return;
    // }

    

    // Ensure the structure exists before accessing the code
    if (
      data &&
      data.response &&
      data.response.message.content
    ) {
  if (data.response.message.content.code) {
    console.log("Code exists:", data.response.message.content.code);

    try {
      const entries = Object.entries(data.response.message.content.code);
      console.log("Entries:", entries);
    } catch (error) {
      console.error("Error processing code:", error);
    }
  } else {
    console.log("Code is undefined or null");
  }

      const codeLines = data.response.message.content.code;

      // Iterate over the code lines from the backend and insert them in the editor at the correct positions
      for (const [lineNumber, code] of Object.entries(codeLines)) {
        console.log("here is the line number");
        console.log(lineNumber);

        // Convert lineNumber to an integer for correct position
        const position = getEditorPositionForLine(Number(lineNumber));

        // Insert the code at the correct position
        await insertCodeAtPosition(opened_editor, position, code); // Await to ensure sequential execution
      }
    } else {
      console.error("No code found in the backend response.");
    }
  }




// async -> IP: 142.112.54.19:43186
function handleBackendResponseFromFile() {
  const filePath = path.join(__dirname, "sample_backend.json");

  // Read the backend response from the file
  fs.readFile(filePath, "utf8", async (err, data) => {
    if (err) {
      console.error("Error reading backend response file:", err);
      return;
    }

    // Parse the backend JSON response
    let backendResponse;
    try {
      backendResponse = JSON.parse(data);
    } catch (parseErr) {
      console.error("Error parsing backend response JSON:", parseErr);
      return;
    }

    // Ensure the structure exists before accessing the code
    if (
      backendResponse &&
      backendResponse.response &&
      backendResponse.response.message.content.code
    ) {
      const codeLines = backendResponse.response.message.content.code;

      // Iterate over the code lines from the backend and insert them in the editor at the correct positions
      for (const [lineNumber, code] of Object.entries(codeLines)) {
        console.log("here is the line number");
        console.log(lineNumber);

        // Convert lineNumber to an integer for correct position
        const position = getEditorPositionForLine(Number(lineNumber));

        // Insert the code at the correct position
        await insertCodeAtPosition(opened_editor, position, code); // Await to ensure sequential execution
      }
    } else {
      console.error("No code found in the backend response.");
    }
  });
}

// this function 100% works
async function insertCodeAtPosition(editor, position, code) {
  console.log("inside the insert code at position");
  console.log(editor);
  console.log("position");
  console.log(position);
  console.log("code here");
  console.log(code);

  try {
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
  const panel = vscode.window.createWebviewPanel(
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
        const calculatorFilePath = path.join(__dirname, "calculator.py");
        fs.readFile(calculatorFilePath, "utf8", (err, data) => {
          if (err) {
            console.error("Error reading calculator.py:", err);
            return;
          }
          send_to_backend();
          // insertCodeAtPosition(opened_editor, last_cursor_position, data);
          // handleBackendResponseFromFile();
        });
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
    path.join(__dirname, "images", "mic.jpg")
  );
  const stopImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "stop.png")
  );
  const checkImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "check.png")
  );
  const xImageBase64 = convertImageToBase64(
    path.join(__dirname, "images", "x.jpg")
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
      margin-top: auto; 
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
      border: 2px solid #ccc;
      border-radius: 5px;
      display: none;
      margin-bottom: 20px; /* Adds space below the textarea */
    }

    #functionText:disabled {
      background-color: #f4f4f9;
      color: #999;
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

    <div class="button-container">
      <img id="playButton" src="${playImageBase64}" alt="Play Button">
      <img id="stopButton" class="hidden" src="${stopImageBase64}" alt="Stop Button">
      <img id="checkButton" class="hidden" src="${checkImageBase64}" alt="Check Button">
      <img id="xButton" class="hidden" src="${xImageBase64}" alt="X Button">
    </div>

    <textarea id="functionText" rows="4" cols="50" disabled>Write a Hello World function for me</textarea>


  <script>
    console.log("Webview script loaded.");
    const vscode = acquireVsCodeApi();
    if (!vscode) {
      console.error("acquireVsCodeApi is not available");
    }

    const xButton = document.getElementById('xButton');
    const checkButton = document.getElementById('checkButton');
    const playButton = document.getElementById('playButton');
    const stopButton = document.getElementById('stopButton');
    const functionText = document.getElementById('functionText');

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
      functionText.value = "Write a basic Calculator function for me"; 
      checkButton.classList.remove('hidden');
      xButton.classList.remove('hidden');
    });

    checkButton.addEventListener('click', () => {
      functionText.disabled = true;
      functionText.value = "Here is where the LLM Response goes to"; 
      vscode.postMessage({ command: 'addCode' });
      checkButton.classList.add('hidden');
      xButton.classList.add('hidden');
      functionText.style.display = 'none';
      playButton.classList.remove('hidden');
    });

    xButton.addEventListener('click', () => {
      functionText.value = ""; 
      checkButton.classList.add('hidden');
      xButton.classList.add('hidden');
      functionText.style.display = 'none';
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
