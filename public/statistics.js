let locations = [];

fetch('all-suburbs-with-coords.json')
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

    document.getElementById("location-label").textContent = place;
    document.getElementById("location-display").textContent = place;
  
    // Step 1: Get coordinates for the place
    const coords = await getCoordinatesFromPlaceName(place);
    if (!coords) return;
  
    // Step 2: Get nearest station using coordinates
    const station = await getNearestWeatherStation(coords.lat, coords.lng, date);
    console.log(station)
    if (!station) {
      console.log("⚠️ No nearby weather station found.");
      return;
    }
    // Step 3: Fetch weather data from your backend using station and date
    fetch(`/weather?station=${encodeURIComponent(station.name.en)}&date=${date}`)
    .then(res => res.json())
    .then(async data => {
        if (!data.length) {
        console.log(`⚠️ No weather data found for station ${station.name} on ${date}`);
        return;
        }

        const weather = data[0];
        console.log(`✅ Weather for station ${station.name} on ${date}:`, weather);
        updateWeatherInfo(weather)
        updateSeasonDisplay(date);
        await fetchTemperatureChart(coords.lat, coords.lng, date, getSelectedDataWindow());
        await fetchRainfallChart(coords.lat, coords.lng, date, getSelectedDataWindow());
        await fetchWindChart(coords.lat, coords.lng, date, getSelectedDataWindow());
    })
    .catch(err => console.error("❌ Fetch error:", err));
   
  }
  
  async function getCoordinatesFromPlaceName(placeName) {
    const url = `/api/geocode?place=${encodeURIComponent(placeName)}`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.results.length > 0) {
        const result = data.results.find(r =>
            (r.components.suburb && r.components.suburb.toLowerCase() === placeName.toLowerCase()) ||
            (r.components.city && r.components.city.toLowerCase() === placeName.toLowerCase()) ||
            (r.components.town && r.components.town.toLowerCase() === placeName.toLowerCase()) ||
            (r.components.municipality && r.components.municipality.toLowerCase() === placeName.toLowerCase())
          );

        if (!result) return null;
  
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

  async function getNearestWeatherStation(lat, lon, date) {
    try {
      const response = await fetch(`/api/meteostat?lat=${lat}&lon=${lon}&date=${date}`);
      const data = await response.json();
  
      if (response.ok) {
        console.log("📡 Nearest station with data:", data);
        return {
          id: data.stationId,
          name: data.stationName,
          ...data
        };
      } else {
        console.warn("⚠️ No nearby station found with data");
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

  document.addEventListener("DOMContentLoaded", () => {
    const defaultLocation = "Melbourne";
    const defaultDate = "2023-12-31";
  
    // Set defaults in the input fields
    document.getElementById("search-bar").value = defaultLocation;
    document.getElementById("date").value = defaultDate;
  
    // Fetch weather and charts
    fetchWeatherForSelectedPlace(defaultLocation, defaultDate);
  });

  function getSelectedDataWindow() {
    const select = document.getElementById("statistics-options");
    return select?.value || "current-month"; 
  }  

  document.getElementById("date").addEventListener("change", () => {
    const selectedPlace = document.getElementById("search-bar").value;
    const selectedDate = document.getElementById("date").value;
  
    if (selectedPlace && selectedDate) {
      fetchWeatherForSelectedPlace(selectedPlace, selectedDate);
    }
  });

  document.getElementById("statistics-options").addEventListener("change", () => {
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

function getStartEndFromDate(selectedDate, dataWindow) {
  const date = new Date(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

  if (dataWindow === "current-month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // last day of month

    return {
      start: start.toLocaleDateString('en-CA'),
      end: end.toLocaleDateString('en-CA')
    };
  }

  if (dataWindow === "current-year") {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`
    };
  }

  if (dataWindow === "long-term") {
    const startYear = Math.max(year - 4, 2015);
    const endYear = Math.min(year, 2025);
    return {
      start: `${startYear}-01-01`, 
      end: `${endYear}-12-31`
    };
  }

  return null;
}

async function fetchTemperatureChart(lat, lon, selectedDate, dataWindow) {
  const { start, end } = getStartEndFromDate(selectedDate, dataWindow);

  if (!start || !end) return;

  const res = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${start}&end=${end}`);
  const json = await res.json();

  const labels = [];
  const minTemps = [];
  const maxTemps = [];

  json.data.forEach(day => {
    if (!day || (!day.tmin && !day.tmax)) return; // Skip if no valid data
    const dateStr = day.date || day.time;
    const date = new Date(dateStr);
    const label = date.toLocaleDateString("en-AU", { day: 'numeric', month: 'short', year: 'numeric' });
    labels.push(label);
    minTemps.push(day.tmin ?? null);
    maxTemps.push(day.tmax ?? null);
  });
 
  renderTempChart(labels, minTemps, maxTemps);
}

async function fetchRainfallChart(lat, lon, selectedDate, dataWindow) {
  const { start, end } = getStartEndFromDate(selectedDate, dataWindow);

  if (!start || !end) return;

  const res = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${start}&end=${end}`);
  const json = await res.json();

  const labels = [];
  const rainfallValues = [];

  json.data.forEach(day => {
    if (!day || (!day.tmin && !day.tmax)) return; // Skip if no valid data
    const dateStr = day.date || day.time;
    const date = new Date(dateStr);
    const label = date.toLocaleDateString("en-AU", { day: 'numeric', month: 'short', year: 'numeric' });
    labels.push(label);
    rainfallValues.push(day.prcp ?? null);
  });

  renderRainChart(labels, rainfallValues);
}

async function fetchWindChart(lat, lon, selectedDate, dataWindow) {
  const { start, end } = getStartEndFromDate(selectedDate, dataWindow);

  if (!start || !end) return;

  const res = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${start}&end=${end}`);
  const json = await res.json();

  const labels = [];
  const windSpeeds = [];

  json.data.forEach(day => {
    if (!day || (!day.tmin && !day.tmax)) return; // Skip if no valid data
    const dateStr = day.date || day.time;
    const date = new Date(dateStr);
    const label = date.toLocaleDateString("en-AU", { day: 'numeric', month: 'short', year: 'numeric' });
    labels.push(label);
    windSpeeds.push(day.wspd ?? null);
  });

  renderWindChart(labels, windSpeeds);
}

let tempChart;
function renderTempChart(labels, minTemps, maxTemps) {
  const ctx = document.getElementById("temperatureChart").getContext("2d");

  if (tempChart) {
    tempChart.destroy();
  }

  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Min Temperature',
          data: minTemps,
          borderColor: '#3b82f6',
          fill: false
        },
        {
          label: 'Max Temperature',
          data: maxTemps,
          borderColor: '#ff6b6b',
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

let rainChart;
function renderRainChart(labels, rainfallValues) {
  const ctx = document.getElementById("rainfallChart").getContext("2d");

  if (rainChart) {
    rainChart.destroy();
  }  

  rainChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Rainfall (mm)',
          data: rainfallValues,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

let windChart;
function renderWindChart(labels, windSpeeds) {
  const ctx = document.getElementById("windChart").getContext("2d");

  if (windChart) {
    windChart.destroy();
  }

  windChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Wind Speed (kph)',
          data: windSpeeds,
          fill: true,
          borderWidth: 1,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function getSeasonFromMonth(month) {
  // month is 0-indexed: 0 = Jan, 11 = Dec
  if (month >= 11 || month <= 1) return "Summer";
  if (month >= 2 && month <= 4) return "Autumn";
  if (month >= 5 && month <= 7) return "Winter";
  if (month >= 8 && month <= 10) return "Spring";
}

function updateSeasonDisplay(selectedDate) {
  const date = new Date(selectedDate);
  const month = date.getMonth();
  const season = getSeasonFromMonth(month);

  document.getElementById("season").textContent = season;
}



