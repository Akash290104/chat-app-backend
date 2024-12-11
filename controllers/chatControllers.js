import asyncHandler from "express-async-handler";
import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";

const accessChats = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.log("User id param not sent");
    return res.status(400).json({ message: "User id param not sent" });
  }

  let isChat = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    return res.status(200).json(isChat[0]);
  } else {
    let chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };
    try {
      const newChat = await Chat.create(chatData);
      if (!newChat) {
        console.log("New Chat could not be created");
        return res
          .status(501)
          .json({ message: "New Chat could not be created" });
      }

      await newChat.save();

      const fullChat = await Chat.findById(newChat._id).populate(
        "users",
        "-password"
      );

      if (!fullChat) {
        console.log("Chat created but could not be populated");
        return res
          .status(500)
          .json({ message: "Chat created but could not be populated" });
      }

      console.log("New Chat created successfully");
      return res
        .status(200)
        .json({ message: "New Chat created successfully", fullChat });
    } catch (error) {
      console.log("Error in accessChats", error);
      return res.status(501).json(error.message);
    }
  }
});

const fetchChats = asyncHandler(async (req, res) => {
  try {
    let result = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    result = await User.populate(result, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    console.log("All chats for the user fetched successfully");
    return res
      .status(202)
      .json({ message: "All chats for the user fetched successfully", result });
  } catch (error) {
    console.log("error fetching chats for the user");
    return res.status(500).json(error.message);
  }
});

const createGroupChat = asyncHandler(async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(402).json({ message: "Please fill all the fields" });
  }

  // console.log(users);
  let users = req.body.users;

  let admin = req.user;
  users.push(admin._id);

  if (users.length < 3) {
    return res
      .status(402)
      .json({ message: "Group must have at least 2 users" });
  }

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: admin,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    fullGroupChat.groupAdmin.isAdmin = true;

    // fullGroupChat.groupAdmin.isAdmin = true

    res
      .status(200)
      .json({ message: "Group Chat created successfully", fullGroupChat });
  } catch (error) {
    console.log("Error creating group chats", error);
    res.status(500).json(error.message);
  }
});

const renameGroup = asyncHandler(async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    console.log("Please provide  id and name");
    return res.status(402).json({ message: "Please provide  id and name" });
  }

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      id,
      {
        chatName: name,
      },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin");

    if (!updatedChat) {
      console.log("Group chat could not be updated");
      return res
        .status(500)
        .json({ message: "Group chat could not be updated" });
    } else {
      console.log("Group renamed successfully");
      // console.log("Brooooo");

      const chatUsers = updatedChat.users;
      // console.log({ chatUsers });
      // chatUsers.forEach((user) => {
      //   req.io.in(user._id).emit("groupRenamed", updatedChat);
      // });

      // console.log("socket");

      return res
        .status(200)
        .json({ message: "Group chat renamed successfully", updatedChat });
    }
  } catch (error) {
    console.log("Error renaming group chat", error);
    return res.status(500).json(error.message);
  }

});

const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    console.log("Please provide both ids - chat and user");
    return res
      .status(402)
      .json({ message: "Please provide both ids - chat and user" });
  }

  try {
    const added = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { users: userId },
      },
      {
        new: true,
      }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!added) {
      console.log("Member could not be added");
      return res.status(500).json({ message: "Member could not be added" });
    } else {
      console.log("Member added successfully");
      return res
        .status(200)
        .json({ message: "Member added successfully", added });
    }
  } catch (error) {
    console.log("Error adding member to group chat");
    return res.status(500).json(error.message);
  }
});

const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    console.log("Please provide both ids - chat and user");
    return res
      .status(402)
      .json({ message: "Please provide both ids - chat and user" });
  }

  try {
    const removed = await Chat.findByIdAndUpdate(
      chatId,
      {
        $pull: { users: userId },
      },
      {
        new: true,
      }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!removed) {
      console.log("Member could not be removed");
      return res.status(500).json({ message: "Member could not be removed" });
    } else {
      console.log("Member removed successfully");
      return res
        .status(200)
        .json({ message: "Member removed successfully", removed });
    }
  } catch (error) {
    console.log("Error removing member from group chat");
    return res.status(500).json(error.message);
  }
});


export {
  accessChats,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
