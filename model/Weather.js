const mongoose = require("mongoose");

const WeatherSchema = new mongoose.Schema({
    time: { type: Number, required: true },
    tavg: { type: Number, required: true },
    tmin: { type: Number, required: true },
    tmax: { type: Number, required: true },
    prcp: { type: Number, required: true },
    wdir: { type: Number, required: true },
    wspd: { type: Number, required: true },
    wpgt: { type: Number, required: true },
    station_id: { type: String, required: true },
    station_name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
}, { collection: "Australia" });

const Weather = mongoose.model("Weather", WeatherSchema, "Australia"); // Ensure collection name is used
module.exports = Weather;
