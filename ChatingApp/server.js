const PORT = process.env.PORT || 4050;
const express = require("express");
const path = require("path"); // <-- path module added
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// Serve static files (css, js, images)
app.use(express.static(path.join(__dirname)));

// Root route to load signin.html first
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "signin.html"));
});

const users = {};

// ================== Socket.IO ==================
io.on("connection", (socket) => {

  socket.on("new-user-joined", (names) => {
    users[socket.id] = names;
    socket.broadcast.emit("user-joined", names);
  });

  socket.on("file-send", (data) => {
    socket.broadcast.emit("file-receive", {
      fileData: data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      names: users[socket.id],
      timestamp: data.timestamp,
    });
  });

  socket.on("send", (message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    socket.broadcast.emit("receive", {
      message: message,
      names: users[socket.id],
      timestamp: timestamp,
    });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("left", users[socket.id]);
    delete users[socket.id];
  });

});

// Start server
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
