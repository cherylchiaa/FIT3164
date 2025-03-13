// Initialize Map (Centered on Australia)
var map = L.map('map').setView([-25.2744, 133.7751], 5.5);

// Add Google Satellite Tile Layer
L.tileLayer('https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
    attribution: '©️ Google Maps'
}).addTo(map);

// Default transparent style (invisible)
const invisibleStyle = {
    color: 'transparent',
    weight: 0,
    fillColor: 'transparent',
    fillOpacity: 0
};

// Style on hover
const highlightStyle = {
    color: '#000',
    weight: 2,
    fillColor: '#ff7800',
    fillOpacity: 0.5
};

// Style on click
const clickedStyle = {
    color: 'blue',
    weight: 3,
    fillColor: 'lightblue',
    fillOpacity: 0.6
};

// Variable to track the last clicked layer
let clickedLayer = null;

// Handle mouseover (show highlight)
function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle(highlightStyle);
    layer.bringToFront();
}

// Handle mouseout (reset if not clicked)
function resetHighlight(e) {
    var layer = e.target;
    if (layer !== clickedLayer) {
        layer.setStyle(invisibleStyle);
    }
}

// Handle click (permanent highlight)
function handleClick(e, feature, layer) {
    // Reset previously clicked layer
    if (clickedLayer && clickedLayer !== layer) {
        clickedLayer.setStyle(invisibleStyle);
    }

    // Set new clicked layer
    clickedLayer = layer;

    // Apply clicked style
    layer.setStyle(clickedStyle);

    // Popup showing name (fallback if name not defined)
    const stateName = feature.properties.name || feature.properties.SAL_NAME21 || "Unknown area";
    L.popup()
        .setLatLng(e.latlng)
        .setContent(`You clicked on <strong>${stateName}</strong>`)
        .openOn(map);
}

// Function to attach interactivity
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: function (e) {
            handleClick(e, feature, layer);
        }
    });
}

// List of GeoJSON files
const geojsonFiles = [
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/NSW1.json",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/NSW2.json",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/NSW3.json",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/ACT.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/north.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/west.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/other.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/outside.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/queensland.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/victoria.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/south.geojson",
    "https://raw.githubusercontent.com/cherylchiaa/FIT3164/refs/heads/main/tasmania.geojson"
    // Add others as needed...
];

// Load each GeoJSON and apply interactivity
async function loadGeoJSONFiles() {
    for (let i = 0; i < geojsonFiles.length; i++) {
        try {
            const response = await fetch(geojsonFiles[i]);
            const data = await response.json();

            // Add GeoJSON with invisible default style and interactivity
            L.geoJSON(data, {
                style: invisibleStyle,
                onEachFeature: onEachFeature
            }).addTo(map);
        } catch (err) {
            console.error(`Error loading ${geojsonFiles[i]}:`, err);
        }
    }
}

// Call function to load all files
loadGeoJSONFiles();
