import {MatchState, OpCode} from "./models";

export const matchInit: nkruntime.MatchInitFunction<MatchState> = (ctx, logger, nk, params) => {
    const state: MatchState = {
        board: new Array(9).fill(0),
        presences: {},
        nextPlayerId: '',
        winnerId: null,
        isDraw: false,
        gameOverTick: 0,
        deadlineCount: 0,
    };

    return {
        state,
        tickRate: 1,
        label: 'tictactoe-match',
    };
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presence, metadata) => {
    const playerCount = Object.keys(state.presences).length;
    return {
        state,
        accept: playerCount < 2,
    };
};

export const matchJoin: nkruntime.MatchJoinFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
    presences.forEach((p) => {
        const playerCount = Object.keys(state.presences).length;
        const symbol = playerCount === 0 ? 1 : 2;

        state.presences[p.userId] = {
            presence: p,
            symbol: symbol,
        };

        if (state.nextPlayerId === '') {
            state.nextPlayerId = p.userId;
        }

        logger.info('Player Joined Match: %s (Session: %s) with Symbol: %d', p.userId, p.sessionId, symbol);
    });

    dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
        board: state.board,
        nextPlayerId: state.nextPlayerId,
        playerCount: Object.keys(state.presences).length
    }));

    return {state};
};

export const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
    presences.forEach((p) => {
        delete state.presences[p.userId];
        logger.info('Player left: %s', p.userId);
    });
    return {state};
};

export const matchLoop: nkruntime.MatchLoopFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, messages) => {
    // Shutdown after 2 ticks of the game being over (approx 2 seconds)
    if (state.gameOverTick > 0 && tick > state.gameOverTick + 2) {
        logger.info('Match %s is over, shutting down handler.', ctx.matchId);
        return null;
    }

    // If game is over, we stop processing new moves but let the loop run for the shutdown delay
    if (state.winnerId || state.isDraw) {
        return { state };
    }

    messages.forEach((msg) => {
        const userId = msg.sender.userId;

        if (msg.opCode === OpCode.MOVE) {
            if (userId !== state.nextPlayerId) {
                dispatcher.broadcastMessage(OpCode.REJECTED_MOVE, 'Not your turn', [msg.sender]);
                return;
            }

            const data = JSON.parse(nk.binaryToString(msg.data));
            const index = data.index;

            if (index < 0 || index > 8 || state.board[index] !== 0) {
                dispatcher.broadcastMessage(OpCode.REJECTED_MOVE, 'Invalid move', [msg.sender]);
                return;
            }

            const player = state.presences[userId];
            state.board[index] = player.symbol;

            if (checkWin(state.board, player.symbol)) {
                state.winnerId = userId;
                state.gameOverTick = tick;

                // Record the win to the leaderboard (INCREMENTAL operator adds +1)
                try {
                    const score = 1;
                    const subscore = 0;
                    const metadata = { matchId: ctx.matchId };
                    // We use as any here to satisfy TS if the runtime definitions are contradictory,
                    // but most Nakama versions expect a JS object for metadata in the JS runtime.
                    nk.leaderboardRecordWrite('tictactoe_wins', userId, player.presence.username, score, subscore, metadata as any);
                    logger.info('Leaderboard: Win recorded for user %s (%s)', userId, player.presence.username);
                } catch (err) {
                    logger.error('Leaderboard: Failed to record win: %s', err);
                }

                dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({winnerId: userId, board: state.board}));
            } else if (state.board.every(cell => cell !== 0)) {
                state.isDraw = true;
                state.gameOverTick = tick;
                dispatcher.broadcastMessage(OpCode.GAME_OVER, JSON.stringify({isDraw: true, board: state.board}));
            } else {
                const otherPlayerId = Object.keys(state.presences).find(id => id !== userId);
                state.nextPlayerId = otherPlayerId || '';

                dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify({
                    board: state.board,
                    nextPlayerId: state.nextPlayerId,
                    playerCount: Object.keys(state.presences).length
                }));
            }
        }
    });

    return {state};
};

export const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) => {
    return {state};
};

export const matchSignal: nkruntime.MatchSignalFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, data) => {
    return {state, data};
};

function checkWin(board: number[], symbol: number): boolean {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    return wins.some(combo => combo.every(index => board[index] === symbol));
}
