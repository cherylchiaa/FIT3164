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

const polygonFiles = [
    'polygon1.json',
    'polygon2.json',
    'polygon3.json',
    'polygon4.json',
    'polygon5.json',
    'polygon6.json'
  ];
  

  async function loadChoropleth() {
    const selectedDate = document.getElementById("date").value;
    const response = await fetch(`/api/choropleth?date=${selectedDate}`);
    const tempData = await response.json();
    if (!Array.isArray(tempData)) {
      console.error("❌ Invalid data received:", tempData);
      alert("Failed to load choropleth data.");
      return;
    }
  
    renderChoropleth(tempData);
  }
  
  
  let choroplethLayer;

async function renderChoropleth(tempData) {
  if (choroplethLayer) map.removeLayer(choroplethLayer);
  const polygonMap = new Map(tempData.map(p => [String(p.code), p.tavg]));

  const geojsons = await Promise.all(
    polygonFiles.map(file =>
      fetch(`/heatmap-polygon/${file}`).then(res => res.json())
    )
  );

  // Merge all geojson features
  const combinedGeoJSON = {
    type: "FeatureCollection",
    features: geojsons.flatMap(g => g.features)
  };
  
  // Assign tavg directly on each feature
  combinedGeoJSON.features.forEach(feature => {
    const props = feature.properties;
  
    const name = props.ILO_NAME21 || props.SA2_NAME21 || props.SA3_NAME21 || props.SA4_NAME21 || "Unnamed";
    
    // ✅ Check for valid geometry
    if (!feature.geometry) return;
  
    const bounds = L.geoJSON(feature).getBounds();
    const centroid = bounds.getCenter();
    const lat = centroid.lat;
    const lng = centroid.lng;
  
    const nearestStation = findNearestStations(lat, lng, tempData, 1);
    const tavg = nearestStation?.[0]?.tavg ?? null;
  
    feature.properties.tavg = tavg;
  });

  choroplethLayer = L.geoJSON(combinedGeoJSON, {
    style: function (feature) {
        console.log(feature.properties)
        const tavg = feature.properties.tavg;
        return {
          fillColor: getColor(tavg),
          color: "transparent", // removes the border color
          weight: 0,             // removes the border width
          fillOpacity: 0.7
        };
      },      
    onEachFeature: function (feature, layer) {
      const props = feature.properties;
      const name = props.ILO_NAME21 || props.SA2_NAME21 || props.SA3_NAME21 || props.SA4_NAME21 || "Unnamed";
      const tavg = props.tavg;
  
      layer.bindPopup(`${name}<br>🌡️ Temp: ${tavg ?? "No data"}`);
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
  
  function getColor(t) {
    return t >= 40 ? '#800026' :
           t >= 35 ? '#BD0026' :
           t >= 30 ? '#E31A1C' :
           t >= 25 ? '#FC4E2A' :
           t >= 20 ? '#FD8D3C' :
           t >= 15 ? '#FEB24C' :
           t >= 10 ? '#FED976' :
           t >= 5  ? '#FFEDA0' :
           t != null ? '#ffffcc' :
           '#cccccc'; // default for no data
  }