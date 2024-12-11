import asyncHandler from "express-async-handler";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Chat from "../models/chatModel.js";

const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content } = req.body;
  if (!chatId || !content) {
    console.log("chatId and content are mandatory");
    return res
      .status(402)
      .json({ message: "chatId and content are mandatory" });
  }

  const message = {
    sender: req.user._id,
    chat: chatId,
    content: content,
  };

  try {
    let newMessage = await Message.create(message);
    newMessage.save();

    newMessage = await newMessage.populate("sender", "name pic email");
    newMessage = await newMessage.populate("chat");

    newMessage = await User.populate(newMessage, {
      path: "chat.users",
      select: "name pic",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: newMessage,
    });

    if (!newMessage) {
      console.log("Could not send message");
      return res.status(400).json({ message: "Could not send message" });
    }

    console.log("Message sent successfully");
    return res
      .status(200)
      .json({ message: "Message sent successfully", newMessage });
  } catch (error) {
    console.log("Error sending the message", error);
    return res.status(400).json({ message: error.message });
  }
});

const allMessages = asyncHandler(async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name pic email")
      .populate("chat");

    if (!messages) {
      console.log("Could not find messages");
      return res.status(400).json({ message: "Could not find messages" });
    }

    console.log("Messages found");
    return res.status(200).json({ message: "Messages found", messages });
  } catch (error) {
    console.log("Error fetching messages", error);
    return res.status(400).json({ message: "Error fetching messages", error });
  }
});

export { sendMessage, allMessages };
