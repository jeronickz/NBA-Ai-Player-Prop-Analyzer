const betForm = document.getElementById("bet-form");
const analyzeButton = document.getElementById("analyze-button");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const resultsSection = document.getElementById("results-section");

let performanceChart = null;
let allPlayers = [];
let currentFocus = -1; // Tracks which list item is currently highlighted by the keyboard

const selectBtn = document.getElementById("player-select-btn");
const selectMenu = document.getElementById("player-select-menu");
const searchInput = document.getElementById("player-search-input");
const optionsList = document.getElementById("player-options-list");
const selectedText = document.getElementById("selected-player-text");
const hiddenInput = document.getElementById("player");

// Fetch player list from backend on load
async function loadPlayerDropdown() {
    try {
        const response = await fetch("/api/players");
        if (!response.ok) return;
        
        allPlayers = await response.json();
        renderOptions(allPlayers.slice(0, 50));
    } catch (err) {
        console.error("Failed to load player suggestions:", err);
    }
}

// Render player items into the dropdown list
function renderOptions(playersToRender) {
    optionsList.innerHTML = "";
    currentFocus = -1; // Reset keyboard focus whenever the list re-renders

    if (playersToRender.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No players found";
        li.className = "no-results";
        optionsList.appendChild(li);
        return;
    }

    playersToRender.forEach((player) => {
        const li = document.createElement("li");
        li.textContent = player;
        
        // When clicked, lock in the player name
        li.addEventListener("click", () => {
            selectPlayer(player);
        });

        optionsList.appendChild(li);
    });
}

// Helper function to lock in a selection and close the menu
function selectPlayer(playerName) {
    selectedText.textContent = playerName;
    selectedText.classList.remove("placeholder-text");
    hiddenInput.value = playerName; // Sets hidden input for form submission
    selectMenu.classList.add("hidden");
    currentFocus = -1;
}

// Helper functions to manage visual orange highlighting
function addActive(items) {
    if (!items || items.length === 0) return;
    removeActive(items);
    
    // Wrap around top and bottom edges
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    
    items[currentFocus].classList.add("highlighted");
    
    // Automatically scroll the dropdown box so the highlighted item stays visible
    items[currentFocus].scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function removeActive(items) {
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("highlighted");
    }
}

// KEYBOARD NAVIGATION: Listen for Arrow keys, Enter, and Escape
searchInput.addEventListener("keydown", (e) => {
    const items = optionsList.getElementsByTagName("li");
    if (!items || items.length === 0 || items[0].classList.contains("no-results")) return;

    if (e.key === "ArrowDown") {
        e.preventDefault(); // Prevents cursor from moving inside the text box
        currentFocus++;
        addActive(items);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        currentFocus--;
        addActive(items);
    } else if (e.key === "Enter") {
        e.preventDefault(); // Prevents accidental form submission while typing
        if (currentFocus > -1 && items[currentFocus]) {
            // Select the item highlighted by arrow keys
            items[currentFocus].click();
        } else if (items.length > 0) {
            // Quality of life: if they just type a name and press Enter, pick the top result!
            items[0].click();
        }
    } else if (e.key === "Escape") {
        selectMenu.classList.add("hidden");
    }
});

// Open/Close dropdown when clicking the main display button
selectBtn.addEventListener("click", () => {
    selectMenu.classList.toggle("hidden");
    if (!selectMenu.classList.contains("hidden")) {
        searchInput.value = "";
        renderOptions(allPlayers.slice(0, 50));
        searchInput.focus();
    }
});

// Filter the list dynamically as the user types
searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        renderOptions(allPlayers.slice(0, 50));
        return;
    }

    const matched = allPlayers.filter((player) => 
        player.toLowerCase().includes(query)
    ).slice(0, 50);

    renderOptions(matched);
});

// Close menu if clicking anywhere outside the component
document.addEventListener("click", (event) => {
    if (!event.target.closest("#player-select-container")) {
        selectMenu.classList.add("hidden");
    }
});

loadPlayerDropdown();

betForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const playerVal = hiddenInput.value.trim();

    // FAIL-SAFE: If they typed a name but didn't click/press enter on the dropdown, auto-select a match
    const typedSearch = searchInput.value.trim();
    if (!playerVal && typedSearch) {
        const match = allPlayers.find((p) => p.toLowerCase() === typedSearch.toLowerCase()) ||
                      allPlayers.find((p) => p.toLowerCase().includes(typedSearch.toLowerCase()));
        if (match) {
            selectPlayer(match);
        }
    }

    const finalPlayerVal = hiddenInput.value.trim();

    // Validate that a real player was chosen
    if (!finalPlayerVal || !allPlayers.map(p => p.toLowerCase()).includes(finalPlayerVal.toLowerCase())) {
        errorMessage.textContent = "Please select a valid NBA player from the dropdown menu.";
        errorMessage.classList.remove("hidden");
        return;
    }

    loadingMessage.classList.remove("hidden");
    errorMessage.classList.add("hidden");
    resultsSection.classList.add("hidden");
    analyzeButton.disabled = true;
    analyzeButton.textContent = "Analyzing...";

    const requestData = {
        player: finalPlayerVal,
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