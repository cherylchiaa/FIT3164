// Import the express module
const express = require('express');
const app = express();

// Define the port number
const PORT = 3000;

// Define a basic route
app.get('/', (req, res) => {
  res.send('Weather Visualisation App!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
