import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db/connect.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { Server } from "socket.io";

dotenv.config();

const app = express();

const corsOptions = {
  origin: ["http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running at port ${PORT}`);
    });

    // Initialize Socket.IO
    const io = new Server(server, {
      pingTimeout: 60000,
      transports: ["websocket", "polling"],
      cors: corsOptions,
    });

    // Middleware to attach io instance to the request
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // Socket.IO event handlers
    io.on("connection", (socket) => {
      console.log("Connected to socket.io", socket.id);

      socket.on("setup", (userData) => {
        console.log(userData);
        socket.join(userData.existingUser._id);
        socket.emit("connected");
      });

      socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User joined room: " + room);
      });

      socket.on("typing", (room) => socket.in(room).emit("typing"));
      socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

      socket.on("new message", (newMessageReceived) => {
        let chat = newMessageReceived.newMessage.chat;

        if (!chat.users) {
          return console.log("chat.users not defined");
        }

        chat?.users?.forEach((user) => {
          if (user?._id === newMessageReceived?.newMessage?.sender?._id) return;
          socket.in(user._id).emit("message received", newMessageReceived);
        });
      });

      socket.on("groupRenamed", (data) => {
        let chat = data.chat;
        chat?.users?.forEach((user) => {
          socket.to(user._id).emit("groupNameChanged", { chat: chat });
        });

        socket.emit("groupNameChanged", { chat: chat });
      });

      socket.on("user removed", (data) => {
        let updatedChat = data.updatedChat;

        updatedChat?.users?.forEach((user) => {
          socket.to(user._id).emit("user was removed", { chat: updatedChat });
        });

        socket.emit("user was removed", { chat: updatedChat });
      });

      socket.on("user added", (data) => {
        let updatedChat = data.updatedChat;
        let name = data.name;

        updatedChat?.users?.forEach((user) => {
          socket
            .to(user._id)
            .emit("user was added", { chat: updatedChat, name: name });
        });

        socket.emit("user was added", { chat: updatedChat, name: name });
      });

      socket.on("group chat created", (data) => {
        let groupChat = data.groupChat;

        groupChat?.users?.forEach((user) => {
          socket
            .to(user._id)
            .emit("groupChat was created", { chat: groupChat });
        });

        socket.emit("groupChat was created", { chat: groupChat });
      });

      socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
      });

      socket.on("error", (err) => {
        console.error("Socket error:", err.message);
      });
    });

    // Route handlers
    app.use("/api/user", userRoutes);
    app.use("/api/chat", chatRoutes);
    app.use("/api/message", messageRoutes);

    // Health check endpoint
    app.get("/", async (req, res) => {
      try {
        console.log("API is running successfully");
        return res.status(200).json({ message: "API is running successfully" });
      } catch (error) {
        console.log("API run failure", error);
        return res.status(500).json({ message: error.message });
      }
    });
  })
  .catch((error) => {
    console.error("Could not connect to MongoDB", error);
  });
