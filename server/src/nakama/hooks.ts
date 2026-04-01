export const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = (ctx, logger, nk, matches) => {
    logger.info("Matchmaker matched %d players: %s", matches.length, JSON.stringify(matches.map(m => m.presence.userId)));
    
    // Extract mode from the first player's properties (they should match)
    const mode = matches[0].properties['mode'] || 'classic';
    
    const matchId = nk.matchCreate('tictactoe', { mode });
    logger.info("Created authoritative match (%s) from matchmaker: %s", mode, matchId);
    return matchId;
};