const express = require("express")
const router = express.Router()

const Score = require("../models/Score")

router.post("/", async (req, res) => {
  const newScore = new Score(req.body)
  await newScore.save()
  res.json(newScore)
})

router.get("/", async (req, res) => {
  const scores = await Score.find().sort({ score: -1 })
  res.json(scores)
})

module.exports = router