# System Design

This is a quick breakdown of how the game is put together and why we made certain choices.

---

## 1. No Global "Brain"
Instead of having one giant manager trying to keep track of every single game running on the server, we kept things isolated. 

*   **Each game is its own world:** Every match gets its own little container (QuickJS VM) in Nakama. We just pass the game state around between functions. 
*   **Why?** It's way safer. You don't have to worry about Game A accidentally messing with Game B's board. Plus, with a game as simple as Tic-Tac-Toe, just passing a small object around is much easier than managing a complex central state.

---

## 2. Keeping the Folders Clean
We split the code into two main buckets: `nakama/` and `tictac/`.

*   **`nakama/` (The Server Stuff):** This is the glue. it handles things like people joining, leaving, and the technical WebSocket details.
*   **`tictac/` (The Game Core):** This is just pure Tic-Tac-Toe logic—checking for wins, valid moves, etc. 
*   **Why?** It keeps the "fun" part of the code separate from the "boring" server infrastructure. If we ever wanted to move this game to a different server engine later, we could just grab the `tictac/` folder and it would mostly just work.

---

## 3. JSON over WebSockets
We're keeping the communication simple by sending JSON payloads back and forth.

*   **Why?** It's easy to read and debug. Since we're only updating a 3x3 grid, we don't need fancy binary compression yet. We use simple "OpCodes" (like MOVE or UPDATE) so the client and server always know exactly what message they're looking at.

---

## 4. The 1-Second Heartbeat
The server "wakes up" once every second to process moves.

*   **Why?** Tic-Tac-Toe isn't a fast-paced shooter. A 1-second delay for the official "server says you moved" message is totally fine. This keeps the server's CPU usage super low, meaning we can run thousands of games at the same time without breaking a sweat.
