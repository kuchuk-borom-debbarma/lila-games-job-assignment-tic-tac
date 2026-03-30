import * as tictactoe from './tictac/match';
import {matchmakerMatched} from "./nakama/rpcs";

let InitModule: nkruntime.InitModule = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    logger.info('Lila Games - Tic-Tac-Toe Server Logic Initialized!');

    // Defining
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
}


// @ts-ignore
globalThis.InitModule = InitModule;
