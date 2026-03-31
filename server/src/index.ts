import * as matchHandler from './nakama/match_handler';
import {matchmakerMatched} from "./nakama/hooks";

let InitModule: nkruntime.InitModule = function (_ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info('Lila Games - Tic-Tac-Toe Server Logic Initialized!');

    // Register Match Handler
    initializer.registerMatch('tictactoe', {
        matchInit: matchHandler.matchInit,
        matchJoinAttempt: matchHandler.matchJoinAttempt,
        matchJoin: matchHandler.matchJoin,
        matchLeave: matchHandler.matchLeave,
        matchLoop: matchHandler.matchLoop,
        matchTerminate: matchHandler.matchTerminate,
        matchSignal: matchHandler.matchSignal,
    });

    // Register Matchmaker Matched Hook
    initializer.registerMatchmakerMatched(matchmakerMatched);

    try {
        // 1. Wins (Descending, Incremental)
        nk.leaderboardCreate('tictactoe_wins', true, 'descending' as any, 'increment' as any);
        
        // 2. Losses (Descending, Incremental)
        nk.leaderboardCreate('tictactoe_losses', true, 'descending' as any, 'increment' as any);
        
        // 3. Win Streaks (Descending, Best - stores the highest streak ever)
        nk.leaderboardCreate('tictactoe_streaks', true, 'descending' as any, 'best' as any);

        logger.info('Leaderboards initialized OK');
    } catch (e: any) {
        logger.error('Leaderboard FAILED. message=%s keys=%s', String(e?.message), JSON.stringify(Object.keys(e || {})));
    }
}

// @ts-ignore
globalThis.InitModule = InitModule;
