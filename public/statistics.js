let locations = [];

fetch('all-suburbs-with-coords.json')
  .then(res => res.json())
  .then(data => {
    locations = data;
    console.log("✅ Place data loaded.");
  })
  .catch(err => console.error("❌ Failed to load all-suburbs.json:", err));

  let stations = [];

  fetch('all-stations.json')
    .then(res => res.json())
    .then(data => {
      stations = data;
      console.log("✅ All stations loaded");
    });
  

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


function showHomeLocationSuggestions() {
  const input = document.getElementById("homeLocation").value.toLowerCase();
  const suggestionList = document.getElementById("home-suggestions");

  suggestionList.innerHTML = '';

  const matches = input
    ? locations.filter(loc =>
        (loc.suburb || loc.state).toLowerCase().startsWith(input)
      ).slice(0, 5)
    : locations.slice(0, 8);

  matches.forEach(loc => {
    const name = loc.suburb || loc.state;
    const li = document.createElement("li");
    li.textContent = name;

    li.onclick = () => {
      document.getElementById("homeLocation").value = name;
      suggestionList.style.display = 'none';
      console.log(`✅ Home location selected: ${name}`);
      // Optional: trigger any other logic for selected home location
    };

    suggestionList.appendChild(li);
  });

  suggestionList.style.display = matches.length ? 'block' : 'none';
}



async function fetchWeatherForSelectedPlace(place, date) {
    if (!place || !date) {
      console.log("⚠️ Please select both a place and a date.");
      return;
    }
  
    showLoading(); // Show loading spinner
  
    try {
      document.getElementById("location-label").textContent = place;
      // document.getElementById("location-display").textContent = place;
      console.log(place)
      // Step 1: Get coordinates for the place
      const coords = await getCoordinatesFromPlaceName(place);
      if (!coords) return;
  
      // Step 2: Get nearest station using coordinates
      const station = await getNearestWeatherStation(coords.lat, coords.lng, date);
      console.log(station);
      if (!station) {
        console.log("⚠️ No nearby weather station found.");
        return
      }
      let weather_data = -1
      // Step 3: Fetch weather data from your backend using station and date
      const res = await fetch(`/weather?station=${encodeURIComponent(station.name.en)}&date=${date}`);
      const data = await res.json();
  
      if (!data.length) {
        console.log(`⚠️ No weather data found for station ${station.name} on ${date}`);
        const nearest = findNearestStations(coords.lat, coords.lng, stations, 5);
        console.log(nearest)
        for (const station of nearest) {
            const fallbackRes = await fetch(`/weather?station=${encodeURIComponent(station.name)}&date=${date}`);
            const fallbackData = await fallbackRes.json();
          
            // If it's an array, check first item
            const record = Array.isArray(fallbackData) ? fallbackData[0] : fallbackData;
          
            console.log(station.name, record);
          
            if (record && record.tavg != null) {
              console.log(`🪂 Fallback: Found data from ${station.name}`);
              weather_data = record
              break
            }
        }
        if (weather_data == -1){
          console.log("❌ No fallback weather data found either.");
        return null;
        }
      }
  
      const weather = data[0];
      if (weather_data == -1) {
        weather_data = weather
      }
      console.log(`✅ Weather for station ${station.name} on ${date}:`, weather_data);
      updateWeatherInfo(weather_data);
      updateSeasonDisplay(date);
      await fetchAllCharts(coords.lat, coords.lng, date, getSelectedDataWindow());
  
    } catch (err) {
      console.error("❌ Fetch error:", err);
    } finally {
      hideLoading(); // Always hide the spinner
    }
  }
  function findNearestStations(lat, lon, stations, N = 5) {
    return stations
      .map(station => ({
        ...station,
        distance: getDistanceInKm(lat, lon, station.latitude, station.longitude)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, N);
  }

  function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  async function getCoordinatesFromPlaceName(placeName) {
    // Mapping of state abbreviations to full names
    const stateMap = {
      'NSW': 'New South Wales',
      'VIC': 'Victoria',
      'QLD': 'Queensland',
      'SA': 'South Australia',
      'WA': 'Western Australia',
      'TAS': 'Tasmania',
      'NT': 'Northern Territory',
      'ACT': 'Australian Capital Territory'
    };
  
    // Extract suburb and state abbreviation from format: "Llanarth (Qld)"
    const match = placeName.match(/^(.+?)\s*\((.+?)\)$/i);
    let suburb, stateFull = "";
  
    if (match) {
      suburb = match[1].trim();
      const stateAbbr = match[2].trim().toUpperCase();
      stateFull = stateMap[stateAbbr] || "";
    } else {
      suburb = placeName.trim();
    }
    console.log(suburb,stateFull)
    // Construct the full place string to query
    const query = `${suburb}${stateFull ? ", " + stateFull : ""}, Australia`;
    const url = `/api/geocode?place=${encodeURIComponent(query)}`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();
  
      if (data.results.length > 0) {
        const result = data.results.find(r =>
          r.components.country_code === 'au' &&
          (
            (r.components.suburb && r.components.suburb.toLowerCase() === suburb.toLowerCase()) ||
            (r.components.city && r.components.city.toLowerCase() === suburb.toLowerCase()) ||
            (r.components.town && r.components.town.toLowerCase() === suburb.toLowerCase())
          )
        );
  
        if (!result) {
          console.warn("⚠️ No exact suburb match found within Australia.");
          return null;
        }
  
        const { lat, lng } = result.geometry;
        console.log(`✅ Found: ${suburb}, ${stateFull} ➝`, lat, lng);
        return { lat, lng };
      } else {
        console.warn("❌ No geocoding results.");
        return null;
      }
    } catch (err) {
      console.error("❌ Geocoding error:", err);
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
    const username = localStorage.getItem("username");
    const homeLocation = localStorage.getItem("homeLocation");
    if (username) {
      document.getElementById("username-placeholder").textContent = username;
    }
    if(homeLocation == "None"){
      document.getElementById("location-display").textContent = "--";
    }
    else{
      document.getElementById("location-display").textContent = homeLocation;
    }

  });
  
  
  document.addEventListener("DOMContentLoaded", () => {
    const searchBar = document.getElementById("search-bar");
    if (searchBar) {
      searchBar.addEventListener("input", showSuggestions);
      searchBar.addEventListener("focus", showSuggestions);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    defaultLocation = localStorage.getItem("homeLocation");

    if (defaultLocation == "None") {
      defaultLocation = "Melbourne"
    }

    const defaultDate = "2023-12-31";
    console.log(defaultLocation)
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

  if (dataWindow === "this-week") {
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toLocaleDateString('en-CA'),
      end: sunday.toLocaleDateString('en-CA')
    };
  }

  if (dataWindow === "last-month") {
    let newMonth = month === 0 ? 11 : month - 1;
    let newYear = month === 0 ? year - 1 : year;
  
    const start = new Date(newYear, newMonth, 1);
    const end = new Date(newYear, newMonth + 1, 0); // last day of last month
  
    return {
      start: start.toLocaleDateString('en-CA'),
      end: end.toLocaleDateString('en-CA')
    };
  }
  

  return null;
}

async function fetchAllCharts(lat, lon, selectedDate, dataWindow) {
    // Current month
    const { start, end } = getStartEndFromDate(selectedDate, dataWindow);
    if (!start || !end) return;
  
    // Fetch current month data
    let res = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${start}&end=${end}`);
    let json = await res.json();
  
    const labels = [];
    const minTemps = [];
    const maxTemps = [];
    const rainfallValues = [];
    const windSpeeds = [];
    
    let avgtemp = 0;
    let maxTemp = -999;
    let totalRain = 0;
    let count = 0;
    json.data.forEach(day => {
      count += 1 
      if (!day) return;
    
      const dateStr = day.date || day.time;
      const date = new Date(dateStr);
      const label = date.toLocaleDateString("en-AU", { day: 'numeric', month: 'short', year: 'numeric' });
  
      labels.push(label);
      minTemps.push(day.tmin ?? null);
      maxTemps.push(day.tmax ?? null);
      rainfallValues.push(day.prcp ?? null);
      windSpeeds.push(day.wspd ?? null);

    });
  
    renderTempChart(labels, minTemps, maxTemps);
    renderRainChart(labels, rainfallValues);
    renderWindChart(labels, windSpeeds);
  
    // Last month data for rain comparison
    const { start: laststart, end: lastend } = getStartEndFromDate(selectedDate, "last-month");
    let lastrain = 0;
    let lasttemp = 0;
    let lastcount = 0; 
    if (laststart && lastend) {
      const lastRes = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${laststart}&end=${lastend}`);
      const lastJson = await lastRes.json();
    
      lastJson.data.forEach(day => {
        lastcount += 1 
        if (day?.prcp != null) lastrain += day.prcp;
        if (day?.tavg != null) lasttemp += day.tavg;
        
      });
    }
    
    const { start: thisstart, end: thisend } = getStartEndFromDate(selectedDate, "current-month");
    let thisrain = 0;
    let thistemp = 0;
    let thiscount = 0; 
    if (thisstart && thisend) {
      const thisRes = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${thisstart}&end=${thisend}`);
      const thisJson = await thisRes.json();

      thisJson.data.forEach(day => {
        thiscount += 1 
        if (day?.prcp != null) thisrain += day.prcp;
        if (day?.tavg != null) thistemp += day.tavg;
        if (day.tmax != null && day.tmax > maxTemp) maxTemp = day.tmax;
        if (day.prcp != null) totalRain += day.prcp;

      });
    }
    const currentavgtemp = thistemp / thiscount
    const lastavgtemp = lasttemp / lastcount
    const tempdiff = currentavgtemp - lastavgtemp
    const rainDiff = thisrain - lastrain;
  
    // This week data
    const { start: weekStart, end: weekEnd } = getStartEndFromDate(selectedDate, "this-week");
    let weekWindMax = -999;
    let weekMinTemp = 999;
  
    if (weekStart && weekEnd) {
      const weekRes = await fetch(`/api/chart?lat=${lat}&lon=${lon}&start=${weekStart}&end=${weekEnd}`);
      const weekJson = await weekRes.json();
  
      weekJson.data.forEach(day => {
        if (!day) return;
        if (day.wspd != null && day.wspd > weekWindMax) weekWindMax = day.wspd;
        if (day.tmin != null && day.tmin < weekMinTemp) weekMinTemp = day.tmin;
      });
    }
  
    // Set text content
    document.getElementById("monthMaxTemp").textContent =
      maxTemp !== undefined ? `${maxTemp}°C` : "N/A";
  
    document.getElementById("monthRain").textContent =
      totalRain !== undefined ? `${totalRain.toFixed(1)}mm` : "N/A";
  
    document.getElementById("monthRainCompare").textContent =
      rainDiff !== undefined ? `${rainDiff >= 0 ? '+' : ''}${rainDiff.toFixed(1)}mm` : "N/A";

      document.getElementById("monthavgtemp").textContent =
      tempdiff !== undefined ? `${tempdiff >= 0 ? '+' : ''}${tempdiff.toFixed(2)}°C` : "N/A";
  
    document.getElementById("weekWind").textContent =
      weekWindMax !== undefined ? `${weekWindMax}km/h` : "N/A";
  
    document.getElementById("weekMinTemp").textContent =
      weekMinTemp !== undefined ? `${weekMinTemp}°C` : "N/A";
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

function showLoading() {
    document.getElementById("loading-overlay").style.display = "block";
  }
  
  function hideLoading() {
    document.getElementById("loading-overlay").style.display = "none";
  }

  let modalChartInstance;

  function zoomChart(originalChartId) {
    const originalCanvas = document.getElementById(originalChartId);
    if (!originalCanvas) return;
  
    const modal = document.getElementById("chartModal");
    const modalCanvas = document.getElementById("modalChartCanvas");
  
    // Destroy previous chart in modal if exists
    if (modalChartInstance) {
      modalChartInstance.destroy();
    }
  
    // Clone original chart config
    const originalChart = Chart.getChart(originalCanvas);
    if (!originalChart) return;
  
    const chartConfig = {
      type: originalChart.config.type,
      data: JSON.parse(JSON.stringify(originalChart.config.data)),
      options: Object.assign({}, originalChart.config.options)
    };

    const titleMap = {
      temperatureChart: "Min and Max Temperature",
      rainfallChart: "Average Rainfall",
      windChart: "Average Windspeed"
    };
    const title = titleMap[originalChartId] || "Chart View";
    document.getElementById("modalChartTitle").textContent = title;
    // Show modal and draw chart
    modal.style.display = "block";
    modalChartInstance = new Chart(modalCanvas.getContext("2d"), chartConfig);
  }
  
  function closeModal() {
    const modal = document.getElementById("chartModal");
    modal.style.display = "none";
    if (modalChartInstance) {
      modalChartInstance.destroy();
      modalChartInstance = null;
    }
  }
  


