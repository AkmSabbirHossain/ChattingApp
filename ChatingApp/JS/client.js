const socket = io("http://localhost:4050");

// ==================== signin  ====================
const urlParams = new URLSearchParams(window.location.search);
let names = urlParams.get("name");

if (!names) {
  window.location.href = "signin.html";  
}

const form = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageContainer = document.querySelector(".container");
const fileInput = document.getElementById("fileInput");

const audio = new Audio("apple_pay.mp3");

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
  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
  if (position === "left" && !isSystem) audio.play();
};

socket.emit("new-user-joined", names);

socket.on("user-joined", (names) => {
  append(`${names} joined the chat`, "null", true);
});

socket.on("receive", (data) => {
  append(`${data.names}: ${data.message}`, "left", false, data.timestamp);
});

socket.on("left", (names) => {
  append(`${names} left the chat`, "null", true);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    append(`You: ${message}`, "right", false, timestamp);
    socket.emit("send", message);
    messageInput.value = "";
  }
});

// File Handling
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

const appendImage = (imageData, senderName, position, timestamp) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", position);
  const imgLink = document.createElement("a");
  imgLink.href = imageData;
  imgLink.target = "_blank";
  const img = document.createElement("img");
  img.src = imageData;
  img.style.maxWidth = "200px";
  imgLink.appendChild(img);
  messageElement.appendChild(imgLink);

  const nameSpan = document.createElement("span");
  nameSpan.innerText = `${senderName}`;
  nameSpan.style.display = "block";
  nameSpan.style.textAlign = position === "right" ? "right" : "left";
  nameSpan.style.fontSize = "12px";
  nameSpan.style.color = "#555";
  messageElement.appendChild(nameSpan);

  if (timestamp) {
    const timeSpan = document.createElement("span");
    timeSpan.innerText = timestamp;
    timeSpan.style.display = "block";
    timeSpan.style.textAlign = position === "right" ? "right" : "left";
    timeSpan.style.fontSize = "10px";
    timeSpan.style.color = "#888";
    messageElement.appendChild(timeSpan);
  }
  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
};

const appendFileLink = (fileName, senderName, position, fileData, timestamp) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", position);
  const link = document.createElement("a");
  link.href = fileData;
  link.download = fileName;
  link.textContent = fileName;
  messageElement.appendChild(link);

  const nameSpan = document.createElement("span");
  nameSpan.innerText = `${senderName}`;
  nameSpan.style.display = "block";
  nameSpan.style.textAlign = position === "right" ? "right" : "left";
  nameSpan.style.fontSize = "12px";
  nameSpan.style.color = "#555";
  messageElement.appendChild(nameSpan);

  if (timestamp) {
    const timeSpan = document.createElement("span");
    timeSpan.innerText = timestamp;
    timeSpan.style.display = "block";
    timeSpan.style.textAlign = position === "right" ? "right" : "left";
    timeSpan.style.fontSize = "10px";
    timeSpan.style.color = "#888";
    messageElement.appendChild(timeSpan);
  }
  messageContainer.append(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
};