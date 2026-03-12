const mongoose = require("mongoose")

const ScoreSchema = new mongoose.Schema({
  name: String,
  score: Number
})

module.exports = mongoose.model("Score", ScoreSchema)