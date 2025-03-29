// Import the express module
const express = require('express');
const axios = require('axios');
require('dotenv').config();
const path = require('path'); // Required for file paths

const app = express();

// Define the port number
const PORT = 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'server.html'));
});

app.get('/api/meteostat', async (req, res) => {
  const { lat, lon, date } = req.query;

  if (!lat || !lon || !date) {
    return res.status(400).json({ message: 'Missing lat, lon, or date' });
  }

  try {
    const stationRes = await axios.get(
      `https://meteostat.p.rapidapi.com/stations/nearby?lat=${lat}&lon=${lon}&limit=5`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
          'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
        }
      }
    );

    const stations = stationRes.data.data;

    for (const station of stations) {
      const weatherRes = await axios.get(
        `https://meteostat.p.rapidapi.com/stations/daily?station=${station.id}&start=${date}&end=${date}&units=metric`,
        {
          headers: {
            'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
            'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
          }
        }
      );

      const weatherData = weatherRes.data.data;
      if (weatherData.length > 0) {
        return res.json({
          stationId: station.id,
          stationName: station.name,
          ...weatherData[0]
        });
      }
    }

    res.status(404).json({ message: 'No weather data found' });
  } catch (error) {
    console.error('❌ Meteostat API error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});