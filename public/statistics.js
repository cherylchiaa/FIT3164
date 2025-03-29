let locations = [];

fetch('all-suburbs.json')
  .then(res => res.json())
  .then(data => {
    locations = data;
    console.log("✅ Place data loaded.");
  })
  .catch(err => console.error("❌ Failed to load all-suburbs.json:", err));

function showSuggestions() {
  const input = document.getElementById("search-bar").value.toLowerCase();
  const suggestionList = document.getElementById("suggestion-list");

  suggestionList.innerHTML = '';

  // Filter matches
  const matches = input
    ? locations.filter(loc =>
        (loc.suburb || loc.state).toLowerCase().startsWith(input)
      ).slice(0, 5)
    : locations.slice(0, 8);

  matches.forEach(loc => {
    const name = loc.suburb || loc.state;
    const li = document.createElement("li");
    li.textContent = name;

    li.onclick = async () => {
      document.getElementById("search-bar").value = name;
      suggestionList.style.display = 'none';
      const selectedDate = document.getElementById("date").value;
      console.log(`✅ User selected: ${name}`);
    
      fetchWeatherForSelectedPlace(loc.suburb,selectedDate)
    };

    suggestionList.appendChild(li);
  });

  suggestionList.style.display = matches.length ? 'block' : 'none';
}

async function fetchWeatherForSelectedPlace(place,date) {

    if (!place || !date) {
      console.log("⚠️ Please select both a place and a date.");
      return;
    }
  
    // Step 1: Get coordinates for the place
    const coords = await getCoordinatesFromPlaceName(place);
    if (!coords) return;
  
    // Step 2: Get nearest station using coordinates
    const station = await getNearestWeatherStation(coords.lat, coords.lng);
    console.log(station)
    if (!station) {
      console.log("⚠️ No nearby weather station found.");
      return;
    }
    // Step 3: Fetch weather data from your backend using station and date
    fetch(`/weather?station=${encodeURIComponent(station.name.en)}&date=${date}`)
    .then(res => res.json())
    .then(data => {
        if (!data.length) {
        console.log(`⚠️ No weather data found for station ${station.name} on ${date}`);
        return;
        }

        const weather = data[0];
        console.log(`✅ Weather for station ${station.name} on ${date}:`, weather);
        updateWeatherInfo(weather)
    })
    .catch(err => console.error("❌ Fetch error:", err));
   
  }
  
  async function getCoordinatesFromPlaceName(placeName) {
    const apiKey = '2cfb196deeba4a0780fcfb468ca5bfc8'; 
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(placeName)}&key=${apiKey}`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();

          if (data.results.length > 0) {
            const result = data.results.find(r =>
                r.components &&
                r.components.suburb &&
                r.components.suburb.toLowerCase() === placeName.toLowerCase()
              );
        const { lat, lng } = result.geometry;
        console.log(lat,lng)
        return { lat, lng };
      } else {
        console.warn("No coordinates found for", placeName);
        return null;
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  }

  async function getNearestWeatherStation(lat, lon) {
    const apiKey = 'b0b28c687emshb3573bfc282d14cp12ee6djsn3c6a84518f23'; 
    const url = `https://meteostat.p.rapidapi.com/stations/nearby?lat=${lat}&lon=${lon}&limit=1`;
  
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
        }
      });
  
      const data = await response.json();
      if (data.data.length > 0) {
        return data.data[0]; 
      } else {
        console.log("No nearby station found");
        return null;
      }
    } catch (error) {
      console.error("Meteostat API error:", error);
      return null;
    }
  }
    
  document.addEventListener("DOMContentLoaded", () => {
    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.addEventListener("input", showSuggestions);
      searchBar.addEventListener("focus", showSuggestions);
    }
  });
  document.getElementById("date").addEventListener("change", () => {
    const selectedPlace = document.getElementById("search-bar").value;
    const selectedDate = document.getElementById("date").value;
  
    if (selectedPlace && selectedDate) {
      fetchWeatherForSelectedPlace(selectedPlace, selectedDate);
    }
  });
  

function updateWeatherInfo(weather) {
    document.getElementById("avg-temperature").textContent =
      weather.tavg !== undefined ? `${weather.tavg}°C` : "N/A";

    document.getElementById("min-temperature").textContent =
      weather.tmin !== undefined ? `${weather.tmin}°C` : "N/A";

    document.getElementById("max-temperature").textContent =
      weather.tmax !== undefined ? `${weather.tmax}°C` : "N/A";
  
    document.getElementById("windSpeed").textContent =
      weather.wspd !== undefined ? `${weather.wspd} kph` : "N/A";
  
    document.getElementById("prcp").textContent =
      weather.prcp !== undefined ? `${weather.prcp} mm` : "N/A";

  }
  