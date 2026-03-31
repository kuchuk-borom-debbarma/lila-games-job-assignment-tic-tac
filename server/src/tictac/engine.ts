import {MatchState, OpCode, Player} from "./models";

/**
 * Core Move Logic: Validates, Executes, and Checks for Terminal States
 */
export function handleMove(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, msg: nkruntime.MatchMessage) {
    const userId = msg.sender.userId;

    // Validation: Correct Turn
    if (userId !== state.nextPlayerId) {
        dispatcher.broadcastMessage(OpCode.REJECTED_MOVE, 'Not your turn', [msg.sender]);
        return;
    }

    const data = JSON.parse(nk.binaryToString(msg.data));
    const index = data.index;

    // Validation: Valid Bounds & Empty Cell
    if (index < 0 || index > 8 || state.board[index] !== 0) {
        dispatcher.broadcastMessage(OpCode.REJECTED_MOVE, 'Invalid move', [msg.sender]);
        return;
    }

    // Execution
    const player = state.presences[userId];
    state.board[index] = player.symbol;

    // Post-Execution: Win/Draw/Next Turn
    if (checkWin(state.board, player.symbol)) {
        processWin(ctx, logger, nk, dispatcher, tick, state, userId, player);
    } else if (state.board.every(cell => cell !== 0)) {
        processDraw(dispatcher, tick, state);
    } else {
        processNextTurn(dispatcher, state, userId);
    }
}

export function processWin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, userId: string, player: Player) {
    state.winnerId = userId;
    state.gameOverTick = tick;

    // 1. Record Win
    recordLeaderboardWin(nk, logger, ctx.matchId || '', userId, player.presence.username);

    // 2. Manage Streaks for the Winner
    updateWinStreak(nk, logger, userId, player.presence.username, true);

    // 3. Record Loss & Reset Streak for the Loser
    const loserId = Object.keys(state.presences).find(id => id !== userId);
    if (loserId) {
        const loser = state.presences[loserId];
        recordLeaderboardLoss(nk, logger, ctx.matchId || '', loserId, loser.presence.username);
        updateWinStreak(nk, logger, loserId, loser.presence.username, false);
    }

    dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
        winnerId: userId,
        board: state.board
    }));
}

function recordLeaderboardLoss(nk: nkruntime.Nakama, logger: nkruntime.Logger, matchId: string, userId: string, username: string) {
    try {
        nk.leaderboardRecordWrite('tictactoe_losses', userId, username, 1, 0, { matchId }, 'increment' as any);
        logger.info('Leaderboard: Loss recorded for user %s (%s). Match: %s', userId, username, matchId);
    } catch (err) {
        logger.error('Leaderboard: Failed to record loss for %s: %s', userId, err);
    }
}

/**
 * Handles win streaks using Nakama Storage Engine to keep track of current streak.
 */
function updateWinStreak(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, username: string, isWinner: boolean) {
    const collection = 'stats';
    const key = 'streak';
    
    try {
        // Read current streak
        let currentStreak = 0;
        const objects = nk.storageRead([{ collection, key, userId }]);
        
        if (objects && objects.length > 0) {
            currentStreak = (objects[0].value as any).current || 0;
        }

        if (isWinner) {
            currentStreak += 1;
            // Update the "Best Streak" leaderboard if it's the highest ever
            nk.leaderboardRecordWrite('tictactoe_streaks', userId, username, currentStreak, 0, {}, 'best' as any);
        } else {
            currentStreak = 0; // Reset streak on loss
        }

        // Save new streak back to storage
        nk.storageWrite([{
            collection,
            key,
            userId,
            value: { current: currentStreak },
            permissionRead: 1, // Public read
            permissionWrite: 0  // No client write
        }]);

        logger.info('Streak updated for user %s: %d', userId, currentStreak);
    } catch (err) {
        logger.error('Streak: Failed to update streak for %s: %s', userId, err);
    }
}

export function processDraw(dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState) {
    state.isDraw = true;
    state.gameOverTick = tick;
    dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({
        isDraw: true,
        board: state.board
    }));
}

export function processNextTurn(dispatcher: nkruntime.MatchDispatcher, state: MatchState, currentUserId: string) {
    const otherPlayerId = Object.keys(state.presences).find(id => id !== currentUserId);
    state.nextPlayerId = otherPlayerId || '';
    broadcastUpdate(dispatcher, state);
}

export function broadcastUpdate(dispatcher: nkruntime.MatchDispatcher, state: MatchState) {
    dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
        board: state.board,
        nextPlayerId: state.nextPlayerId,
        playerCount: Object.keys(state.presences).length
    }));
}

export function recordLeaderboardWin(nk: nkruntime.Nakama, logger: nkruntime.Logger, matchId: string, userId: string, username: string) {
    try {
        // Explicitly pass 'increment' (OverrideOperator) as the 7th argument
        nk.leaderboardRecordWrite('tictactoe_wins', userId, username, 1, 0, { matchId }, 'increment' as any);
        logger.info('Leaderboard: Win recorded for user %s (%s). Match: %s', userId, username, matchId);
    } catch (err) {
        logger.error('Leaderboard: Failed to record win for %s: %s', userId, err);
    }
}

export function checkWin(board: number[], symbol: number): boolean {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    return wins.some(combo => combo.every(index => board[index] === symbol));
}
