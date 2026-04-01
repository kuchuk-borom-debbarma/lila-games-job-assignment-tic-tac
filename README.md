# Lila Games Tic-Tac-Toe Assessment

This is a multiplayer Tic-Tac-Toe game supporting both **Classic** and **Timed (30s)** modes. The project uses Nakama as the game server and React for the frontend.

## 1. Setup and Installation

### Prerequisites
- **Docker & Docker Compose**: Required for the database and game server.
- **Bun** (or Node.js): Required for the frontend and building server modules.

### Step 1: Start the Server
The server runs inside Docker, but the game logic must be compiled to JavaScript first. We have a helper script in the root directory for this:

1.  Open your terminal in the project root.
2.  Run the redeploy script:
    ```bash
    chmod +x redeploy.sh  # (if needed)
    ./redeploy.sh
    ```
3.  **What this script does:**
    *   Compiles the TypeScript game rules into the `server/dist/` folder.
    *   Restarts the Docker containers (`nakama` and `postgres`).
    *   Clears previous match data to ensure a fresh environment.
    *   Starts following the server logs so you can see match activity.

### Step 2: Start the Frontend
1.  Open a new terminal window in the `frontend` directory:
    ```bash
    cd frontend
    bun install
    bun run dev
    ```
2.  The game will be available at `http://localhost:3000`.

---

## 2. How to Test Multiplayer
To test the game properly, you need at least two players:

1.  **Open Two Tabs**: Open `http://localhost:3000` in two separate tabs in the same browser (or two different browsers). Since the game uses **Session Storage**, each tab will act as a completely independent player.
2.  **Unique Logins**: Enter a different username in each tab (e.g., "Player_A" and "Player_B").
3.  **Choose a Mode**: Ensure both players have the same mode selected in the lobby (Classic or Timed).
4.  **Matchmaking**: Click "Play Game" in both windows. The server will pair you automatically and start the match.
5.  **Timed Mode Verification**: In Timed mode, if you wait 30 seconds on a player's turn, the server will end the match and declare the other player the winner.

---

## 3. Design Decisions

- **Rule Encapsulation**: All game logic is contained in the `TicTacToeGame` class. The server infrastructure doesn't know the rules; it just asks the class to process moves.
- **Polymorphism for Game Modes**: We used inheritance to create the `TimedTicTacToeGame`. It reuses all the standard rules from the base class and only adds the 30-second logic on top.
- **Factory Pattern**: The server uses a factory to create the correct game object based on what the players requested in the lobby.
- **Authoritative Server**: The client only sends "intent" (e.g., "I want to click index 4"). The server validates the turn, updates the board, and checks for winners.

---

## 4. API and Server Details
- **Game Server**: `http://127.0.0.1:7350`
- **Server Key**: `defaultkey` (Standard Nakama default).
- **Communication Codes (OpCodes)**:
  - `1`: MOVE (Click cell)
  - `2`: UPDATE (New board received)
  - `3`: GAME_OVER (Winner declared)
  - `4`: REJECTED_MOVE (Move was invalid)

---

## 5. Persistence
- **Leaderboards**: Wins and losses are saved to Nakama leaderboards and shown in the lobby.
- **Win Streaks**: The server tracks consecutive wins and stores your highest streak in the Nakama storage engine.
