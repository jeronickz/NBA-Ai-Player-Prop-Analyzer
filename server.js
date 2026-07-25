const express = require('express');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config(); 

const { GoogleGenAI } = require('@google/genai'); 

const app = express();
const PORT = 3000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());

let nbaDataset = [];
try {
    const rawData = fs.readFileSync('./nba_stats.json', 'utf8');
    nbaDataset = JSON.parse(rawData);
    console.log(`Successfully loaded ${nbaDataset.length} player records.`);
} catch (error) {
    console.log("Error: Could not load nba_stats.json. Make sure it is saved in the same folder as server.js.");
}

app.post('/api/analyze', async (req, res) => {
    // 1. Extract direction with a default fallback to "OVER"
    const { player, stat, line, direction = "OVER", odds = -110, stake = 100 } = req.body;
    
    if (!player || !stat || !line) {
        return res.status(400).json({ error: "Missing required fields: player, stat, or line." });
    }

    const betDirection = direction.toUpperCase();
    if (betDirection !== "OVER" && betDirection !== "UNDER") {
        return res.status(400).json({ error: "Direction must be either 'OVER' or 'UNDER'." });
    }

    const playerLogs = nbaDataset.filter(log => 
        log.player.toLowerCase() === player.toLowerCase()
    );

    if (playerLogs.length === 0) {
        return res.status(404).json({ error: `No stats found for ${player}` });
    }

    let aiPrediction, aiWinProb, aiReasoning;

    try {
        // 2. Lock the prompt to evaluate the user's specific bet direction
        const promptString = `
            You are an expert NBA sports data analyst.
            I need you to evaluate a specific player prop bet wager: Will ${player} go ${betDirection} ${line} ${stat}?
            Here are their last ${playerLogs.length} games: ${JSON.stringify(playerLogs)}
            
            Based strictly on this data, calculate the exact percentage probability (1 to 99) that ${player} goes ${betDirection} ${line} ${stat}.
            Respond strictly in valid JSON format with NO markdown formatting, using exactly these three keys:
            "prediction": "${betDirection}",
            "win_probability": (a number between 1 and 99 representing your confidence percentage for going ${betDirection}),
            "reasoning": (Write exactly two sentences of analysis citing the numbers and averages provided).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: promptString,
            config: {
                responseMimeType: "application/json", 
                temperature: 0.2 
            }
        });

        const responseText = response.text;
        const aiResponseData = JSON.parse(responseText);
        
        aiPrediction = aiResponseData.prediction;
        aiWinProb = Number(aiResponseData.win_probability);
        aiReasoning = aiResponseData.reasoning;

    } catch (aiError) {
        console.error("Gemini API Error:", aiError);
        return res.status(500).json({ error: "AI analysis failed." });
    }

    // 3. Mathematical EV Engine (Now aligned with the correct market odds)
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
    const expectedValue = ((decimalWinProb * potentialProfit) - (decimalLossProb * numericStake)).toFixed(2);

    res.status(200).json({
        success: true,
        player: player,
        prop_analyzed: `${betDirection} ${line} ${stat}`,
        analysis: {
            prediction: aiPrediction,
            win_probability: `${aiWinProb}%`,
            expected_value: expectedValue > 0 ? `+$${expectedValue}` : `-$${Math.abs(expectedValue)}`,
            is_profitable_bet: expectedValue > 0,
            reasoning: aiReasoning
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});