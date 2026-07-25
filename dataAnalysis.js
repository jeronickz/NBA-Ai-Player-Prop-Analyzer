const STAT_FIELDS = {
    points: "points",
    pts: "points",

    rebounds: "reboundsTotal",
    rebound: "reboundsTotal",
    reb: "reboundsTotal",

    assists: "assists",
    assist: "assists",
    ast: "assists",

    steals: "steals",
    steal: "steals",
    stl: "steals",

    blocks: "blocks",
    block: "blocks",
    blk: "blocks",

    turnovers: "turnovers",
    turnover: "turnovers",
    tov: "turnovers",

    threepointers: "threePointersMade",
    threepointer: "threePointersMade",
    threes: "threePointersMade",
    threepointersmade: "threePointersMade",
    fg3m: "threePointersMade"
};

function normalizeStatName(stat) {
    if (!stat) {
        throw new Error("A statistic is required.");
    }

    const cleanedStat = stat
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    const datasetField = STAT_FIELDS[cleanedStat];

    if (!datasetField) {
        throw new Error(`Unsupported statistic: ${stat}`);
    }

    return datasetField;
}

function calculateAverage(numbers) {
    if (numbers.length === 0) {
        return 0;
    }

    const total = numbers.reduce(
        (sum, number) => sum + number,
        0
    );

    return total / numbers.length;
}

function calculateMedian(numbers) {
    if (numbers.length === 0) {
        return 0;
    }

    const sortedNumbers = [...numbers].sort(
        (a, b) => a - b
    );

    const middle = Math.floor(sortedNumbers.length / 2);

    if (sortedNumbers.length % 2 === 0) {
        return (
            sortedNumbers[middle - 1] +
            sortedNumbers[middle]
        ) / 2;
    }

    return sortedNumbers[middle];
}

function calculateStandardDeviation(numbers) {
    if (numbers.length === 0) {
        return 0;
    }

    const average = calculateAverage(numbers);

    const squaredDifferences = numbers.map((number) =>
        Math.pow(number - average, 2)
    );

    const variance = calculateAverage(squaredDifferences);

    return Math.sqrt(variance);
}

function analyzePlayerProp(
    playerLogs,
    stat,
    line,
    betDirection
) {
    const datasetField = normalizeStatName(stat);
    const numericLine = Number(line);
    const direction = betDirection
        .toString()
        .trim()
        .toLowerCase();

    if (!Array.isArray(playerLogs) || playerLogs.length === 0) {
        throw new Error("No player game records were provided.");
    }

    if (!Number.isFinite(numericLine)) {
        throw new Error("The betting line must be a valid number.");
    }

    if (direction !== "over" && direction !== "under") {
        throw new Error(
            'The bet direction must be either "over" or "under".'
        );
    }

    const validGames = playerLogs
        .filter((game) => {
            const minutes = Number(game.numMinutes);
            const statValue = Number(game[datasetField]);

            return (
                Number.isFinite(minutes) &&
                minutes > 0 &&
                Number.isFinite(statValue)
            );
        })
        .map((game) => ({
            gameId: game.gameId,
            date: game.gameDate,
            opponent:
                `${game.opponentteamCity} ${game.opponentteamName}`,
            home: game.home === "1",
            win: game.win === "1",
            value: Number(game[datasetField])
        }))
        .sort(
            (firstGame, secondGame) =>
                new Date(firstGame.date) -
                new Date(secondGame.date)
        );

    if (validGames.length === 0) {
        throw new Error(
            `No valid games were found for the statistic ${datasetField}.`
        );
    }

    const values = validGames.map((game) => game.value);

    const lastFiveGames = validGames.slice(-5);
    const lastTenGames = validGames.slice(-10);

    const lastFiveValues = lastFiveGames.map(
        (game) => game.value
    );

    const lastTenValues = lastTenGames.map(
        (game) => game.value
    );

    let wins = 0;
    let losses = 0;
    let pushes = 0;

    for (const value of values) {
        if (value === numericLine) {
            pushes++;
        } else if (
            direction === "over" &&
            value > numericLine
        ) {
            wins++;
        } else if (
            direction === "under" &&
            value < numericLine
        ) {
            wins++;
        } else {
            losses++;
        }
    }

    const decidedBets = wins + losses;

    const hitRate =
        decidedBets === 0
            ? 0
            : (wins / decidedBets) * 100;

    return {
        statRequested: stat,
        datasetField: datasetField,
        line: numericLine,
        betDirection: direction.toUpperCase(),

        gamesPlayed: validGames.length,

        seasonAverage: Number(
            calculateAverage(values).toFixed(2)
        ),

        median: Number(
            calculateMedian(values).toFixed(2)
        ),

        standardDeviation: Number(
            calculateStandardDeviation(values).toFixed(2)
        ),

        lastFiveAverage: Number(
            calculateAverage(lastFiveValues).toFixed(2)
        ),

        lastTenAverage: Number(
            calculateAverage(lastTenValues).toFixed(2)
        ),

        wins: wins,
        losses: losses,
        pushes: pushes,

        hitRate: Number(hitRate.toFixed(2)),

        trendData: lastTenGames
    };
}

module.exports = {
    analyzePlayerProp
};