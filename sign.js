const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json({ limit: '5mb' }));

// Serve index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Generate key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

// POST route for signature
app.post("/sign", (req, res) => {
  try {
    const base64Image = req.body.imageData;
    if (!base64Image) return res.status(400).json({ error: "No image data provided" });

    const dataBuffer = Buffer.from(base64Image, "utf-8");

    const signature = crypto.sign("sha256", dataBuffer, {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    });

    res.json({ signature: signature.toString("base64") });
  } catch (error) {
    console.error("Error in /sign:", error);
    res.status(500).json({ error: "Signing failed" });
  }
});
app.post("/verify", (req, res) => {
  try {
    const { imageData, signature } = req.body;
    if (!imageData || !signature) {
      return res.status(400).json({ error: "Image data or signature missing" });
    }

    const dataBuffer = Buffer.from(imageData, "utf-8");
    const sigBuffer = Buffer.from(signature, "base64");

    const isVerified = crypto.verify(
      "sha256",
      dataBuffer,
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      sigBuffer
    );

    res.json({ isVerified });
  } catch (error) {
    console.error("Error in /verify:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});


app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
