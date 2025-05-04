// routeserver.js
const express = require("express");     
const authRoutes = require("./routes");

module.exports = function(app) {
  app.use(express.json());              
  app.use("/api/auth", authRoutes);
};
