const betForm = document.getElementById("bet-form");
const analyzeButton = document.getElementById("analyze-button");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const resultsSection = document.getElementById("results-section");

let performanceChart = null;

betForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loadingMessage.classList.remove("hidden");
    errorMessage.classList.add("hidden");
    resultsSection.classList.add("hidden");
    analyzeButton.disabled = true;
    analyzeButton.textContent = "Analyzing...";

    const requestData = {
        player: document.getElementById("player").value.trim(),
        stat: document.getElementById("stat").value,
        direction: document.getElementById("direction").value,
        line: Number(document.getElementById("line").value),
        odds: Number(document.getElementById("odds").value),
        stake: Number(document.getElementById("stake").value)
    };

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "The analysis could not be completed.");
        }

        displayResults(data);
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.remove("hidden");
    } finally {
        loadingMessage.classList.add("hidden");
        analyzeButton.disabled = false;
        analyzeButton.textContent = "Analyze Bet";
    }
});

function displayResults(data) {
    const statistics = data.statistics;
    const analysis = data.analysis;

    document.getElementById("result-player").textContent = data.player;
    document.getElementById("result-prop").textContent =
        `Prop analyzed: ${data.prop_analyzed}`;

    document.getElementById("season-average").textContent =
        statistics.seasonAverage;

    document.getElementById("median").textContent =
        statistics.median;

    document.getElementById("last-five-average").textContent =
        statistics.lastFiveAverage;

    document.getElementById("last-ten-average").textContent =
        statistics.lastTenAverage;

    document.getElementById("hit-rate").textContent =
        `${statistics.hitRate}%`;

    document.getElementById("expected-value").textContent =
        analysis.expected_value;

    const recommendation = analysis.is_profitable_bet
        ? `Potential value found: ${analysis.prediction} with a ${analysis.win_probability} estimated win probability.`
        : `This bet may be risky: ${analysis.prediction} with a ${analysis.win_probability} estimated win probability.`;

    document.getElementById("prediction").textContent = recommendation;
    document.getElementById("reasoning").textContent = analysis.reasoning;

    createPerformanceChart(
        statistics.trendData,
        statistics.line
    );

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function createPerformanceChart(trendData, bettingLine) {
    const chartCanvas = document.getElementById("performance-chart");

    if (performanceChart) {
        performanceChart.destroy();
    }

    const labels = trendData.map((game) => {
        const date = new Date(game.date);

        return date.toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric"
        });
    });

    const performanceValues = trendData.map((game) => game.value);
    const bettingLineValues = trendData.map(() => bettingLine);

    performanceChart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Player Performance",
                    data: performanceValues,
                    borderWidth: 3,
                    tension: 0.25
                },
                {
                    label: "Betting Line",
                    data: bettingLineValues,
                    borderWidth: 2,
                    borderDash: [6, 6],
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: "#f8fafc"
                    }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function (context) {
                            const game = trendData[context.dataIndex];

                            if (!game || context.datasetIndex !== 0) {
                                return "";
                            }

                            return `Opponent: ${game.opponent}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#a8b2c7"
                    },
                    grid: {
                        color: "rgba(168, 178, 199, 0.12)"
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#a8b2c7"
                    },
                    grid: {
                        color: "rgba(168, 178, 199, 0.12)"
                    }
                }
            }
        }
    });
}