import {MatchState, OpCode} from "../tictac/models";
import * as engine from "../tictac/engine";

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

    engine.broadcastUpdate(dispatcher, state);

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
    // 1. Lifecycle: Check if match should terminate
    if (state.gameOverTick > 0 && tick > state.gameOverTick + 2) {
        logger.info('Match %s is over, shutting down handler.', ctx.matchId);
        return null;
    }

    // 2. State Guard: Don't process moves if the game is already finished
    if (state.winnerId || state.isDraw) {
        return {state};
    }

    // 3. Message Processing
    messages.forEach((msg) => {
        if (msg.opCode === OpCode.MOVE) {
            engine.handleMove(ctx, logger, nk, dispatcher, tick, state, msg);
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
