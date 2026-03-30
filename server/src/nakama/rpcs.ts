export const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = (ctx, logger, nk, matches) => {
    logger.info("Matchmaker matched %d players: %s", matches.length, JSON.stringify(matches.map(m => m.presence.userId)));
    const matchId = nk.matchCreate('tictactoe');
    logger.info("Created authoritative match from matchmaker: %s", matchId);
    return matchId;
};
