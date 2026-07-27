# NBA AI Player Prop Analyzer 🏀🤖

An AI-enhanced, full-stack sports analytics platform that evaluates NBA player prop bets. By combining a deterministic statistical processing engine with Google Gemini's quantitative reasoning, this application calculates historical hit rates, standard deviations, and Expected Value (+EV / -EV) to deliver data-driven betting recommendations.

---

## 🌟 Key Features

* **Custom Searchable Dropdown:** A responsive, accessible player selection interface featuring real-time text filtering and full keyboard arrow-key navigation.
* **Deterministic Statistical Engine:** Programmatically computes core mathematical metrics directly from historical game logs—including Season Average, Median, Standard Deviation, and Last 5/10 Game Trends—preventing AI math hallucinations.
* **Expected Value (EV) Calculator:** Evaluates historical hit rates against bookmaker American odds to calculate the exact mathematical profitability of a wager.
* **Agentic AI Analysis:** Integrates Google Gemini (`gemini-3.5-flash`) via structured JSON prompting to synthesize quantitative performance data and deliver actionable insights.
* **Dynamic Data Visualization:** Automatically generates interactive line charts using Chart.js to plot recent player performance directly against the target betting line threshold.

---

## 🏗️ System Architecture

Our application implements a decoupled, 3-tier client-server architecture:

1. **Presentation Layer (Frontend):** Built with HTML5, CSS3, Vanilla JavaScript, and Chart.js. Communicates with the backend asynchronously via RESTful `fetch()` requests without page reloads.
2. **Controller & Application Layer (Node.js / Express):** Serves as the stateless API gateway (`GET /api/players`, `POST /api/analyze`), handling routing, CORS, input validation, and payload assembly.
3. **Service & Data Layer:** 
   * Ingests local JSON game records (`nba_stats.json`) representing over 100 recent NBA performances.
   * Processes raw numbers through a custom mathematical engine (`dataAnalysis.js`).
   * Interfaces with the Google Gemini API to generate structured, qualitative reasoning.

---

## 🚀 Getting Started & Local Setup

Follow these instructions to run the application locally on your machine.

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
* `npm` (included with Node.js)

### 1. Clone the Repository
'''bash
`git clone [https://github.com/your-username/NBA-Ai-Player-Prop-Analyzer.git](https://github.com/your-username/NBA-Ai-Player-Prop-Analyzer.git)
cd NBA-Ai-Player-Prop-Analyzer`

### 2. Install Dependencies
Install the required server-side packages (`express`, `cors`, `dotenv`, `@google/genai`, etc.):
'''bash
npm install

### 3. This project requires a Google Gemini API key to run the AI recommendation engine. To protect sensitive credentials, private keys are excluded from version control. We have provided an example template to help you set up your environment:
In the root directory of the project, create a copy of the .env.example file and name it .env:

Bash
# On macOS / Linux:
`cp .env.example .env`

# On Windows (PowerShell):
`Copy-Item .env.example .env`

Open the newly created .env file in your text editor.
Replace the placeholder text with your actual Google Gemini API key:

### 4. Launch the server.
Launch the Express server by typing this in your Bash:
'''bash
`npm start`

## 🎓 Course & Customization Note
This project was developed as part of an Al-Enhanced Client-Server Application Development curriculum. While standard course reference coding demonstrated basic client-server AI querying, our team heavily customized and extended the architecture by:

Integrating a domain-specific sports analytics dataset (nba_stats.json).

Building a standalone algorithmic service layer (dataAnalysis.js) to process raw data before engaging the LLM.

Enforcing strict JSON schema responses from the Gemini API to ensure reliable frontend parsing and rendering.

⚠️ Disclaimer
For educational and analytical purposes only. This application is designed to demonstrate full-stack software architecture and data visualization techniques and does not constitute financial or betting advice.
