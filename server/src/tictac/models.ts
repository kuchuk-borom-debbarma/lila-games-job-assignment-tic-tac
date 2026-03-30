export interface Player {
    presence: nkruntime.Presence;
    symbol: number; // 1 for X, 2 for O
}

export interface MatchState {
    // The board: 0 = empty, 1 = X, 2 = O
    // Index 0-8 representing the 3x3 grid
    board: number[];

    // Players in the match, indexed by User ID
    presences: { [userId: string]: Player };

    // The ID of the player whose turn it is
    nextPlayerId: string;

    // Game status
    winnerId: string | null;
    isDraw: boolean;
    gameOverTick: number; // Track when the game ended

    // Optional: Deadline to handle players who disconnect or go AFK
    deadlineCount: number;
}

// OpCodes for communication between client and server
export enum OpCode {
    MOVE = 1,          // Client -> Server: "I want to move here"
    UPDATE = 2,        // Server -> Client: "Here is the new board"
    GAME_OVER = 3,     // Server -> Client: "Game finished, here is the winner"
    REJECTED_MOVE = 4  // Server -> Client: "That move was invalid"
}
