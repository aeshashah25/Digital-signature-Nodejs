const Jimp = require('jimp');
const QrCode = require('qrcode-reader');
const express = require('express');
const multer = require('multer');
const { SerialPort } = require('serialport');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = 3000;
const portName = 'COM3'; // <-- Replace with your actual COM port

app.use(express.json());

// Serial port setup
const serialPort = new SerialPort({
  path: portName,
  baudRate: 9600,
});

let buffer = '';

serialPort.on('data', (data) => {
  buffer += data.toString();

  if (buffer.includes('\n')) {
    const lines = buffer.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      try {
        const jsonData = JSON.parse(line);
        console.log('Received IoT JSON from serial:', jsonData);
        // You can add extra processing or event emitting here
      } catch (e) {
        console.error('Failed to parse JSON from serial:', line);
      }
    }
    buffer = lines[lines.length - 1];
  }
});

serialPort.on('error', (err) => {
  console.error('Serial port error:', err.message);
});

// QR code image upload endpoint
app.post('/upload-qrcode', upload.single('qrcode'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  Jimp.read(req.file.buffer, (err, image) => {
    if (err) return res.status(500).send('Failed to read image.');

    const qr = new QrCode();

    qr.callback = (error, value) => {
      if (error) return res.status(400).send('Failed to decode QR code.');
      res.send({ result: value.result });
    };

    qr.decode(image.bitmap);
  });
});

// HTTP IoT JSON POST endpoint
app.post('/iotdata', (req, res) => {
  console.log('Received IoT data via HTTP:', req.body);
  res.send({ status: 'success', received: req.body });
});

// Start Express server once
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Listening for serial data on port ${portName} at 9600 baud`);
});


