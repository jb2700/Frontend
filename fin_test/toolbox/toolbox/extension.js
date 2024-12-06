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
// const resampler = require("audio-resampler");
const port = 4001;
// const pcm = require("pcm");
// const AudioBufferUtils = require("audio-buffer-utils");

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
      // startRecording();
      startRecordingnew();
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

let socket = new WebSocket("ws://71.241.245.11:41106");

socket.onopen = () => {
  console.log("WebSocket connected. Sending audio stream...");
};

socket.onmessage = (event) => {
  console.log("Recieved this message");
  console.log(event);
  console.log("Received message from WebSocket server:", event.data);
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error.message);
};

// function startRecordingnew() {
//   console.log("I AM IN THE START RECORING NEW");

//   // Start recording with sox, piping the output to stdout
//   const sox = exec(
//     `sox -d -r 48000 -c 1 -b 32 -t raw -`, // Stream raw 32-bit PCM
//     { encoding: "buffer" }, // Ensures we get the output as a raw Buffer
//     (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error starting recording: ${error.message}`);
//         return;
//       }
//       if (stderr) {
//         console.error(`stderr: ${stderr}`);
//         return;
//       }
//       console.log(`stdout: ${stdout}`);
//     }
//   );

//   let audioBuffer = Buffer.alloc(0); // Start with an empty buffer

//   sox.stdout.on("data", (data) => {
//     // console.log("Received new chunk of data from sox");

//     // Append the incoming data to the buffer
//     audioBuffer = Buffer.concat([audioBuffer, data]);

//     // Check if WebSocket is open
//     if (socket.readyState === WebSocket.OPEN) {
//       // console.log("SOCKET IS READY");

//       const CHUNK_SIZE = 536; // Target chunk size in bytes

//       // While we have more data in the buffer, send it in chunks of 536 bytes
//       while (audioBuffer.length >= CHUNK_SIZE) {
//         // Extract a chunk of the specified size (536 bytes)
//         const chunk = audioBuffer.slice(0, CHUNK_SIZE);

//         // Remove the chunk from the buffer (advance buffer start)
//         audioBuffer = audioBuffer.slice(CHUNK_SIZE);

//         // Convert the raw 32-bit PCM data in 'chunk' to 16-bit PCM
//         let inputData = new Int32Array(chunk.buffer); // Assuming the data is raw 32-bit PCM
//         let outputData = new Int16Array(inputData.length);

//         // Convert the 32-bit PCM to 16-bit PCM (clipping if necessary)
//         for (let i = 0; i < inputData.length; i++) {
//           outputData[i] = Math.max(
//             -32768,
//             Math.min(32767, inputData[i] * 32768)
//           ); // Clip to 16-bit range
//         }

//         // Create metadata with sample rate
//         let metadata = JSON.stringify({ sampleRate: 48000 });
//         let metadataBytes = new TextEncoder().encode(metadata);

//         // 4-byte integer indicating the length of the metadata
//         let metadataLength = new ArrayBuffer(4);
//         let metadataLengthView = new DataView(metadataLength);
//         metadataLengthView.setInt32(0, metadataBytes.byteLength, true); // Little-endian

//         // Combine metadata length, metadata, and audio chunk
//         let metadataLengthBuffer = Buffer.from(metadataLength);
//         let metadataBytesBuffer = Buffer.from(metadataBytes);
//         let audioDataBuffer = Buffer.from(outputData.buffer); // Buffer containing 16-bit PCM audio data

//         let combinedData = Buffer.concat([
//           metadataLengthBuffer,
//           metadataBytesBuffer,
//           audioDataBuffer,
//         ]);

//         // console.log(`Sending chunk of size: ${combinedData.length} bytes`);
//         // console.log("HERE IS REAL DATA");
//         // console.log(combinedData);
//         // Send the combined data (metadata + audio) over WebSocket
//         socket.send(combinedData);
//       }
//     }
//   });

//   // Handle WebSocket closure to stop recording
//   socket.onclose = () => {
//     console.log("WebSocket connection closed.");
//     sox.kill(); // Stop recording when WebSocket connection is closed
//   };
// }

function startRecordingnew() {
  // console.log("I AM IN THE START RECORING NEW");

  // Start recording with sox, piping the output to stdout
  const sox = exec(
    `sox -d -r 48000 -c 1 -b 32 -t raw -`, // Stream raw 32-bit PCM
    { encoding: "buffer", maxBuffer: 1 * 1024 * 1024 }, // Max buffer size set to 1MB to prevent overflow
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting recording: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    }
  );

  let audioBuffer = Buffer.alloc(0); // Start with an empty buffer

  // Set a rate limit for sending data to avoid flooding the WebSocket
  const SEND_INTERVAL = 150; // 200ms delay between sending data chunks
  const CHUNK_SIZE = 512; // 1024 bytes chunk size

  // Timer to control the rate of sending
  let lastSendTime = Date.now();

  sox.stdout.on("data", (data) => {
    // Append the incoming data to the buffer
    audioBuffer = Buffer.concat([audioBuffer, data]);

    // Process the buffer and send 536 bytes at a time
    if (socket.readyState === WebSocket.OPEN) {
      while (audioBuffer.length >= CHUNK_SIZE) {
        const now = Date.now();

        // Only proceed if enough time has passed since the last send
        if (now - lastSendTime >= SEND_INTERVAL) {
          lastSendTime = now; // Update the time of the last send

          let uint8Array = new Uint8Array(audioBuffer.buffer);

          // Extract a chunk of the specified size (536 bytes)
          const chunk = uint8Array.slice(0, CHUNK_SIZE);

          // Remove the chunk from the buffer (advance buffer start)
          audioBuffer = Buffer.from(uint8Array.slice(CHUNK_SIZE));

          // Convert the raw 32-bit PCM data in 'chunk' to 16-bit PCM
          let inputData = new Int32Array(chunk.buffer); // Assuming the data is raw 32-bit PCM
          // console.log("THIS IS THE INPUT DATA");
          // console.log(inputData);
          let outputData = new Int16Array(inputData.length);
          // console.log("Here is input data");
          // console.log(inputData);

          for (let i = 0; i < inputData.length; i++) {
            let value = inputData[i]; // Value from the 32-bit input data

            // Normalize the value from 32-bit range (-2147483648 to 2147483647) to 16-bit range (-32768 to 32767)
            // Scale the value from the range -2147483648 -> 2147483647 to the range -32768 -> 32767
            let scaledValue = (value / 2147483647) * 32767;
            // console.log("here is scaled value");
            // console.log(scaledValue);
            // Convert to an integer (round) to fit the 16-bit PCM format
            outputData[i] = Math.round(scaledValue);

            // Clip to the 16-bit range (-32768 to 32767) in case of rounding errors
            outputData[i] = Math.max(-32768, Math.min(32767, outputData[i]));
          }


          // Create metadata with sample rate (this could be sent once or occasionally)
          let metadata = JSON.stringify({ sampleRate: 48000 });
          let metadataBytes = new TextEncoder().encode(metadata);

          // // 4-byte integer indicating the length of the metadata
          // let metadataLength = new ArrayBuffer(4);
          // let metadataLengthView = new DataView(metadataLength);
          // metadataLengthView.setInt32(0, metadataBytes.byteLength, true); // Little-endian

          // let combinedData = new Blob([
          //   metadataLength,
          //   metadataBytes,
          //   outputData,
          // ]);

          // // Combine metadata length, metadata, and audio chunk -> THIS IS THE ISSUE, MAKE SURE THESE
          // // BUFFERS CAN CONTAIN VALUES OUTSIDE OF THE RANGE 0 - 255, SPECIFICALLY MAKE THEM CONTAIN VALUES 
          // // in the 16 bit range 
          // let metadataLengthBuffer = Buffer.from(metadataLength);
          // let metadataBytesBuffer = Buffer.from(metadataBytes);
          // let audioDataBuffer = Buffer.from(outputData.buffer); // Buffer containing 16-bit PCM audio data

          // let combinedData = Buffer.concat([
          //   metadataLengthBuffer,
          //   metadataBytesBuffer,
          //   audioDataBuffer,
          // ]);

          // console.log(`Sending chunk of size: ${combinedData.length} bytes`);
          // console.log("here is the chunk:");
          // console.log(combinedData);
          // console.log("Here is the meta data length buffer");
          // console.log(metadataLengthBuffer);
          // console.log("Here is the meta data bytes buffer");
          // console.log(metadataBytesBuffer);
          // console.log("here is the audio data buffer");
          // console.log(audioDataBuffer);
          let metadataLength = metadataBytes.byteLength;
          let metadataLengthBuffer = Buffer.alloc(4); // 4 bytes for 32-bit
          metadataLengthBuffer.writeUInt32LE(metadataLength, 0);

          // Convert metadataBytes to Buffer
          let metadataBytesBuffer = Buffer.from(metadataBytes);

          // Create a Buffer for the 16-bit PCM data (outputData)
          let audioDataBuffer = Buffer.alloc(outputData.length * 2); // Each 16-bit value is 2 bytes

          // Write the 16-bit PCM data into the buffer
          for (let i = 0; i < outputData.length; i++) {
            audioDataBuffer.writeInt16LE(outputData[i], i * 2); // Write little-endian 16-bit value
          }

          console.log("here is the audio data bytes");
          console.log(audioDataBuffer);
          console.log("here is the output data");
          console.log(outputData);
          console.log("here is the meta data length buffer");
          console.log(metadataLengthBuffer);

          // Combine metadata length, metadata, and audio data buffers
          let combinedData2 = Buffer.concat([
            metadataLengthBuffer,
            metadataBytesBuffer,
            audioDataBuffer,
          ]);

          // let new_bff = new ArrayBuffer(outputData.length * 2);

          // // let arrayBuffer = convertToArrayBuffer(outputData);

          // let totalLength = outputData.length + metadataBytesBuffer.length + metadataLengthBuffer.length;

          // let combinedBuffer = new ArrayBuffer(totalLength);



          // let act_buff = new ArrayBuffer();

          // let combinedData = Buffer.concat([
          //   metadataLengthBuffer,
          //   metadataBytesBuffer,
          //   outputData.buffer,
          // ]);

          // // Send the combined data (metadata + audio) over WebSocket
          // socket.send(combinedData2);
          // return;
          // let metadataLength = metadataBytes.byteLength;
          // let metadataLengthBuffer = new Int32Array(1); // Store the length of metadata in a 32-bit integer
          // metadataLengthBuffer[0] = metadataLength; // Set metadata length

          // // Convert metadataBytes to Int32Array (this may not be strictly necessary, but it gives consistency)
          // let metadataBytesBuffer = new Int32Array(metadataBytes.buffer);

          // // Convert audio data (which is in Int16Array) to Int32Array
          // let inputData2 = new Int16Array(chunk.buffer); // Original 16-bit audio data
          // let outputData2 = new Int32Array(inputData.length); // Create an Int32Array to hold 32-bit audio data

          // // Convert 16-bit to 32-bit
          // for (let i = 0; i < inputData2.length; i++) {
          //   outputData2[i] = inputData2[i]; // Direct copy to 32-bit array (you can scale here if needed)
          // }

          // // // Now you have the metadata length, metadata, and audio data as Int32Arrays
          // // console.log("Metadata length as Int32Array:", metadataLengthBuffer);
          // // console.log("Metadata as Int32Array:", metadataBytesBuffer);
          // // console.log("Audio data as Int32Array:", outputData2);

          // // Combine all buffers into a single ArrayBuffer
          // let totalLength =
          //   metadataLengthBuffer.length * Int32Array.BYTES_PER_ELEMENT +
          //   metadataBytesBuffer.length * Int32Array.BYTES_PER_ELEMENT +
          //   outputData2.length * Int32Array.BYTES_PER_ELEMENT;

          // // Create a new ArrayBuffer to hold all data
          // let combinedBuffer = new ArrayBuffer(totalLength);
          // console.log("Here is the length of meta data bytes buffer");
          // console.log(metadataBytesBuffer.length);

          // // Offsets to insert data into the combined buffer
          // let offset = 0;

          // // Copy metadata length into the combined buffer
          // new Int32Array(combinedBuffer, offset, metadataLengthBuffer.length).set(
          //   metadataLengthBuffer
          // );
          // offset += metadataLengthBuffer.length * Int32Array.BYTES_PER_ELEMENT;

          // // Copy metadata into the combined buffer
          // new Int32Array(combinedBuffer, offset, metadataBytesBuffer.length).set(
          //   metadataBytesBuffer
          // );
          // offset += metadataBytesBuffer.length * Int32Array.BYTES_PER_ELEMENT;

          // // Copy audio data into the combined buffer
          // new Int32Array(combinedBuffer, offset, outputData2.length).set(outputData2);

          // // Send the combined data over WebSocket
          // console.log("HERE IS FINAL BUFFER");
          // console.log(combinedBuffer);
          // let uint32View = new Int32Array(combinedBuffer);
          // console.log("HERE IS THE ARRAY");
          // console.log(uint32View);
          socket.send(combinedData2);

        }
      }
    }
  });

  // Handle WebSocket closure to stop recording
  socket.onclose = () => {
    console.log("WebSocket connection closed.");
    sox.kill(); // Stop recording when WebSocket connection is closed
  };
}

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
      prompt: "Write a basic calculator function starting from line 1",
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
  console.log(data.response);

  // Ensure the structure exists before accessing the code
  if (data && data.response && data.response.code) {
    const codeLines = data.response.code;

    for (const [lineNumber, code] of Object.entries(codeLines)) {
      console.log("here is the line number");
      console.log(lineNumber);

      const position = getEditorPositionForLine(lineNumber);

      while (lineNumber > opened_editor.document.lineCount) {
        await insertCodeAtPosition(
          opened_editor,
          getEditorPositionForLine(opened_editor.document.lineCount),
          "\n"
        );
      }
      console.log("BEFORE INSERT CODE");
      await insertCodeAtPosition(opened_editor, position, code);
    }
  } else {
    console.error("No code found in the backend response.");
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
      padding-top: 300px;
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


To meet your requirements, let's address each of your points one by one:

Text Area Background Color Matching VSCode Background:
To match the background color of your <textarea> to the default VSCode background, we need to know the color used in VSCode's dark theme. The color is usually #1e1e1e. If you're using the light theme, it would typically be #ffffff, but I'll assume you're looking for the dark theme background color for now. We will apply this color to the textarea's background.

Text Color White:
To make the text inside the <textarea> white, we'll set the text color to #ffffff.

Text Area Above the Buttons:
To position the <textarea> above the buttons, we need to adjust the layout. In your current setup, the button container is styled to be placed at the bottom of the screen (padding-top: 300px; and margin-top: auto;). We can adjust this to place the <textarea> above it while maintaining proper spacing.

Here is the modified code:

html
Copy code
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
