// const { parentPort } = require("worker_threads");
// const WebSocket = require("ws"); 

// let socket;

// parentPort.on("message", (message) => {
//     // console.log("In the mini thread???");
//     if (message.action === "sendData") {
//         socket.send(message.data); 
//         // console.log("here is the message data");
//         // console.log("SENDING DATA");
//         // console.log(message.data);
//         parentPort.postMessage({ status: "data_sent", data: message.data });
//     } 
//     if (message.action === "connect") {
//         socket = new WebSocket("ws://142.112.54.19:43102");

//         socket.on("open", () => {
//           console.log("Worker WebSocket connected");
//         });

//         socket.on("error", (err) => {
//           console.error("Worker WebSocket error:", err);
//           parentPort.postMessage({ status: "error", error: err });
//         });

//         socket.on("message", (data) => {
//           console.log("Received message from WebSocket:", data);
//           // You can process the data here if needed, or forward it to the main thread:
//         //   parentPort.postMessage({ status: "message_received", data: data });
//         });
        
//     }
// });
