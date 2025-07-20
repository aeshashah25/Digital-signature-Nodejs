const { SerialPort } = require('serialport');

// Change COM3 to your actual port (like COM4, etc.)
const port = new SerialPort({
  path: 'COM3',
  baudRate: 9600, // Check your device documentation
});

// When data comes from the device
port.on('data', (data) => {
  console.log("📥 Data received:", data.toString());
});

// If there's a connection or device error
port.on('error', (err) => {
  console.error("❌ Serial error:", err.message);
});
