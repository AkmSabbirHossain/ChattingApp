
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4050;

// Static files (css, js, images, audio )
app.use(express.static(__dirname));

// Root URL-a signin.html shown
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/signin.html");
});

// index.html route
app.get("/index.html", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// User name save
const users = {};

// ==================== Socket connection ====================
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // New user join 
  socket.on("new-user-joined", (name) => {
    if (!name || name.trim() === "") {
      name = "Guest_" + Math.floor(Math.random() * 1000);
    }
    users[socket.id] = name;
    socket.broadcast.emit("user-joined", name);
    console.log(`${name} joined the chat`);
  });

  // Message send
  socket.on("send", (data) => {
    const senderName = data.senderName || users[socket.id] || "Unknown";
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    socket.broadcast.emit("receive", {
      message: data.message,
      names: senderName,
      timestamp: timestamp,
      id: data.id
    });
  });

  // Typing indicator
  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  // File/Image send
  socket.on("file-send", (data) => {
    socket.broadcast.emit("file-receive", {
      fileData: data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      names: users[socket.id] || "Unknown",
      timestamp: data.timestamp
    });
  });

  // Message delete
  socket.on("delete-message", (messageId) => {
    socket.broadcast.emit("message-deleted", messageId);
    console.log(`Message deleted by ${users[socket.id] || "someone"}: ${messageId}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      socket.broadcast.emit("left", users[socket.id]);
      console.log(`${users[socket.id]} left the chat`);
      delete users[socket.id];
    }
  });
});

// ==================== Server ====================
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Live URL: https://sabbir-chat.onrender.com`);
});

