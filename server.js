// Import the express module
const express = require('express');
const axios = require('axios');
require('dotenv').config();
const path = require('path'); // Required for file paths
const mongoose = require("mongoose");

const app = express();

// Define the port number
const PORT = process.env.PORT || 3000;

const Weather = require("./model/Weather");

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Define a route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'server.html'));
});

let stations = [];

try {
  stations = require(path.join(__dirname, 'public', 'all-stations.json'));
  console.log("✅ All stations loaded");
} catch (err) {
  console.error("❌ Failed to load stations file:", err.message);
}

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

app.get('/api/choropleth', async (req, res) => {
  const { date } = req.query;

  // Validate date input
  const parsedDate = new Date(date);
  if (!date || isNaN(parsedDate)) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  const start = new Date(parsedDate.setHours(0, 0, 0, 0)).getTime();
  const end = new Date(parsedDate.setHours(23, 59, 59, 999)).getTime();

  try {
    const results = await Weather.find({
      time: { $gte: start, $lte: end }
    });

    res.json(results);
  } catch (err) {
    console.error("❌ Choropleth error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/chart', async (req, res) => {
  const { lat, lon, start, end } = req.query;

  if (!lat || !lon || !start || !end) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // Get nearest weather station
    const stationRes = await axios.get(
      `https://meteostat.p.rapidapi.com/stations/nearby?lat=${lat}&lon=${lon}&limit=1`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
          'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
        }
      }
    );

    const station = stationRes.data.data[0];
    if (!station) {
      return res.status(404).json({ message: 'No nearby station found' });
    }

    // Fetch daily weather data
    const weatherRes = await axios.get(
      `https://meteostat.p.rapidapi.com/stations/daily?station=${station.id}&start=${start}&end=${end}&units=metric`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.METEOSTAT_API_KEY,
          'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
        }
      }
    );

    res.json({
      stationId: station.id,
      stationName: station.name,
      data: weatherRes.data.data
    });
  } catch (error) {
    console.error("❌ Chart API error:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
    });

    console.log("✅ Connected to MongoDB Atlas");

    // ✅ Fetch and Print First Valid Weather Record
    const firstDoc = await Weather.findOne();

    if (firstDoc) {
      console.log("🌍 First Weather Record with Coordinates:");
      console.log(firstDoc);
    } else {
      console.log("⚠️ No weather record found.");
    }

  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

connectDB();


app.get('/api/geocode', async (req, res) => {
  const place = req.query.place;
  if (!place) {
    return res.status(400).json({ message: 'Missing place parameter' });
  }

  try {
    const response = await axios.get(`https://api.opencagedata.com/geocode/v1/json`, {
      params: {
        q: place,
        key: process.env.OPENCAGE_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error("Geocode API error:", error.message);
    res.status(500).json({ message: 'Geocoding failed' });
  }
});

app.get('/weather', async (req, res) => {
  console.log("📡 /weather route hit");
  const { station, date } = req.query;
  console.log("📥 Received query:", req.query);
  console.log(station)
  if (!station || !date) {
    return res.status(400).json({ message: "Missing station or date" });
  }

  try {
    const result = await Weather.find({
      station_name: new RegExp(station, 'i'), // Case-insensitive match
      time: {
        $gte: new Date(date + 'T00:00:00Z').getTime(),
        $lte: new Date(date + 'T23:59:59Z').getTime()
      }
      
    });

    res.json(result);
    console.log(result)
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database query failed" });
  }
});
  


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

