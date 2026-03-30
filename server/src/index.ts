import * as tictactoe from './tictac/match';
import {matchmakerMatched} from "./nakama/rpcs";

let InitModule: nkruntime.InitModule = function (_ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info('Lila Games - Tic-Tac-Toe Server Logic Initialized!');

    // Register Match Handler
    initializer.registerMatch('tictactoe', {
        matchInit: tictactoe.matchInit,
        matchJoinAttempt: tictactoe.matchJoinAttempt,
        matchJoin: tictactoe.matchJoin,
        matchLeave: tictactoe.matchLeave,
        matchLoop: tictactoe.matchLoop,
        matchTerminate: tictactoe.matchTerminate,
        matchSignal: tictactoe.matchSignal,
    });

    // Register Matchmaker Matched Hook
    initializer.registerMatchmakerMatched(matchmakerMatched);

    try {
        nk.leaderboardCreate(
            'tictactoe_wins',
            true,
            'desc' as any,       // not a number — the JS runtime wants the string
            'incr' as any,       // incremental operator
        );
        logger.info('Leaderboard created OK');
    } catch (e: any) {
        logger.error('Leaderboard FAILED. message=%s keys=%s', String(e?.message), JSON.stringify(Object.keys(e || {})));
    }
}

// @ts-ignore
globalThis.InitModule = InitModule;
