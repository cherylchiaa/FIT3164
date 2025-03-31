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
    const url = `/api/geocode?place=${encodeURIComponent(placeName)}`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(placeName)
    console.log(data)
      if (data.results.length > 0) {
        const result = data.results.find(r =>
            (r.components.suburb && r.components.suburb.toLowerCase() === placeName.toLowerCase()) ||
            (r.components.city && r.components.city.toLowerCase() === placeName.toLowerCase()) ||
            (r.components.town && r.components.town.toLowerCase() === placeName.toLowerCase()) ||
            (r.components.municipality && r.components.municipality.toLowerCase() === placeName.toLowerCase())
          );

        if (!result) return null;
  
        const { lat, lng } = result.geometry;
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
    try {
      const response = await fetch(`/api/station?lat=${lat}&lon=${lon}`);
      const data = await response.json();
  
      if (response.ok) {
        console.log("📡 Nearest station:", data);
        return data;
      } else {
        console.warn("⚠️ No nearby station found");
        return null;
      }
    } catch (err) {
      console.error("❌ Station fetch error:", err);
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