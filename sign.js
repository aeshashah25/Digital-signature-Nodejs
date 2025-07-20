const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.json({ limit: "5mb" }));

// In-memory store (replace with database in production)
const userKeys = {}; // { userId: { publicKey, privateKey } }

// Create a new user with their own key pair
app.post("/new-user", (req, res) => {
  const userId = uuidv4(); // generate a unique ID

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });

  userKeys[userId] = { publicKey, privateKey };

  res.json({
    userId,
    publicKey, // return only the public key to client
  });
});

// Sign data for a specific user
app.post("/sign", (req, res) => {
  const { userId, imageData } = req.body;

  if (!userId || !imageData)
    return res.status(400).json({ error: "userId and imageData are required" });

  const keys = userKeys[userId];
  if (!keys)
    return res.status(404).json({ error: "User not found" });

  try {
    const dataBuffer = Buffer.from(imageData, "utf-8");

    const signature = crypto.sign("sha256", dataBuffer, {
      key: keys.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    });

    res.json({ signature: signature.toString("base64") });
  } catch (err) {
    console.error("Signing error:", err);
    res.status(500).json({ error: "Signing failed" });
  }
});

// Verify signature using user's public key
app.post("/verify", (req, res) => {
  const { userId, imageData, signature } = req.body;

  if (!userId || !imageData || !signature)
    return res.status(400).json({ error: "userId, imageData, and signature are required" });

  const keys = userKeys[userId];
  if (!keys)
    return res.status(404).json({ error: "User not found" });

  try {
    const dataBuffer = Buffer.from(imageData, "utf-8");
    const sigBuffer = Buffer.from(signature, "base64");

    const isVerified = crypto.verify(
      "sha256",
      dataBuffer,
      {
        key: keys.publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      sigBuffer
    );

    res.json({ isVerified });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});


// | Item         | Who owns it                | Used for       | Shared?                          |
// | ------------ | -------------------------- | -------------- | -------------------------------- |
// | `privateKey` | **Your server**            | Signing        | ❌ Never shared                   |
// | `publicKey`  | **Also from your server**  | Verification   | ✅ Yes, exposed via `/public-key` |
// | `signature`  | **Created by your server** | Validates data | ✅ Shared with the client         |


// When a user is created (/new-user), a key pair is generated:

// privateKey: Used internally by the server to sign data for that user

// publicKey: Used by anyone to verify that a message was really signed by that user's private key

// ✅ Where the public key is used
// It's not used at the moment of signing — it's used later for verification.

// 🔐 Here's how it flows:
// User is created:

// You get userId and publicKey

// User signs something via /sign:

// The server uses their private key to generate a signature based on input data.

// You verify later via /verify:

// The server uses that user's stored public key (from memory) to check if the signature matches the imageData.


