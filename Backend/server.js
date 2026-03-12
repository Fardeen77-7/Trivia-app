const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")

const scoreRoutes = require("./routes/scoreRoutes")

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect("mongodb://localhost:27017/triviaDB")

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected")
})

app.use("/api/scores", scoreRoutes)

app.listen(5000, () => {
  console.log("Server running on port 5000")
})