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


// Public Key → shared with everyone, used to verify signatures.

// Private Key → kept secret, used to sign data.

// Signature → proof that the data was signed by someone who owns the private key.

// You create a new user (/new-user)
// → You get userId + publicKey

// You want to prove data is authentic
// → Send userId + imageData to /sign
// → You get back a signature

// You or someone else wants to verify it
// → Send userId + imageData + signature to /verify
// → Get result: isVerified = true or false