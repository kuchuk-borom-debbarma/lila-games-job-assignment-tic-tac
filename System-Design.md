# System Design: Lila Tic-Tac-Toe

This document describes how the game is structured and how the different modes work.

---

## 1. The Game Class
The game rules are kept in a single class called `TicTacToeGame`. 

*   **Responsibility:** It handles player moves, updates the board, and checks if someone won or if there is a draw.
*   **Actions:** When a move is made, the class sends a message to all players with the new board and records the result if the game ends.

---

## 2. Game Modes
The project uses two classes to handle different ways of playing:

*   **Classic Mode:** Uses the `TicTacToeGame` class for standard play.
*   **Timed Mode:** Uses the `TimedTicTacToeGame` class. This class adds a 30-second timer to the standard rules. If a player does not move in time, the other player wins.

---

## 3. Matchmaking
Players are paired based on the mode they choose in the lobby.

*   **Selection:** The player selects "Classic" or "Timed" before searching for a match.
*   **Pairing:** The server only matches players who selected the same mode.
*   **Initialization:** Once a pair is found, the server starts a match using the corresponding game class.

---

## 4. Communication (OpCodes)
The frontend and the server talk to each other using specific codes:

*   **MOVE (1):** Sent by the player to click a cell.
*   **UPDATE (2):** Sent by the server to show the new board state.
*   **GAME_OVER (3):** Sent by the server when the match is finished.
*   **REJECTED (4):** Sent by the server if a move is not allowed.

---

## 5. Leaderboards and Stats
The server saves game results directly to Nakama:

*   **Wins and Losses:** Updated after every match and shown in the lobby leaderboard.
*   **Win Streaks:** The server tracks how many games a player wins in a row and saves their highest streak.

---

## 6. Server Loop
The server runs a loop once every second (1 tick per second). During this loop, it:
1. Checks for any new player moves.
2. Checks if a player has timed out (in Timed Mode).
3. Sends out updates to the players.
