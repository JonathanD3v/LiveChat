const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socketIo = require("socket.io");
const http = require("http");
require("dotenv").config();
const path = require("path");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const Message = require("./models/Message");
const messageController = require("./controllers/message");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/chat");
const User = require("./models/User");
const redis = require("./utils/redisClient");

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/api", authRoutes);
app.use('/api', messageRoutes);

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to database"))
  .catch((error) => console.error("Database connection error:", error));

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

io.on("connection", async (socket) => {
  const userId = socket.user.userId;
  console.log(`User connected: ${userId}`);

  // update user online in DB and Redis
  await User.findByIdAndUpdate(userId, { online: true, socketId: socket.id });
  await redis.set(`user_online:${userId}`, "true");
  await redis.expire(`user_online:${userId}`, 60);

  // keep-alive every 30 sec
  const keepAliveInterval = setInterval(async () => {
    await redis.set(`user_online:${userId}`, "true");
    await redis.expire(`user_online:${userId}`, 60);
  }, 30000);

  socket.on("join_conversation", ({ conversationId }) => {
    socket.join(conversationId);
  });

  // typing with TTL
  socket.on("typing", async ({ conversationId }) => {
    const typingKey = `typing:${conversationId}:${userId}`;
    await redis.set(typingKey, "1", { EX: 5 }); // expire in 5 seconds
    socket.broadcast.to(conversationId).emit("typing", userId);
  });

  socket.on("mark_read", async ({ messageId, conversationId }) => {
    await Message.findByIdAndUpdate(messageId, { read: true });

    const unreadKey = `unread_count:${userId}:${conversationId}`;
    await redis.set(unreadKey, 0);
  });

  socket.on("send_message", async (data) => {
    const messageId = uuidv4();
    const redisKey = `message_buffer:${messageId}`;
    await redis.set(redisKey, JSON.stringify(data), { EX: 300 }); // temporary store

    const message = await Message.create({
      conversation: data.conversationId,
      sender: data.senderId,
      content: data.content,
      type: data.type || "text",
    });

    // emit message to room
    io.to(data.conversationId).emit("receive_message", message);

    // Cache last 10 messages
    const recentKey = `recent_messages:${data.conversationId}`;
    await redis.lpush(recentKey, JSON.stringify(message));
    await redis.ltrim(recentKey, 0, 9); // keep only last 10

    const receiverIds = await getOtherParticipants(data.conversationId, data.senderId); 
    for (const receiverId of receiverIds) {
      const unreadKey = `unread_count:${receiverId}:${data.conversationId}`;
      await redis.incr(unreadKey);
    }

    // auto bot reply
    const messageCount = await Message.countDocuments({ conversation: data.conversationId });
    if (messageCount === 1) {
      setTimeout(async () => {
        const welcomeMessage = await Message.create({
          conversation: data.conversationId,
          sender: null,
          content: "Hi! Channel to my welcome.",
          type: "text",
        });
        io.to(data.conversationId).emit("receive_message", welcomeMessage);

        await redis.lpush(recentKey, JSON.stringify(welcomeMessage));
        await redis.ltrim(recentKey, 0, 9);
      }, 1000);
    }
  });

  socket.on("disconnect", async () => {
    clearInterval(keepAliveInterval);

    await redis.set(`user_online:${userId}`, "false");
    await User.findByIdAndUpdate(userId, {
      online: false,
      socketId: null,
      lastSeen: new Date(),
    });
  });
});

app.set("io", io);

const PORT = process.env.PORT || 5555;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
