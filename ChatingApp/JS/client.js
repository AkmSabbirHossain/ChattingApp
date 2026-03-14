// ==================== Render.com / Production Ready ====================
const socket = io();   // ← localhost মুছে শুধু io() রাখো (এটাই গুরুত্বপূর্ণ)

// ==================== Name handling from URL ====================
const urlParams = new URLSearchParams(window.location.search);
let names = urlParams.get("name");

if (!names) {
  window.location.href = "signin.html";
}

// ==================== DOM elements ====================
const form = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageContainer = document.querySelector(".container");
const fileInput = document.getElementById("fileInput");
const hiddenName = document.getElementById("hiddenName");

// Hidden field-এ name সেভ করো যাতে submit-এ হারায় না
if (hiddenName) {
  hiddenName.value = names;
}

const audio = new Audio("apple_pay.mp3");

// ==================== Append message function ====================
const append = (message, position, isSystem = false, timestamp = "") => {
  const messageElement = document.createElement("div");
  if (isSystem) {
    messageElement.classList.add("system-message");
  } else {
    messageElement.classList.add("message", position);
  }
  const messageContent = document.createElement("div");
  messageContent.innerText = message;
  messageElement.appendChild(messageContent);

  if (timestamp) {
    const timeSpan = document.createElement("span");
    timeSpan.innerText = timestamp;
    timeSpan.style.display = "block";
    timeSpan.style.textAlign = position === "right" ? "right" : "left";
    timeSpan.style.fontSize = "10px";
    timeSpan.style.color = "#888";
    messageElement.appendChild(timeSpan);
  }
  messageContainer.appendChild(messageElement);  // appendChild ব্যবহার করো (append নয়)
  messageContainer.scrollTop = messageContainer.scrollHeight;

  if (position === "left" && !isSystem) {
    audio.play().catch(err => console.log("Audio error:", err));
  }
};

// ==================== Join emit ====================
socket.emit("new-user-joined", names);

// ==================== Socket listeners ====================
socket.on("user-joined", (names) => {
  append(`${names} joined the chat`, "null", true);
});

socket.on("receive", (data) => {
  console.log("Received message:", data); // debug
  append(`${data.names}: ${data.message}`, "left", false, data.timestamp);
});

socket.on("left", (names) => {
  append(`${names} left the chat`, "null", true);
});

// ==================== Send message ====================
form.addEventListener("submit", (e) => {
  e.preventDefault(); // এটা অবশ্যই থাকবে – URL reload বন্ধ করবে
  const message = messageInput.value.trim();

  if (message) {
    console.log("Sending:", message, "from:", names); // debug
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    append(`You: ${message}`, "right", false, timestamp);
    socket.emit("send", message);
    messageInput.value = "";
  }
});

// ==================== File handling ====================
socket.on("file-receive", (data) => {
  if (data.fileType.startsWith("image/")) {
    appendImage(data.fileData, data.names, "left", data.timestamp);
  } else {
    appendFileLink(data.fileName, data.names, "left", data.fileData, data.timestamp);
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const fileData = event.target.result;
      const fileName = file.name;
      const fileType = file.type;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      socket.emit("file-send", { fileData, fileName, fileType, timestamp });

      if (fileType.startsWith("image/")) {
        appendImage(fileData, "You", "right", timestamp);
      } else {
        appendFileLink(fileName, "You", "right", fileData, timestamp);
      }
      fileInput.value = "";
    };
    reader.readAsDataURL(file);
  }
});

// appendImage ও appendFileLink ফাংশন (আগের মতোই রাখো)
const appendImage = (imageData, senderName, position, timestamp) => {
  // তোমার আগের কোড একই রাখো...
  // (যাতে ছবি দেখায়)
};

const appendFileLink = (fileName, senderName, position, fileData, timestamp) => {
  // তোমার আগের কোড একই রাখো...
  // (যাতে ফাইল লিংক দেখায়)
};

// Connection debug
socket.on("connect", () => console.log("Socket connected!"));
socket.on("connect_error", (err) => console.error("Socket error:", err));
