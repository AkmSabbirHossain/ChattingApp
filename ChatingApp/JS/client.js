const socket = io("");

// Name URL 
const urlParams = new URLSearchParams(window.location.search);
let names = urlParams.get("name");

if (!names) {
  window.location.href = "signin.html";
}

// DOM elements
const form = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const messageContainer = document.querySelector(".container");
const fileInput = document.getElementById("fileInput");
const hiddenNameInput = document.getElementById("hiddenName");
const emojiBtn = document.getElementById("emojiBtn");

if (hiddenNameInput) hiddenNameInput.value = names;

const audio = new Audio("apple_pay.mp3");

let selectedMessageId = null;

// ==================== Chat History ====================
const CHAT_KEY = `chat_history_${names.replace(/\s+/g, '_')}`;

function loadChatHistory() {
  const saved = localStorage.getItem(CHAT_KEY);
  if (saved) {
    let messages;
    try {
      messages = JSON.parse(saved);
    } catch (e) {
      console.error("Chat history parse error:", e);
      return;
    }

    const seenIds = new Set();

    messages.forEach(msg => {
      if (msg.id && seenIds.has(msg.id)) return;
      if (msg.id) seenIds.add(msg.id);

      if (msg.type === "image") {
        if (msg.data) {
          appendImage(msg.data, msg.sender || "Unknown", msg.position, msg.timestamp, msg.id);
        }
      } else if (msg.type === "file") {
        if (msg.data) {
          appendFileLink(msg.fileName || "file", msg.sender || "Unknown", msg.position, msg.data, msg.timestamp);
        }
      } else {
        append(msg.text, msg.position, msg.isSystem, msg.timestamp, msg.id);
      }
    });
  }
}

function saveToHistory(text, position, isSystem = false, timestamp = "", id = "", type = "text", extra = null) {
  let saved = [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    saved = [];
  }

  const messageObj = {
    text,
    position,
    isSystem,
    timestamp,
    id,
    type,
    data: extra ? extra.data : null,
    fileName: extra ? extra.fileName : null,
    sender: extra ? extra.sender : names
  };

  saved.push(messageObj);
  if (saved.length > 500) saved.shift();
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(saved));
  } catch (e) {
    console.warn("Storage full! Removing old images to free space...");
    const textOnly = saved.filter(m => m.type === "text" || m.type === "file");
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(textOnly));
    } catch (e2) {
      console.error("Still full after cleanup:", e2);
    }
  }
}

window.addEventListener("load", loadChatHistory);

// ==================== Append Message ====================
const append = (message, position, isSystem = false, timestamp = "", messageId = "") => {
  const messageElement = document.createElement("div");
  if (isSystem) {
    messageElement.classList.add("system-message");
  } else {
    messageElement.classList.add("message", position);
  }

  if (!messageId) messageId = "msg_" + Date.now();
  messageElement.dataset.id = messageId;

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

  // Delete button (WhatsApp style – right click)
  if (position === "right" && !isSystem) {
    messageElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      selectedMessageId = messageId;
      const menu = document.getElementById("deleteMenu");
      menu.style.display = "block";
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
      document.addEventListener("click", hideDeleteMenu, { once: true });
    });
  }

  messageContainer.appendChild(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;

  if (position === "left" && !isSystem) audio.play();
};

// Delete menu close
function hideDeleteMenu() {
  const menu = document.getElementById("deleteMenu");
  if (menu) menu.style.display = "none";
}

// Delete function
function deleteSelectedMessage() {
  if (!selectedMessageId) return;
  if (!confirm("Delete this message for everyone?")) return;

  const msg = document.querySelector(`[data-id="${selectedMessageId}"]`);
  if (msg) msg.remove();

  socket.emit("delete-message", selectedMessageId);

  let saved = localStorage.getItem(CHAT_KEY);
  if (saved) {
    let messages = JSON.parse(saved);
    messages = messages.filter(m => m.id !== selectedMessageId);
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }

  hideDeleteMenu();
}

// ==================== Send ====================
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = "msg_" + Date.now();
    const full = `You: ${msg}`;
    append(full, "right", false, time, msgId);
    saveToHistory(full, "right", false, time, msgId, "text");

    socket.emit("send", { message: msg, senderName: names, id: msgId });

    messageInput.value = "";

    if (emojiPanel) {
      emojiPanel.remove();
      emojiPanel = null;
    }
  }
});

// ==================== Receive ====================
socket.on("receive", (data) => {
  const text = `${data.names || "Unknown"}: ${data.message}`;
  append(text, "left", false, data.timestamp, data.id);
  saveToHistory(text, "left", false, data.timestamp, data.id, "text");
});

// ==================== Delete from others ====================
socket.on("message-deleted", (messageId) => {
  const msg = document.querySelector(`[data-id="${messageId}"]`);
  if (msg) msg.remove();
});

// ==================== Typing Indicator ====================
let typingTimeout;
messageInput.addEventListener("input", () => {
  socket.emit("typing", { name: names, isTyping: true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("typing", { name: names, isTyping: false }), 2000);
});

socket.on("typing", (data) => {
  let el = document.getElementById("typingIndicator");
  if (!el) {
    el = document.createElement("div");
    el.id = "typingIndicator";
    el.style.padding = "8px 12px";
    el.style.color = "#888";
    el.style.fontStyle = "italic";
    el.style.fontSize = "13px";
    messageContainer.appendChild(el);
  }
  el.innerText = data.isTyping ? `${data.name} is typing...` : "";
  el.style.display = data.isTyping ? "block" : "none";
});

// ==================== Emoji Picker ====================
let emojiPanel = null;

emojiBtn.onclick = () => {
  if (emojiPanel) {
    emojiPanel.remove();
    emojiPanel = null;
    return;
  }

  emojiPanel = document.createElement("div");
  emojiPanel.style.position = "absolute";
  emojiPanel.style.bottom = "75px";
  emojiPanel.style.left = "15px";
  emojiPanel.style.background = "#fff";
  emojiPanel.style.border = "1px solid #ccc";
  emojiPanel.style.borderRadius = "10px";
  emojiPanel.style.padding = "10px";
  emojiPanel.style.boxShadow = "0 5px 15px rgba(0,0,0,0.3)";
  emojiPanel.style.zIndex = "1000";
  emojiPanel.style.display = "grid";
  emojiPanel.style.gridTemplateColumns = "repeat(7, 1fr)";
  emojiPanel.style.gap = "8px";
  emojiPanel.style.maxWidth = "280px";

  const emojis = ["😀","😂","😍","🥰","😘","😎","🔥","❤️","👍","👏","🙌","🎉","🥳","😢","😡","🙏","👀","🚀","💯","✨"];

  emojis.forEach(emo => {
    const btn = document.createElement("button");
    btn.innerText = emo;
    btn.style.fontSize = "26px";
    btn.style.background = "none";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.onclick = () => {
      messageInput.value += emo;
      messageInput.focus();
    };
    emojiPanel.appendChild(btn);
  });

  form.parentElement.appendChild(emojiPanel);
};

// ==================== File Handling ====================
socket.on("file-receive", (data) => {
  if (data.fileType && data.fileType.startsWith("image/")) {
    const imgId = "img_" + Date.now();
    appendImage(data.fileData, data.names || "Unknown", "left", data.timestamp, imgId);
    saveToHistory(
      `${data.names} sent an image`,
      "left", false,
      data.timestamp,
      imgId,
      "image",
      { data: data.fileData, sender: data.names || "Unknown" }
    );
  } else {
    const fileId = "file_" + Date.now();
    appendFileLink(data.fileName, data.names || "Unknown", "left", data.fileData, data.timestamp);
    saveToHistory(
      `${data.names} sent a file: ${data.fileName}`,
      "left", false,
      data.timestamp,
      fileId,
      "file",
      { data: data.fileData, fileName: data.fileName, sender: data.names || "Unknown" }
    );
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
        const imgId = "img_" + Date.now();
        appendImage(fileData, "You", "right", timestamp, imgId);
        saveToHistory(
          "You sent an image",
          "right", false,
          timestamp,
          imgId,
          "image",
          { data: fileData, sender: "You" }  
        );
      } else {
        const fileId = "file_" + Date.now();
        appendFileLink(fileName, "You", "right", fileData, timestamp);
        saveToHistory(
          `You sent a file: ${fileName}`,
          "right", false,
          timestamp,
          fileId,
          "file",
          { data: fileData, fileName, sender: "You" }
        );
      }
      fileInput.value = "";
    };
    reader.readAsDataURL(file);
  }
});

// ==================== Image Append ====================
const appendImage = (imageData, senderName, position, timestamp, imgId = "") => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", position);
  if (!imgId) imgId = "img_" + Date.now();
  messageElement.dataset.id = imgId;

  const imgContainer = document.createElement("div");
  imgContainer.style.position = "relative";
  imgContainer.style.display = "inline-block";
  imgContainer.style.cursor = "pointer";

  const img = document.createElement("img");
  img.src = imageData;
  img.style.maxWidth = "200px";
  img.style.borderRadius = "8px";
  imgContainer.appendChild(img);

  messageElement.appendChild(imgContainer);

  const nameSpan = document.createElement("span");
  nameSpan.innerText = senderName;
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

  // Long press (mobile)
  let touchTimer;
  imgContainer.addEventListener("touchstart", (e) => {
    touchTimer = setTimeout(() => {
      showImageContextMenu(e, imageData, senderName, position, imgId);
    }, 3000);
  });
  imgContainer.addEventListener("touchend", () => clearTimeout(touchTimer));
  imgContainer.addEventListener("touchcancel", () => clearTimeout(touchTimer));
  imgContainer.addEventListener("touchmove", () => clearTimeout(touchTimer));

  // Right click (desktop)
  imgContainer.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showImageContextMenu(e, imageData, senderName, position, imgId);
  });

  messageContainer.appendChild(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
};

// ==================== Image Context Menu ====================
function showImageContextMenu(e, imageData, senderName, position, imgId) {
  const menu = document.getElementById("imageMenu");
  if (!menu) return;

  const downloadOpt = document.getElementById("downloadOption");
  const deleteOpt = document.getElementById("deleteImageOption");

  downloadOpt.onclick = () => {
    const a = document.createElement("a");
    a.href = imageData;
    a.download = `${senderName}_image.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    menu.style.display = "none";
  };

  if (position === "right") {
    deleteOpt.style.display = "block";
    deleteOpt.onclick = () => {
      if (confirm("Delete this image for everyone?")) {
        const msgEl = document.querySelector(`[data-id="${imgId}"]`);
        if (msgEl) msgEl.remove();
        let saved = localStorage.getItem(CHAT_KEY);
        if (saved) {
          let messages = JSON.parse(saved);
          messages = messages.filter(m => m.id !== imgId);
          localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
        }

        socket.emit("delete-message", imgId);
        menu.style.display = "none";
      }
    };
  } else {
    deleteOpt.style.display = "none";
  }

  menu.style.display = "block";
  menu.style.left = `${e.pageX || e.touches?.[0]?.pageX || 100}px`;
  menu.style.top = `${e.pageY || e.touches?.[0]?.pageY || 100}px`;

  document.addEventListener("click", () => (menu.style.display = "none"), { once: true });
}

// ==================== File Append ====================
const appendFileLink = (fileName, senderName, position, fileData, timestamp) => {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", position);

  const link = document.createElement("a");
  link.href = fileData;
  link.download = fileName;
  link.style.display = "inline-flex";
  link.style.alignItems = "center";
  link.style.gap = "8px";
  link.style.color = position === "right" ? "#0066ff" : "#333";
  link.style.fontWeight = "bold";
  link.style.textDecoration = "none";
  link.innerHTML = `⬇️ ${fileName} (Click to Download)`;

  messageElement.appendChild(link);

  const nameSpan = document.createElement("span");
  nameSpan.innerText = senderName;
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

  messageContainer.appendChild(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
};

// ==================== Socket Debug ====================
socket.on("connect", () => console.log("Socket connected!"));
socket.on("connect_error", (err) => console.error("Socket error:", err));

// ==================== Chat Clear Button ====================
// const clearBtn = document.createElement("button");
// clearBtn.innerHTML = "🧹 Clear Chat";
// clearBtn.className = "clear-chat-btn";
// clearBtn.onclick = () => {
//   if (confirm("Are you sure? This will clear all chat history permanently.")) {
//     localStorage.removeItem(CHAT_KEY);
//     messageContainer.innerHTML = "";
//     append("Chat history cleared 🧹", "null", true);
//   }
// };
// document.body.appendChild(clearBtn);
