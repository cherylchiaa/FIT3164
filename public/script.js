// Initialize Map (Centered on Australia)
var map = L.map('map').setView([-28.2744, 133.7751], 5);


window.addEventListener("DOMContentLoaded", async () => {
  const homeLocation = localStorage.getItem("homeLocation");
  if (homeLocation != "None") {
    const coords = await getCoordinatesFromPlaceName(homeLocation);
    if (coords) {
      map.setView([coords.lat, coords.lng], 9); // Adjust zoom level if needed
      console.log(`📍 Zoomed to home location: ${homeLocation}`);

      L.marker([coords.lat, coords.lng])
        .addTo(map)

      const selectedDate = document.getElementById("date").value;
                          
      // Fetch weather data from the nearest available station
      const data = await fetchWeatherData(coords.lat, coords.lng, selectedDate);
      showPopup(
          homeLocation || "Unknown Suburb",
          data.tavg,
          data.prcp,
          data.wspd
        );

    } 
    else {
      map.setView([-28.2744, 133.7751], 5)
    }
  }

  // Then load layers (move this inside the event listener if not already)
  loadChoropleth("Base");
});

// Add Google Satellite Tile Layer
let baseLayer, temperatureLayer, windspeedLayer, precipitationLayer;
let isAccessibilityMode = false;
let currentType;
baseLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
    attribution: '©️ Google Maps'
  }).addTo(map);  // Add base by default
  
  temperatureLayer = L.layerGroup();     // Will be filled by renderChoropleth()
  windspeedLayer = L.layerGroup();       // You can populate this similarly
  precipitationLayer = L.layerGroup();   // Same


  
// Default state border style
const stateBorderStyle = {
    // color: "#ff0000", 
    color: "none", 
    weight: 2,
    fillColor: "transparent",
    fillOpacity: 0
};

// Style on hover
const highlightStyle = {
    color: 'white',
    weight: 5,
    fillColor: '#000000',
    fillOpacity: 0
};

// Store state and suburb layers
let allStatesLayer = L.layerGroup().addTo(map);  // Holds all state borders
let suburbLayerGroup = L.layerGroup().addTo(map); // Holds suburbs
let currentState = null; // Currently selected state

// **INSERT YOUR STATE BORDER GEOJSON FILES HERE**
const stateGeoJSONUrls = {
    "New South Wales": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/nsw.json",
    "Victoria": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/vic.json",
    "Queensland": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/queensland.json",
    "South Australia": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/south.json",
    "Western Australia": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/west.json",
    "Tasmania": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/tasmania.json",
    "Northern Territory": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/north.json",
    "Australian Capital Territory": "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/state/act.json"
};

// **INSERT YOUR SUBURB GEOJSON FILES HERE**
const suburbGeoJSONUrls = {
    "New South Wales": [
        "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/NSW1.json",
        "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/NSW2.json",
        "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/NSW3.json"
    ],
    "Victoria": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/victoria.geojson"],
    "Queensland": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/queensland.geojson"],
    "South Australia": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/south.geojson"],
    "Western Australia": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/west.geojson"],
    "Tasmania": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/tasmania.geojson"],
    "Northern Territory": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/north.geojson"],
    "Australian Capital Territory": ["https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/suburb/ACT.geojson"]
};


// Function to highlight a state when hovered
function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle(highlightStyle);
    layer.bringToFront();
}

// Function to reset state style when mouse leaves
function resetHighlight(e) {
    if (!e || !e.target) return;
    var layer = e.target;
    layer.setStyle(stateBorderStyle);
}

// Function to handle state selection
function handleStateClick(e, feature, layer, stateName) {
    if (currentState === stateName) return;

    // Clear previous suburb layers
    suburbLayerGroup.clearLayers();

    // Show all state borders again (reset view)
    loadAllStateBorders(stateName);

    // Set new state and zoom
    currentState = stateName;
    map.fitBounds(layer.getBounds());

    // Load suburbs for the selected state
    loadSuburbsForState(stateName);

    resetHighlight()
}

function setTooltipFontSize(size) {
  // Remove existing custom tooltip style if any
  const existingStyle = document.getElementById("custom-tooltip-style");
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create a new style block with updated font size
  const style = document.createElement('style');
  style.id = "custom-tooltip-style"; // So it can be found and replaced
  style.textContent = `
    .leaflet-tooltip.custom-tooltip {
      font-size: ${size};
    }
  `;
  document.head.appendChild(style);
}

let tooltipFontSize = '12px'; // default
let isFontZoomed = false;     // tracks toggle state

function toggleFontZoom() {
  isFontZoomed = !isFontZoomed;
  tooltipFontSize = isFontZoomed ? '22px' : '12px';

  // Update tooltip font size via helper
  setTooltipFontSize(tooltipFontSize);

  // Toggle active class
  const toggleZoom = document.getElementById("fontZoom");
  if (toggleZoom) {
    toggleZoom.classList.toggle("active", isFontZoomed);
  }
}


function loadAllStateBorders(excludeState = null) {
    allStatesLayer.clearLayers(); // Clear existing state borders

    Object.entries(stateGeoJSONUrls).forEach(([stateName, url]) => {
        if (stateName === excludeState) return;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: stateBorderStyle,
                    onEachFeature: function (feature, layer) {
                        // Calculate the center of the polygon
                        const center = layer.getBounds().getCenter();

                        // Bind a tooltip at the center
                        const tooltip = L.tooltip({
                            permanent: false,
                            direction: 'center',
                            className: 'custom-tooltip'
                        })
                        .setContent(stateName)
                        .setLatLng(center);

                        // Add tooltip manually to the map (not attached to the layer)
                        layer.on("mouseover", function () {
                            highlightFeature({ target: layer });
                            map.openTooltip(tooltip);
                        });

                        layer.on("mouseout", function () {
                            resetHighlight({ target: layer });
                            map.closeTooltip(tooltip);
                        });

                        layer.on("click", function (e) {
                            handleStateClick(e, feature, layer, stateName);
                        });
                    }
                }).addTo(allStatesLayer);
            })
            .catch(error => console.error(`Error loading state border for ${stateName}:`, error));
    });
}



// Function to load suburbs when a state is selected
function loadSuburbsForState(stateName) {
    if (suburbGeoJSONUrls[stateName]) {
        suburbGeoJSONUrls[stateName].forEach(url => {
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    L.geoJSON(data, {
                        style: {
                            color: "transparent", 
                            weight: 1,
                            fillOpacity: 0
                        },
                        onEachFeature: function (feature, layer) {
                            const suburbName = feature.properties.SAL_NAME21 || "Unknown Suburb";

                            // Show suburb name when hovered
                            layer.on("mouseover", function (e) {
                                layer.setStyle({
                                    color: "white", // Highlight border on hover
                                    weight: 3,
                                    fillColor: "transparent",
                                    fillOpacity: 0.7
                                });

                            // Bind and show the tooltip with the suburb name
                            layer.bindTooltip(suburbName, {
                                permanent: false,  // Tooltip only shows when hovered
                                direction: 'top',  // Position the tooltip above the area
                                opacity: 0.8,      // Tooltip opacity
                                className: 'custom-tooltip' // Optional: Custom class for styling the tooltip
                            }).openTooltip();
                        
                            });

                            // Reset to normal style when mouse leaves
                            layer.on("mouseout", function () {
                                layer.setStyle({
                                    color: "transparent", // Default suburb border
                                    weight: 1,
                                    fillOpacity: 0
                                });

                            // Close the tooltip when mouse leaves the area
                            layer.closeTooltip();

                            });

                            // Click event to display suburb name
                            layer.on("click", async function (e) {
                                const latlng = e.latlng;
                                const selectedDate = document.getElementById("date").value;
                            
                                // Fetch weather data from the nearest available station
                                const data = await fetchWeatherData(latlng.lat, latlng.lng, selectedDate);

                                showPopup(
                                    feature.properties.SAL_NAME21 || "Unknown Suburb",
                                    data.tavg,
                                    data.prcp,
                                    data.wspd
                                  );
                            });
                            
                        }
                    }).addTo(suburbLayerGroup);
                })
                .catch(error => console.error(`Error loading suburbs for ${stateName}:`, error));
        });
    } else {
        console.warn(`No suburb data available for ${stateName}`);
    }
}


// Initial load of all states
hideLegend();
loadAllStateBorders();

let stations = [];

fetch('all-stations.json')
  .then(res => res.json())
  .then(data => {
    stations = data;
    console.log("✅ All stations loaded");
  });


  async function fetchWeatherData(latitude, longitude, date) {
    try {
      const response = await fetch(`/api/meteostat?lat=${latitude}&lon=${longitude}&date=${date}`);
      const data = await response.json();
  
      if (data && data.stationId) {
        console.log(`✅ Found weather data at ${data.stationName.en || data.stationName} (${data.stationId})`, data);
        return data;
      } else {
        console.log("No weather data API.");
  
        // Fallback to local nearest stations
        const nearest = findNearestStations(latitude, longitude, stations, 5);
        console.log(nearest)
        for (const station of nearest) {
            const fallbackRes = await fetch(`/weather?station=${encodeURIComponent(station.name)}&date=${date}`);
            const fallbackData = await fallbackRes.json();
          
            // If it's an array, check first item
            const record = Array.isArray(fallbackData) ? fallbackData[0] : fallbackData;
          
            console.log(station.name, record);
          
            if (record && record.tavg != null) {
              console.log(`🪂 Fallback: Found data from ${station.name}`);
              return record;
            }
        }
        console.log("❌ No fallback weather data found either.");
        return null;
      }
    } catch (err) {
      console.error("❌ Error fetching weather data:", err);
      return null;
    }
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
  
  
  async function handleStateSearchSelection(stateName) {
    currentState = stateName
    allStatesLayer.clearLayers();
    suburbLayerGroup.clearLayers();
    loadAllStateBorders(stateName); 
    currentState = stateName;
  
    const response = await fetch(stateGeoJSONUrls[stateName]);
    const data = await response.json();
  
    const layer = L.geoJSON(data);
    map.fitBounds(layer.getBounds());
    loadSuburbsForState(stateName);
  }

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
      await handleStateSearchSelection(loc.state);
      
    
    const coords = await getCoordinatesFromPlaceName(loc.suburb);
      if (!coords) {
        console.warn("⚠️ Could not retrieve coordinates.");
        return;
      }
      const data = await fetchWeatherData(coords.lat, coords.lng, selectedDate);
      showPopup(
        name || "Unknown Suburb",
        data.tavg,
        data.prcp,
        data.wspd
      );
    };

    suggestionList.appendChild(li);
  });

  suggestionList.style.display = matches.length ? 'block' : 'none';
}

document.getElementById("date").addEventListener("change", async () => {
    const selectedPlace = document.getElementById("search-bar").value;
    const selectedDate = document.getElementById("date").value;
  
    const selectedType = document.querySelector('input[name="layer"]:checked')?.value;
    const previousLocation = document.getElementById("popup-location").textContent;
    console.log(previousLocation)
    if (previousLocation){

      const coords = await getCoordinatesFromPlaceName(previousLocation);
      if (!coords) {
        console.warn("⚠️ Could not retrieve coordinates.");
        return;
      }
      const data = await fetchWeatherData(coords.lat, coords.lng, selectedDate);
      showPopup(
        previousLocation || "Unknown Suburb",
        data.tavg,
        data.prcp,
        data.wspd
      );
    }
    currentState = null
    console.log(selectedDate,selectedType)
    if (selectedType) {
      await loadChoropleth(selectedType);
      return;
    }
  
    if (selectedPlace && selectedDate) {
      const state = getStateFromSuburb(selectedPlace);
      if (state) {
        await handleStateSearchSelection(state);
      }
  
      const coords = await getCoordinatesFromPlaceName(selectedPlace);
      if (coords) {
        await fetchWeatherData(coords.lat, coords.lng, selectedDate);
      } else {
        console.warn("⚠️ Could not find coordinates for selected place.");
      }
    }
  });
  
  
function getStateFromSuburb(suburbName) {
  const match = locations.find(
    loc => loc.suburb && loc.suburb.toLowerCase() === suburbName.toLowerCase()
  );
  return match ? match.state : null;
}


function showPopup(locationName, temp, rain, wind) {
    document.getElementById("popup-location").textContent = locationName;
    document.getElementById("popup-temp").textContent = temp !== undefined ? `${temp}°C` : "N/A";
    document.getElementById("popup-rain").textContent = rain !== undefined ? `${rain} mm` : "N/A";
    document.getElementById("popup-wind").textContent = wind !== undefined ? `${wind} kph` : "N/A";
  
    const popup = document.getElementById("info-popup");
    const toggleBtn = document.getElementById("toggle-popup-btn");
    const toggleIcon = document.getElementById("toggle-icon");
  
    popup.classList.remove("hidden");
    toggleBtn.classList.remove("hidden");
    popup.style.display = "block";
    toggleIcon.src = "icons/minimize.png";
  }
  
  function closePopup() {
    document.getElementById("info-popup").classList.add("hidden");
    document.getElementById("toggle-popup-btn").classList.add("hidden");
  }
  
  const toggleBtn = document.getElementById("toggle-popup-btn");
  const infoPopup = document.getElementById("info-popup");
  const toggleIcon = document.getElementById("toggle-icon");
  toggleBtn.addEventListener("click", () => {
    if (infoPopup.style.display === "none") {
      infoPopup.style.display = "block";
      toggleIcon.src = "icons/minimize.png";
    } else {
      infoPopup.style.display = "none";
      toggleIcon.src = "icons/maximize.png";
    }
  });

const polygonFiles = [
    'polygon1.json',
    'polygon2.json',
    'polygon3.json',
    'polygon4.json',
    'polygon5.json',
    'polygon6.json'
  ];
  

  async function loadChoropleth(type) {
      currentType = type
      map.removeLayer(temperatureLayer);
      map.removeLayer(windspeedLayer);
      map.removeLayer(precipitationLayer);
      if (choroplethLayer) map.removeLayer(choroplethLayer);
      allStatesLayer.clearLayers();
      suburbLayerGroup.clearLayers();
      currentState = null;
    if (type == "Base"){
      loadAllStateBorders()
      updateLegend(type)
    }
    else{
      showLoading()
      try {
          const selectedDate = document.getElementById("date").value;
          const response = await fetch(`/api/choropleth?date=${selectedDate}`);
          const tempData = await response.json();
          if (!Array.isArray(tempData)) {
            console.error("❌ Invalid data received:", tempData);
            alert("Failed to load choropleth data.");
            return;
          }
        
          await renderChoropleth(tempData,type)
          loadAllStateBorders()
          updateLegend(type)
      }
          catch (err) {
              console.error("⚠️ Choropleth loading error:", err);
            } finally {
              hideLoading(); // ✅ Always hide after done (or if error)
            }  
    }
  }
  
  
  let choroplethLayer;

async function renderChoropleth(tempData,type) {
    if (type == "Temperature") {
    const polygonMap = new Map(tempData.map(p => [String(p.code), p.tavg]));
    } 
    else if  (type == "Wind") {
    const polygonMap = new Map(tempData.map(p => [String(p.code), p.wspd]));
    }
    else if (type == "Rain") {
    const polygonMap = new Map(tempData.map(p => [String(p.code), p.prcp]));
    }

  const geojsons = await Promise.all(
    polygonFiles.map(file =>
      fetch(`/polygon/${file}`).then(res => res.json())
    )
  );

  // Merge all geojson features
  const combinedGeoJSON = {
    type: "FeatureCollection",
    features: geojsons.flatMap(g => g.features)
  };
  
  // Assign tavg directly on each feature
  combinedGeoJSON.features.forEach(feature => {

    
    // ✅ Check for valid geometry
    if (!feature.geometry) return;
  
    const bounds = L.geoJSON(feature).getBounds();
    const centroid = bounds.getCenter();
    const lat = centroid.lat;
    const lng = centroid.lng;
    feature.properties.lat = lat
    feature.properties.lng = lng
    const nearestStation = findNearestStations(lat, lng, tempData, 1);

    const tavg = nearestStation?.[0]?.tavg ?? null;
    feature.properties.tavg = tavg;
    const wspd = nearestStation?.[0]?.wspd ?? null;
    feature.properties.wspd = wspd;
    const prcp = nearestStation?.[0]?.prcp ?? null;
    feature.properties.prcp = prcp;
    
  });

  choroplethLayer = L.geoJSON(combinedGeoJSON, {
    style: function (feature) {
        
        if (type == "Temperature") {
            const data = feature.properties.tavg;
            return {
                fillColor: getColor(data,type),
                color: "transparent", // removes the border color
                weight: 0,             // removes the border width
                fillOpacity: 0.7
              };
            
        } 
        else if  (type == "Wind") {
            const data = feature.properties.wspd;
            return {
                fillColor: getColor(data,type),
                color: "transparent", // removes the border color
                weight: 0,             // removes the border width
                fillOpacity: 0.7
              };
            
        }
        else if (type == "Rain") {
            const data = feature.properties.prcp;
            return {
                fillColor: getColor(data,type),
                color: "transparent", // removes the border color
                weight: 0,             // removes the border width
                fillOpacity: 0.7
              };
            
        }
    } 
  }).addTo(map);
  
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
  
  // Find nearest N stations
  function findNearestStations(lat, lon, stations, N = 5) {
    return stations
      .map(station => ({
        ...station,
        distance: getDistanceInKm(lat, lon, station.latitude, station.longitude)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, N);
  }
  
  function getColor(t, type) {
    return isAccessibilityMode
      ? getColorAccessibility(t, type)
      : getColorNormal(t, type);
  }

  function getColorNormal(t, type) {
    if (type === "Temperature") {
      return t >= 40 ? '#800026' :
             t >= 35 ? '#BD0026' :
             t >= 30 ? '#E31A1C' :
             t >= 25 ? '#FC4E2A' :
             t >= 20 ? '#FD8D3C' :
             t >= 15 ? '#FEB24C' :
             t >= 10 ? '#FED976' :
             t >= 5  ? '#FFEDA0' :
             t != null ? '#ffffcc' :
             '#cccccc'; // no data
    }
  
    if (type === "Wind") {
        return t >= 50 ? '#B69FD5' :
               t >= 40 ? '#DBC2EE' :  
               t >= 30 ? '#F4DAF9' : 
               t >= 20 ? '#FEC5D8' :
               t >= 10 ? '#F9D7E2' : 
               t >= 5  ? '#FFECE9' :   
               t != null ? '#FFFFFF' :  
               '#CCCCCC';  // no data
    }
      
    // 🌧 Rainfall (light blue to deep blue)
    if (type === "Rain") {
      return t >= 100 ? '#08306b' :
             t >= 75  ? '#08519c' :
             t >= 50  ? '#2171b5' :
             t >= 25  ? '#4292c6' :
             t >= 10  ? '#6baed6' :
             t >= 5   ? '#9ecae1' :
             t >= 1   ? '#c6dbef' :
             t > 0    ? '#deebf7' :
             t === 0  ? '#f7fbff' :
             '#cccccc'; // no data
    }
  
    return '#cccccc'; // fallback
  }


  function getColorAccessibility(t, type) {
    if (type === "Temperature") {
      return t >= 40 ? '#67001f' :
             t >= 35 ? '#b2182b' :
             t >= 30 ? '#d6604d' :
             t >= 25 ? '#f4a582' :
             t >= 20 ? '#fddbc7' :
             t >= 15 ? '#e0e0e0' :
             t >= 10 ? '#d1e5f0' :
             t >= 5  ? '#92c5de' :
             t != null ? '#4393c3' :
             '#cccccc'; // no data
    }
  
    // 💨 Wind: purple to green (Viridis-like)
    if (type === "Wind") {
      return t >= 50 ? '#542788' :  // dark purple
             t >= 40 ? '#756bb1' :
             t >= 30 ? '#9e9ac8' :
             t >= 20 ? '#bcbddc' :
             t >= 10 ? '#d9f0a3' :
             t >= 5  ? '#addd8e' :
             t != null ? '#78c679' :  // light green
             '#cccccc';
    }
  
      
    // 🌧 Rainfall (light blue to deep blue)
    if (type === "Rain") {
      return t >= 100 ? '#08306b' :
             t >= 75  ? '#08519c' :
             t >= 50  ? '#2171b5' :
             t >= 25  ? '#4292c6' :
             t >= 10  ? '#6baed6' :
             t >= 5   ? '#9ecae1' :
             t >= 1   ? '#c6dbef' :
             t > 0    ? '#deebf7' :
             t === 0  ? '#f7fbff' :
             '#cccccc'; // no data
    }
  
    return '#cccccc'; // fallback
  }
  
  
  function updateLegend(type) {
    const legend = document.getElementById('legend');
  
    // Clear previous content to prevent duplicates
    legend.innerHTML = '';
    legend.style.display = 'block'; // make sure legend is visible
  
    let grades = [];
  
    if (type === "Temperature") {
      grades = [5, 10, 15, 20, 25, 30, 35, 40];
    } 
    else if (type === "Wind") {
      grades = [5, 10, 20, 30, 40, 50];
    } 
    else if (type === "Rain") {
      grades = [1, 5, 10, 25, 50, 75, 100];
    } 
    else {
      return; // invalid type
    }
  
    // Add subtitle (type and unit)
    const subtitle = document.createElement('h4');
    if (type === "Temperature") {
      subtitle.textContent = "Temperature (°C)";
    } else if (type === "Wind") {
      subtitle.textContent = "Wind Speed (km/h)";
    } else if (type === "Rain") {
      subtitle.textContent = "Rainfall (mm)";
    }
    legend.appendChild(subtitle);
  
    // Create legend items
    for (let i = 0; i < grades.length; i++) {
      const color = getColor(grades[i], type); // 🎯 dynamically get color based on value + type
      const div = document.createElement('div');
      div.innerHTML = `
        <i style="background:${color}; width:18px; height:18px; display:inline-block; margin-right:8px; border:1px solid #999;"></i> 
        ${grades[i]}${grades[i + 1] ? ' – ' + grades[i + 1] : '+'}
      `;
      legend.appendChild(div);
    }
  }
  
  
  
  function showLoading() {
    document.getElementById("loading-overlay").style.display = "block";
  }
  
  function hideLoading() {
    document.getElementById("loading-overlay").style.display = "none";
  }

  function hideLegend() {
    const legend = document.getElementById('legend');
    legend.style.display = 'none';
    legend.innerHTML = ''; // 🧹 Clear the legend content fully
  }
  

  function showLegend() {
    const legend = document.getElementById('legend');
    legend.style.display = 'block';
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const layer = params.get('layer');
  
    if (layer) {
      console.log(`Loading choropleth for: ${layer}`);
      loadChoropleth(layer);
    } else {
      console.log("No layer specified, loading default Base Map");
      loadChoropleth('Base'); // fallback if no query given
    }
  });
  
  function toggleAccessibilityMode() {
    isAccessibilityMode = !isAccessibilityMode;
    const toggleLi = document.getElementById("colorBlindToggle");
    if (toggleLi) {
      toggleLi.classList.toggle("active", isAccessibilityMode);
    }
    if (currentType) {
      // Reload the current layer using the new color scheme
      map.removeLayer(choroplethLayer);
      loadChoropleth(currentType); // you must track the active layer type
    }

  }

 