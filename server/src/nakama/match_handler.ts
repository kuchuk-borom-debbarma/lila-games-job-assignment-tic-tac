import {MatchState, OpCode} from "../tictac/models";
import {TicTacToeGame, TimedTicTacToeGame} from "../tictac/game";

/**
 * Factory to return the correct game instance based on the mode.
 */
function getGame(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, state: MatchState) {
    if (state.mode === 'timed') {
        return new TimedTicTacToeGame(ctx, logger, nk, dispatcher, state);
    }
    return new TicTacToeGame(ctx, logger, nk, dispatcher, state);
}

export const matchInit: nkruntime.MatchInitFunction<MatchState> = (ctx, logger, nk, params) => {
    const mode = (params['mode'] || 'classic') as 'classic' | 'timed';
    return {
        state: {
            mode: mode,
            board: new Array(9).fill(0),
            presences: {},
            nextPlayerId: '',
            winnerId: null,
            isDraw: false,
            gameOverTick: 0,
            deadlineCount: 0,
        },
        tickRate: 1,
        label: `tictactoe-${mode}`,
    };
};

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presence, metadata) => {
    return { state, accept: Object.keys(state.presences).length < 2 };
};

export const matchJoin: nkruntime.MatchJoinFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
    const game = getGame(ctx, logger, nk, dispatcher, state);
    presences.forEach((p) => {
        const symbol = Object.keys(state.presences).length === 0 ? 1 : 2;
        state.presences[p.userId] = { presence: p, symbol };
        if (state.nextPlayerId === '') state.nextPlayerId = p.userId;
        logger.info('Player Joined (%s): %s', state.mode, p.userId);
    });
    game.broadcastUpdate();
    return { state };
};

export const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, presences) => {
    presences.forEach((p) => delete state.presences[p.userId]);
    return { state };
};

export const matchLoop: nkruntime.MatchLoopFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, messages) => {
    // 1. Termination Lifecycle
    if (state.gameOverTick > 0 && tick > state.gameOverTick + 2) return null;

    // 2. Encapsulated Game Loop (Polymorphic)
    const game = getGame(ctx, logger, nk, dispatcher, state);
    game.update(tick, messages);

    return { state };
};

export const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, graceSeconds) => {
    return { state };
};

export const matchSignal: nkruntime.MatchSignalFunction<MatchState> = (ctx, logger, nk, dispatcher, tick, state, data) => {
    return { state, data };
};
