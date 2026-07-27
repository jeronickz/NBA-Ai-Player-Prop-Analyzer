const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();
const { analyzePlayerProp } = require("./dataAnalysis");

const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = 3000;

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let nbaDataset = [];

try {
    const rawData = fs.readFileSync('./nba_stats.json', 'utf8');
    nbaDataset = JSON.parse(rawData);
    console.log(`Successfully loaded ${nbaDataset.length} player records.`);
} catch (error) {
    console.log("Error: Could not load nba_stats.json. Make sure it is saved in the same folder as server.js.");
}

app.get('/api/players', (req, res) => {
    const uniquePlayers = [...new Set(nbaDataset.map(log => log.player))].sort();
    res.json(uniquePlayers);
});

app.post('/api/analyze', async (req, res) => {

    console.log("1. Request received for player:", req.body.player);

    const {
        player,
        stat,
        line,
        direction = "OVER",
        odds = -110,
        stake = 100
    } = req.body;

    if (!player || !stat || !line) {
        console.log("❌ Error: Missing required fields");
        return res.status(400).json({
            error: "Missing required fields: player, stat, or line."
        });
    }

    const betDirection = direction.toUpperCase();

    if (betDirection !== "OVER" && betDirection !== "UNDER") {
        return res.status(400).json({
            error: "Direction must be either 'OVER' or 'UNDER'."
        });
    }

    const playerLogs = nbaDataset.filter(log =>
        log.player.toLowerCase() === player.toLowerCase()
    );

    if (playerLogs.length === 0) {
        return res.status(404).json({
            error: `No stats found for ${player}`
        });
    }

    let statisticalAnalysis;

    try {

        statisticalAnalysis = analyzePlayerProp(
            playerLogs,
            stat,
            line,
            betDirection
        );

    } catch (analysisError) {

        return res.status(400).json({
            error: analysisError.message
        });

    }

    let aiPrediction;
    let aiWinProb;
    let aiReasoning;

    try {
        console.log("2. Math analysis finished! Preparing to call Gemini API...");
        const promptString = `You are an expert quantitative NBA sports betting analyst.

Evaluate this player prop bet:
Will ${player} go ${betDirection} ${line} ${stat}?
American Odds: ${odds}
Stake Amount: $${stake}

Here is the statistical analysis already calculated from the dataset:
${JSON.stringify(statisticalAnalysis, null, 2)}

Task:
1. Evaluate whether this bet is supported by the player's historical performance.
2. Calculate the bookmaker's implied win probability from the American odds (${odds}).
3. Compare the player's historical hitRate directly against that implied market probability to evaluate the Expected Value (EV).

Use the provided hitRate as the win_probability. Do not invent another probability.

Respond strictly in valid JSON format with NO markdown formatting using exactly these keys:
{
  "prediction": "${betDirection}",
  "win_probability": "${statisticalAnalysis.hitRate}%",
  "expected_value": "+$XX.XX or -$XX.XX (calculate exact EV based on stake, odds, and hitRate)",
  "is_profitable_bet": true or false (true if hitRate exceeds the implied probability),
  "reasoning": "Write exactly two to three professional sentences: first synthesize the season average and recent performance, then explicitly state whether the historical hit rate of ${statisticalAnalysis.hitRate}% occurs at a higher or lower rate than the bookmaker's implied win probability at ${odds} odds, explaining how that divergence generates positive or negative Expected Value (EV)."
}`;
        console.log("3. Sending request to Google Gemini...");
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: promptString,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        });

        console.log("4. Gemini responded successfully!");
        const responseText = response.text;

        const aiResponseData = JSON.parse(responseText);

        aiPrediction = betDirection;
aiWinProb = statisticalAnalysis.hitRate;
aiReasoning = aiResponseData.reasoning;

    } catch (aiError) {

        console.error("Gemini API Error:", aiError);

        return res.status(500).json({
            error: "AI analysis failed."
        });

    }

    let potentialProfit = 0;

    const numericOdds = Number(odds);
    const numericStake = Number(stake);

        if (numericOdds < 0) {
        potentialProfit = numericStake * (100 / Math.abs(numericOdds));
    } else {
        potentialProfit = numericStake * (numericOdds / 100);
    }

    const decimalWinProb = aiWinProb / 100;
    const decimalLossProb = 1 - decimalWinProb;

    const expectedValue = (
        (decimalWinProb * potentialProfit) -
        (decimalLossProb * numericStake)
    ).toFixed(2);

    res.status(200).json({
        success: true,
        player: player,
        prop_analyzed: `${betDirection} ${line} ${stat}`,

        statistics: statisticalAnalysis,

        analysis: {
            prediction: aiPrediction,
            win_probability: `${aiWinProb}%`,
            expected_value:
                expectedValue > 0
                    ? `+$${expectedValue}`
                    : `-$${Math.abs(expectedValue)}`,
            is_profitable_bet: expectedValue > 0,
            reasoning: aiReasoning
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});