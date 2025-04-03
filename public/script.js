// Initialize Map (Centered on Australia)
var map = L.map('map').setView([-28.2744, 133.7751], 5);

// Add Google Satellite Tile Layer
L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
    attribution: '©️ Google Maps'
}).addTo(map);

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
                            className: 'state-tooltip'
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
  
  async function handleStateSearchSelection(stateName) {
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

      await handleStateSearchSelection(loc.state);

    
    const coords = await getCoordinatesFromPlaceName(loc.suburb);
      if (!coords) {
        console.warn("⚠️ Could not retrieve coordinates.");
        return;
      }
      await fetchWeatherData(coords.lat, coords.lng, selectedDate);
    };

    suggestionList.appendChild(li);
  });

  suggestionList.style.display = matches.length ? 'block' : 'none';
}

document.getElementById("date").addEventListener("change", async () => {
    const selectedPlace = document.getElementById("search-bar").value;
    const selectedDate = document.getElementById("date").value;
  
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
