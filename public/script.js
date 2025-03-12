// Initialize Map (Centered on Australia)
var map = L.map('map').setView([-25.2744, 133.7751], 5.5);

// Add Tile Layer (Google-style Satellite View)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Define state boundaries (bounding boxes)
const states = [
    { name: "New South Wales", minLat: -37.5, maxLat: -28.0, minLng: 140.8, maxLng: 153.7 },
    { name: "Victoria", minLat: -39.2, maxLat: -34.0, minLng: 140.9, maxLng: 150.0 },
    { name: "Queensland", minLat: -29.0, maxLat: -10.7, minLng: 138.0, maxLng: 153.6 },
    { name: "Western Australia", minLat: -35.0, maxLat: -13.6, minLng: 112.9, maxLng: 129.0 },
    { name: "South Australia", minLat: -38.0, maxLat: -25.5, minLng: 129.0, maxLng: 141.0 },
    { name: "Tasmania", minLat: -43.7, maxLat: -39.4, minLng: 144.6, maxLng: 148.5 },
    { name: "Northern Territory", minLat: -26.0, maxLat: -10.9, minLng: 129.0, maxLng: 138.0 },
    { name: "Australian Capital Territory (ACT)", minLat: -35.92, maxLat: -35.13, minLng: 148.76, maxLng: 149.4 }
];

// Function to check if a click is inside a state
function getClickedState(lat, lng) {
    for (let state of states) {
        if (lat >= state.minLat && lat <= state.maxLat && lng >= state.minLng && lng <= state.maxLng) {
            return state.name; // Return state name if inside
        }
    }
    return null; // Return null if outside all states
}

// Handle click event on map
map.on('click', function(event) {
    var lat = event.latlng.lat;
    var lng = event.latlng.lng;

    var stateName = getClickedState(lat, lng);

    if (stateName) {
        L.popup()
            .setLatLng([lat, lng])
            .setContent(`You clicked in <strong>${stateName}</strong>`)
            .openOn(map);
    } else {
        alert("You clicked outside Australian states!");
    }
});
