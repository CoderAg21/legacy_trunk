const express = require("express");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();
require("./config/passport");
const mongoose = require("mongoose");
const path = require("path");
const User = require("./models/userModel");
const Family = require("./models/familyModel");
const sendMail = require("./config/mailer");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // your frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Enable CORS for frontend interaction
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// Session and Passport initialization
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Google authentication route setup
const googleAuth = passport.authenticate("google", { failureRedirect: "/" });

// Authentication middleware using JWT stored in cookies
function isLoggedIn(req, res, next) {
  try {
    const token = req.cookies?.authToken;
    if (!token) return res.redirect(`${process.env.FRONTEND_URL}/signup`);
    const userId = token;
    req.user = { _id: userId };
    next();
  } catch (err) {
    return res.redirect(`${process.env.FRONTEND_URL}/signup`);
  }
}

// Google authentication route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.post("/modify-profile", isLoggedIn, async (req, res) => {
  try {
    const { username, name } = req.body;
    const userId = req.user._id;
    if (!userId) return res.json({ route: "/family-select" });

    // Check if username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.json({
        error: "Username already taken, please choose another.",
      });
    }
    // Update user profile information
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, name },
      { new: true }
    );
    if (!updatedUser)
      return res.json({ route: `${process.env.FRONTEND_URL}/signup` });
    res.json({ route: "/dashboard" });
  } catch (err) {
    console.error("Error modifying profile:", err);
    res.status(500).json({ msg: "Server error during profile modification." });
  }
});

// Profile completion route
app.post("/complete-profile", isLoggedIn, async (req, res) => {
  try {
    const { username, age } = req.body;
    const userId = req.user._id;

    if (!userId) return res.json({ route: "/family-select" });

    // Check if username is already taken
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== userId.toString()) {
      return res.json({
        error: "Username already taken, please choose another.",
      });
    }

    // Update user profile information
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, age },
      { new: true }
    );
    if (!updatedUser) {
        return res.json({ route: `${process.env.FRONTEND_URL}/signup` });
    }

    // **MODIFIED LOGIC**
    // Redirect based on whether the user already has a family
    if (updatedUser.family_id) {
      res.json({ route: "/dashboard" });
    } else {
      res.json({ route: "/family-select" });
    }

  } catch (err) {
    console.error("Error completing profile:", err);
    res.status(500).json({ msg: "Server error during profile completion." });
  }
});

// Google authentication callback and user processing
app.get("/auth/google/callback", googleAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    // It's safer to fetch a fresh user object to avoid stale data
    const user = await User.findById(userId);

    if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    res.cookie("authToken", req.user._id, {
      httpOnly: true,
      secure: true, // only send over HTTPS
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Auto-join family if there's a pending invite for the user
    const pendingFamily = await Family.findOne({
      "invites.email": user.email,
      "invites.status": "pending",
    });

    if (pendingFamily) {
      const invite = pendingFamily.invites.find(
        (i) => i.email === user.email && i.status === "pending"
      );
      // Ensure the user is not already a member before adding them
      if (invite && !pendingFamily.members.some(memberId => memberId.equals(user._id))) {
        pendingFamily.members.push(user._id);
        invite.status = "accepted";
        await pendingFamily.save();
        user.family_id = pendingFamily._id;
        await user.save();
      }
    }
    
    // Redirect user based on profile completion status
    if (!user.username || !user.age) {
        return res.redirect(`${process.env.FRONTEND_URL}/profile`);
    }
    
    // Redirect based on family status
    if (!user.family_id) {
      // Corrected console log for clarity
      console.log("User has no family, redirecting to /family-select");
      return res.redirect(`${process.env.FRONTEND_URL}/family-select`);
    }
    
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);

  } catch (err) {
    console.error("Error in Google auth callback:", err);
    res.status(500).send("Server error");
  }
});

// Dashboard route that fetches user and family details
app.post("/", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const adminFamilies = await Family.find({ admin: req.user._id });
    const family = await Family.findById(user.family_id);
    res.json({
      name: user.name,
      username: user.username,
      isAdmin: adminFamilies.length > 0,
      adminFamilies,
      family_name: family ? family.family_name : "",
      _id: user._id,
      family_id: user.family_id,
    });
  } catch (err) {
    res.status(500).send("Server error");
  }
});
// Handle new family creation
app.post("/create-family", isLoggedIn, async (req, res) => {
  try {
    const { family_id, family_name } = req.body;
    const userId = req.user._id;

    // Prevent duplicate family IDs
    const existingFamily = await Family.findOne({ family_id });
    if (existingFamily) return res.status(400).send("Family ID already taken.");

    // Save new family and assign to user
    const family = new Family({
      admin: userId,
      family_id,
      family_name,
      members: [userId],
    });

    await family.save();
    await User.findByIdAndUpdate(userId, { family_id: family._id });

    res.json({ route: "/dashboard" });
  } catch (err) {
    res.status(500).send("Error creating family.");
  }
});

app.post("/join-family/invite", isLoggedIn, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findById(req.user._id);
    const familyId = user.family_id;

    const family = await Family.findById(familyId);

    if (!family) return res.status(404).send("Family not found");
    //this is for only admin can send the invitation
    // if (family.admin.toString() !== req.user._id.toString())
    //   return res.status(403).send("Not authorized");

    // 1. Generate a unique token for the invitation link
    const token = crypto.randomBytes(20).toString("hex");

    // 2. Save the invite in family.invites
    family.invites.push({ email, token });
    await family.save();

    // 3. Send invitation email
    const inviteLink = `http://legacy-trunk.vercel.app/join-family/${familyId}/invite/${token}`;
    await sendMail(
      user.email,
      "Family App <onboarding@resend.dev>",
      "You're invited to join a family 🎉",
      `<p>Hi there, I am ${user.name}</p>
   <p>You have been invited to join the family <b>${family.family_name}</b>.</p>
   <p>Click <a href="${inviteLink}">here</a> to sign in and join automatically!</p>`
    );

    res.json({ msg: "succesfully" });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

//Sending a joining request
// Send join request
app.post("/join-family/send-request", isLoggedIn, async (req, res) => {
  try {
    // Extract logged-in user ID
    const userId = req.user._id;

    // Extract family details from request
    const { family_id, family_username } = req.body;

    // Find admin user by email
    const admin = await User.findOne({ email: family_username });

    // Fetch logged-in user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find target family using family ID or admin reference
    const family = await Family.findOne({
      $or: [
        { family_id: family_id?.trim() },
        { admin: admin?._id?.toString() },
      ],
    }).populate("admin");

    if (!family) {
      return res.status(404).json({ message: "Family not found" });
    }

    // Prevent duplicate membership
    if (family.members.some((m) => m.toString() === userId.toString())) {
      return res.status(400).json({ message: "You are already a member" });
    }

    // Prevent duplicate pending requests
    const existingRequest = family.joinRequests.find(
      (r) => r.userId.toString() === userId.toString() && r.status === "pending"
    );
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You already have a pending request" });
    }

    // Add new join request
    family.joinRequests.push({ userId, status: "pending" });
    await family.save();

    // Send email to admin notifying new request
    try {
      await sendMail(
        family.admin.email,
        "New Family Join Request 🚀",
        `
          <p>Hi ${family.admin.username},</p>
          <p><b>${user.username}</b> has requested to join your family <b>${family.family_name}</b>.</p>
          <p>Visit your dashboard to review the request.</p>
         `
      );
    } catch (emailErr) {
      // Fail silently if email fails but request was saved
    }

    // Successful response
    return res.status(200).json({ message: "Join request sent successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

//SHow requests
app.post("/join-family/requests", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const familyId = user.family_id;
    // Find family by _id
    const family = await Family.findById(familyId);
    if (!family) return res.status(404).send("Family not found");
    // Only admin can view requests
    if (family.admin.toString() !== req.user._id.toString()) {
      return res.status(403).send("Not authorized");
    }

    // Get pending requests
    const pendingRequests = await Promise.all(
      family.joinRequests
        .filter((r) => r.status === "pending")
        .map(async (reqObj) => {
          const reqUser = await User.findById(reqObj.userId);
          return {
            name: reqUser?.name || "Unknown",
            createdAt: reqObj.createdAt,
            userId: reqObj.userId,
            familyId: family._id,
          };
        })
    );

    res.json({ family, pendingRequests });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
});

// Approve or reject
app.post(
  "/join-family/requests/:familyId/:requestId/approve",
  isLoggedIn,
  async (req, res) => {
    try {
      const { familyId, requestId } = req.params;

      // 1. Find the family
      const family = await Family.findById(familyId);
      if (!family) return res.status(404).send("Family not found");

      // 2. Check admin authorization
      if (family.admin.toString() !== req.user._id.toString()) {
        return res.status(403).send("Not authorized");
      }

      // 3. Find the specific request
      const request = family.joinRequests.find(
        (r) => r.userId.toString() === requestId.toString()
      );

      if (!request) return res.status(404).send("Request not found");

      // 4. Fetch the user who sent the request
      const user = await User.findById(request.userId);
      if (!user) return res.status(404).send("Requesting user not found");
      // 5. Approve the request
      request.status = "approved";
      family.members.push(request.userId);
      await family.save();

      // 6. Update user's family_id in User collection
      await User.findByIdAndUpdate(request.userId, { family_id: family._id });

      // 7. Send email to the requesting user
      await sendMail(
        user.email,
        "Your Family Request was Accepted 🎉",
        `<p>Hi ${user.name || "there"},</p>
       <p>Your request to join the family <b>${
         family.family_name
       }</b> has been accepted!</p>
       <p>Welcome to the family 💫</p>`
      );

      res.redirect(`/join-family/${family._id}/requests`);
    } catch (err) {
      res.status(500).send("Server error");
    }
  }
);

// Reject a family join request
app.post(
  "/join-family/requests/:familyId/:requestId/reject",
  isLoggedIn,
  async (req, res) => {
    try {
      const { familyId, requestId } = req.params;

      // 1. Find the family
      const family = await Family.findById(familyId);
      if (!family) return res.status(404).json({ message: "Family not found" });

      // 2. Check admin authorization
      if (family.admin.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // 3. Find the join request by userId
      const request = family.joinRequests.find(
        (r) => r.userId.toString() === requestId.toString()
      );
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      // 4. Fetch the user who sent the request
      const user = await User.findById(request.userId);
      if (!user)
        return res.status(404).json({ message: "Requesting user not found" });

      // 5. Reject the request
      request.status = "rejected";
      await family.save();

      // 6. Send rejection email to the requesting user
      await sendMail(
        user.email,
        "Your Family Join Request Was Rejected ❌",
        `<p>Hi ${user.name || "there"},</p>
       <p>We're sorry to inform you that your request to join the family 
       <b>${family.family_name}</b> was <b>rejected</b>.</p>
       <p>You may reach out to the family admin for more details.</p>`
      );

      // 7. Redirect or send success response
      res.redirect(`/join-family/${family._id}/requests`);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

//fetching the family members
app.post("/family/members", isLoggedIn, async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  const family = await Family.findById(user.family_id);
  try {
    const members = await User.find(
      { _id: { $in: family.members } }, // match all IDs in array
      { name: 1 } // project only the name field
    );
    const result = members.map((member) => ({
      id: member._id.toString(), // convert ObjectId to strin
      name: member.name,
    }));

    res.json({ members: result });
  } catch (error) {
    res.json({ members: [] });
  }
});

const Message = require("./models/MessageModel");

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(userId); // join room by userId
  });

  socket.on("send_message", async ({ sender, receiver, text, time }) => {
    // Save to MongoDB
    const message = await Message.create({
      sender,
      receiver,
      text,
      createdAt: time,
    });
    // Emit to receiver
    io.to(receiver).emit("receive_message", message);
    // Emit to sender as well (optional)
    io.to(sender).emit("receive_message", message);
  });

  socket.on("disconnect", () => {});
});

// Get messages between two users
app.post("/messages", isLoggedIn, async (req, res) => {
  const { sender, receiver } = req.body;
  const messages = await Message.find({
    $or: [
      { sender, receiver },
      { sender: receiver, receiver: sender },
    ],
  }).sort({ createdAt: 1 });

  res.json({ messages });
});

//Aviral's Backend
const multer = require("multer");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create uploads directories if they don't exis
const uploadsDir = path.join(__dirname, "public", "uploads");
const storiesDir = path.join(__dirname, "public", "stories");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(storiesDir)) fs.mkdirSync(storiesDir, { recursive: true });

// Cloudinary storage for posts
const postStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "uploads",
    resource_type: file.mimetype.startsWith("video/") ? "video" : "image",
    public_id: `media-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});
const uploadPost = multer({
  storage: postStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Cloudinary storage for stories
const storyStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "stories",
    resource_type: file.mimetype.startsWith("video/") ? "video" : "image",
    public_id: `story-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});
const uploadStory = multer({
  storage: storyStorage,
  limits: { fileSize: 30 * 1024 * 1024 },
});

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Schemas
const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const itemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  family_id: { type: mongoose.Schema.Types.ObjectId, ref: "Family" },
  member_name: String,
  text: String,
  description: String,
  media: [
    {
      url: { type: String, required: true },
      type: { type: String, required: true }, // 'image' or 'video'
    },
  ],
  tags: [String],
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
});

const storySchema = new mongoose.Schema({
  title: String,
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  media: { type: String, required: true },
  mediaType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 },
  views: [{ type: Date }],
});

const Item = mongoose.model("Item", itemSchema);
const Story = mongoose.model("Story", storySchema);

// Add post
app.post(
  "/add-media",
  isLoggedIn,
  uploadPost.array("files", 10),
  async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const familyId = user.family_id;

    try {
      const { text, description, tags } = req.body || "";
      const mediaFiles = req.files.map((file) => ({
        url: `${file.path}`,
        type: file.mimetype.startsWith("video/") ? "video" : "image",
      }));

      const newItem = await new Item({
        member_name: user.name,
        family_id: familyId,
        user_id: userId,
        text,
        media: mediaFiles,
        tags,
        description,
      });

      await newItem.save();
      res.json({
        message: "Media added successfully",
        media: mediaFiles,
        _id: newItem._id,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);
// Add modified post
app.post(
  "/add-modified-media/:postId",
  isLoggedIn,
  uploadPost.array("files", 10),
  async (req, res) => {
    const { postId } = req.params;
    const userId = req.user._id;

    try {
      const { text, description } = req.body;

      // Start with the text fields that might be updated
      const updateData = { text, description };

      // **Only if new files are uploaded, prepare and add them to the update object**
      if (req.files && req.files.length > 0) {
        const mediaFiles = req.files.map((file) => ({
          url: file.path,
          type: file.mimetype.startsWith("video/") ? "video" : "image",
        }));
        updateData.media = mediaFiles;
      }

      // Perform the update with our conditional update object
      const modifiedItem = await Item.findOneAndUpdate(
        { user_id: userId, _id: postId }, // condition to match
        { $set: updateData }, // Use $set to update only specified fields
        { new: true } // Return the updated document
      );

      if (!modifiedItem) {
        return res
          .status(404)
          .json({ message: "Post not found or update failed." });
      }

      // The .save() call is not needed after findOneAndUpdate
      res.json({ message: "Media updated successfully", item: modifiedItem });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

//fetch-all-posts
app.post("/family/fetch-all-posts", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const familyId = user.family_id;
    const items = await Item.find({ family_id: familyId }).sort({
      createdAt: -1,
    });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//fetch-user-post
app.post("/family/fetch-user-posts", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const familyId = user.family_id;
    const items = await Item.find({ user_id: userId }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//fetch-single-post
app.post("/family/fetch-single-post/:id", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Item.findById(id);

    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

//add-comments
app.post("/comment/:id", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findOne({ _id: userId });

    const { commentText } = req.body;

    await Item.findByIdAndUpdate(req.params.id, {
      $push: { comments: { text: commentText, name: user.name } },
    });
  } catch {
    res.json({ message: "falied" });
  }
});

//delete comment
app.post("/delete-comment/:itemId/:commentId", async (req, res) => {
  try {
    await Item.findByIdAndUpdate(req.params.itemId, {
      $pull: { comments: { _id: req.params.commentId } },
    });
    res.json({ msg: "successfully" });
  } catch {
    res.json({ msg: "unsuccesfull" });
  }
});

// Add story
app.post(
  "/add-story",
  isLoggedIn,
  uploadStory.single("storyFile"),
  async (req, res) => {
    const userId = req.user._id;
    try {
      const mediaType = req.file.mimetype.startsWith("video/")
        ? "video"
        : "image";
      await Story.create({
        media: req.file.path,
        mediaType,
        user_id: userId,
        title: req.body.title,
      });
      res.json({ msg: "ok" });
    } catch (err) {
      res.json({ msg: "bad" });
    }
  }
);

// get-stories
app.get("/get-stories/:userId", async (req, res) => {
  const { userId } = req.params;
  const stories = await Story.find({ user_id: userId });
  res.json({ stories });
});

//fetch-stories
app.post("/:who/fetch-stories", isLoggedIn, async (req, res) => {
  let Id = req.user._id;
  const { who } = req.params;

  if (who !== "user") Id = who;
  try {
    const stories = await Story.find({ user_id: Id }).sort({ createdAt: 1 });

    res.json({ stories });
  } catch (error) {
    res.json({ error });
  }
});

//check auth for frontend
app.post("/check-auth", isLoggedIn, (req, res) => {
  const authenticated = Boolean(req.user?._id);
  res.json({ authenticated, user: req.user?._id });
});

// Delete post
app.post("/delete/post/:id", isLoggedIn, async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ msg: "Delete Success" });
  } catch {
    res.json({ msg: "Delete failed" });
  }
});

// Ensure you have this require statement at the top of your file
const axios = require("axios");

// ... your other code

// Replace your existing download-pdf route with this one
app.post("/download-pdf", async (req, res) => {
  try {
    const { familyId } = req.body;

    const posts = await Item.find({ family_id: familyId }).sort({
      createdAt: -1,
    });

    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "No posts found for this user." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="LegacyTrunk_Memories_Centered.pdf"'
    );

    const doc = new PDFDocument({ autoFirstPage: false, margin: 50 });
    doc.pipe(res);

    // --- Helper Function to Add a Frame to Each Page ---
    const addPageFrame = () => {
      doc
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .lineWidth(1)
        .strokeColor("#dddddd")
        .stroke();
    };

    // --- Auto-apply the frame whenever a new page is added ---
    doc.on("pageAdded", addPageFrame);

    // --- Title Page (Already Centered) ---
    doc.addPage();
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Your Family Memories", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .font("Helvetica")
      .text("From Your Legacy Trunk", { align: "center" });
    doc.moveDown(2);
    doc
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text(`Generated on: ${new Date().toLocaleDateString()}`, {
        align: "center",
        y: doc.page.height - 100,
      });

    // --- Loop Through Posts ---
    for (const post of posts) {
      doc.addPage();

      // --- Post Text / Description (NOW CENTERED) ---
      if (post.text) {
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .fillColor("black")
          .text(post.text, { align: "center" });
        doc.moveDown(0.5);
      }
      if (post.description) {
        doc
          .fontSize(11)
          .font("Helvetica")
          .text(post.description, { align: "center" });
        doc.moveDown(1);
      }
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor("#888888")
        .text(`Posted on: ${new Date(post.createdAt).toLocaleString()}`, {
          align: "center",
        });
      doc.moveDown(1.5);

      // --- Post Media (Images and Videos) ---
      if (post.media && post.media.length > 0) {
        for (const media of post.media) {
          if (media.type === "image") {
            try {
              const imageResponse = await axios.get(media.url, {
                responseType: "arraybuffer",
              });
              const imageBuffer = Buffer.from(imageResponse.data, "binary");
              doc.image(imageBuffer, {
                fit: [450, 400],
                align: "center",
                valign: "center",
              });
              doc.moveDown(1);
            } catch (error) {
              doc
                .fillColor("red")
                .text(`[Image could not be loaded]`, { align: "center" });
            }
          } else if (media.type === "video") {
            try {
              // Create a Cloudinary URL for the video thumbnail
              const thumbnailUrl = media.url
                .replace("/upload/", "/upload/w_450,h_250,c_fill,so_2/")
                .replace(/\.(mp4|mov|avi|wmv)$/, ".jpg");

              const thumbResponse = await axios.get(thumbnailUrl, {
                responseType: "arraybuffer",
              });
              const thumbBuffer = Buffer.from(thumbResponse.data, "binary");

              // Embed the thumbnail image
              doc.image(thumbBuffer, {
                fit: [450, 250],
                align: "center",
                valign: "center",
              });
              doc.moveDown(1);

              // --- Add the styled, centered "Watch Video" link ---
              doc
                .font("Helvetica-Bold")
                .fontSize(12)
                .fillColor("#0066cc")
                .text("▶ Watch Video", {
                  align: "center", // This ensures the link is centered
                  link: media.url,
                  underline: true,
                });
              doc.moveDown(1);
            } catch (error) {
              doc
                .fillColor("red")
                .text(`[Video thumbnail could not be loaded]`, {
                  align: "center",
                });
            }
          }
          doc.moveDown(1.5); // Space after each media item
        }
      }
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

// Logout route to destroy session and clear cookies
app.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.clearCookie("connect.sid");
  res.json({ msg: "logout done!!" });
});

const PORT = process.env.PORT || 3128;
server.listen(PORT, () => {});
