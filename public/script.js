// Initialize Map (Centered on Australia)
var map = L.map('map').setView([-25.2744, 133.7751], 5.5);

// Add Google Satellite Tile Layer
L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
    attribution: '© Google Maps'
}).addTo(map);

// Default state border style
const stateBorderStyle = {
    color: "#ff0000", // Red border for states
    weight: 2,
    fillColor: "transparent",
    fillOpacity: 0
};

// Style on hover
const highlightStyle = {
    color: '#000',
    weight: 2,
    fillColor: '#ff7800',
    fillOpacity: 0.5
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

function loadAllStateBorders(excludeState = null) {
    allStatesLayer.clearLayers(); // Clear existing state borders

    Object.entries(stateGeoJSONUrls).forEach(([stateName, url]) => {
        // Skip the excluded state
        if (stateName === excludeState) return;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: stateBorderStyle,
                    onEachFeature: function (feature, layer) {
                        layer.on({
                            mouseover: highlightFeature,
                            mouseout: resetHighlight,
                            click: function (e) {
                                handleStateClick(e, feature, layer, stateName);
                            }
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
                            color: "#000000", // Default suburb border color
                            weight: 1,
                            fillOpacity: 0
                        },
                        onEachFeature: function (feature, layer) {
                            const suburbName = feature.properties.SAL_NAME21 || "Unknown Suburb";

                            // Show suburb name when hovered
                            layer.on("mouseover", function (e) {
                                layer.setStyle({
                                    color: "#0000ff", // Highlight border on hover
                                    weight: 2,
                                    fillColor: "#00ff00",
                                    fillOpacity: 0.7
                                });
                            });

                            // Reset to normal style when mouse leaves
                            layer.on("mouseout", function () {
                                layer.setStyle({
                                    color: "#000000", // Default suburb border
                                    weight: 1,
                                    fillOpacity: 0
                                });
                            });

                            // Click event to display suburb name
                            layer.on("click", async function (e) {
                                const latlng = e.latlng;
                                console.log(`📍 Clicked on: ${suburbName}`);
                                console.log(`🌍 Coordinates: Latitude: ${latlng.lat}, Longitude: ${latlng.lng}`);
                            
                                // Fetch weather data from the nearest available station
                                const weatherData = await fetchWeatherData(latlng.lat, latlng.lng, "2024-01-01");
                            
                                let popupContent = `<strong>${suburbName}</strong><br>Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
                            
                                if (weatherData) {
                                    popupContent += `
                                        <hr>
                                        <strong>Nearest Station with Data:</strong> ${weatherData.stationName} (${weatherData.stationId})<br>
                                        <strong>Temperature:</strong> ${weatherData.tavg ?? "N/A"}°C<br>
                                        <strong>Min Temp:</strong> ${weatherData.tmin ?? "N/A"}°C<br>
                                        <strong>Max Temp:</strong> ${weatherData.tmax ?? "N/A"}°C<br>
                                        <strong>Precipitation:</strong> ${weatherData.prcp ?? "N/A"} mm
                                    `;
                                } else {
                                    popupContent += `<br><br>⚠ No weather data available at any nearby stations.`;
                                }
                            
                                L.popup()
                                    .setLatLng(latlng)
                                    .setContent(popupContent)
                                    .openOn(map);
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
loadAllStateBorders();

async function fetchWeatherData(latitude, longitude, date) {
    try {
      const response = await fetch(`/api/meteostat?lat=${latitude}&lon=${longitude}&date=${date}`);
      const data = await response.json();
  
      if (data && data.stationId) {
        console.log(`✅ Found weather data at ${data.stationName.en || data.stationName} (${data.stationId}):`, data);
        return data;
      } else {
        console.log("❌ No weather data found for any nearby stations.");
        return null;
      }
    } catch (err) {
      console.error("❌ Error fetching weather data:", err);
      return null;
    }
  }