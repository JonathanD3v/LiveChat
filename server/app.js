const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const http = require("http");
require("dotenv").config();

const formatMessage = require("./utils/formatMSG");
// const {
//   saveUser,
//   getDisconnectUser,
//   getSameRoomUsers,
// } = require("./utils/user");

const Message = require("./models/Message");
const messageController = require("./controllers/message");

const authRoutes = require("./routes/auth");
const messageRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", authRoutes);
app.use('/api', messageRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to database"))
  .catch((error) => console.error("Database connection error:", error));


  // socket auth
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; 
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

// Socket.IO Logic
io.on("connection", (socket) => {
  console.log("Client connected!");

  socket.on("join_conversation", ({conversationId})=>{
    socket.join(conversationId)
  })


  socket.on("typing", ({ conversationId }) => {
    socket.broadcast.to(conversationId).emit("typing", socket.user.userId);
  });

  socket.on("mark_read", async ({ messageId }) => {
    await Message.findByIdAndUpdate(messageId, { read: true });
  });
  

  socket.on("send_message", async (data) => {
    // data: { conversationId, senderId, content, type }
    const message = await Message.create({
      conversation: data.conversationId,
      sender: data.senderId,
      content: data.content,
      type: data.type || 'text'
    });
    io.to(data.conversationId).emit("receive_message", message);

    const messageCount = await Message.countDocuments({ conversation: data.conversationId });
    if (messageCount === 1) {
      // auto bot reply
      setTimeout(async () => {
        const welcomeMessage = await Message.create({
          conversation: data.conversationId,
          sender: null,
          content: "Hi! An admin will reply to you shortly.",
          type: "text"
        });
        io.to(data.conversationId).emit("receive_message", welcomeMessage);
      }, 1000);
    }
  });
});

app.set("io", io);

// Start Server
const PORT = process.env.PORT || 5555;
server.listen(PORT, () => {
  console.log(`Server is running at port - ${PORT}`);
});
