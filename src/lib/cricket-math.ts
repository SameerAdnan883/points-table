export type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  group_id: number;
  created_at: string;
};

export type TournamentSettings = {
  id: number;
  name: string;
  subtitle: string;
  layout_mode: 'single' | 'split';
  default_overs: number;
  players_per_team: number;
  updated_at: string;
};

export type MatchResult = 'team1_win' | 'team2_win' | 'tie' | 'no_result';

export type Match = {
  id: string;
  match_date: string;
  overs_limit: number;
  team1_id: string;
  team2_id: string;
  team1_runs: number | null;
  team1_wickets: number | null;
  team1_overs: number | null;
  team2_runs: number | null;
  team2_wickets: number | null;
  team2_overs: number | null;
  batting_first_id: string;
  result: MatchResult;
  winner_id: string | null;
  created_at: string;
};

export type TeamStanding = {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  matches: number;
  won: number;
  lost: number;
  tied: number;
  nr: number;
  points: number;
  nrr: number;
  // internal tracking for nrr
  runsScored: number;
  ballsFaced: number;
  runsConceded: number;
  ballsBowled: number;
};

const POINTS_WIN = 2;
const POINTS_TIE = 1;
const POINTS_NR = 1;
const POINTS_LOSS = 0;

/**
 * Converts cricket overs format (e.g. 19.4) to total balls (e.g. 118)
 * 19.4 = 19 overs and 4 balls = (19 * 6) + 4 = 118 balls
 */
export function oversToBalls(overs: number): number {
  const fullOvers = Math.floor(overs);
  const balls = Math.round((overs - fullOvers) * 10);
  return (fullOvers * 6) + balls;
}

export function calculateMatchMargin(match: Match, teams: Team[]): string {
  if (match.result === 'tie') return 'Match tied';
  if (match.result === 'no_result') return 'No result';

  const winnerId = match.result === 'team1_win' ? match.team1_id : match.team2_id;
  const winner = teams.find(t => t.id === winnerId);
  const winnerName = winner ? winner.name : 'Team';

  if (match.team1_runs === null || match.team2_runs === null || match.team1_wickets === null || match.team2_wickets === null) {
    return `${winnerName} won`;
  }

  const battingFirstId = match.batting_first_id;
  
  if (winnerId === battingFirstId) {
    // Winner batted first, so won by runs
    const runsDiff = Math.abs(match.team1_runs - match.team2_runs);
    return `${winnerName} won by ${runsDiff} runs`;
  } else {
    // Winner chased, so won by wickets
    const winnerWicketsLost = winnerId === match.team1_id ? match.team1_wickets : match.team2_wickets;
    const wicketsRemaining = 10 - winnerWicketsLost;
    return `${winnerName} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
  }
}

export function calculateStandings(teams: Team[], matches: Match[], settings?: TournamentSettings): TeamStanding[] {
  // Safe default if settings not provided
  const playersPerTeam = settings?.players_per_team || 11;
  const allOutWickets = playersPerTeam - 1;

  // Initialize standings for all teams
  const standingsMap = new Map<string, TeamStanding>();
  for (const team of teams) {
    standingsMap.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      logo_url: team.logo_url,
      matches: 0,
      won: 0,
      lost: 0,
      tied: 0,
      nr: 0,
      points: 0,
      nrr: 0,
      runsScored: 0,
      ballsFaced: 0,
      runsConceded: 0,
      ballsBowled: 0,
    });
  }

  for (const match of matches) {
    // Only process matches with teams that exist in the current list
    const team1Standing = standingsMap.get(match.team1_id);
    const team2Standing = standingsMap.get(match.team2_id);
    if (!team1Standing || !team2Standing) continue;

    team1Standing.matches += 1;
    team2Standing.matches += 1;

    if (match.result === 'team1_win') {
      team1Standing.won += 1;
      team1Standing.points += POINTS_WIN;
      team2Standing.lost += 1;
      team2Standing.points += POINTS_LOSS;
    } else if (match.result === 'team2_win') {
      team2Standing.won += 1;
      team2Standing.points += POINTS_WIN;
      team1Standing.lost += 1;
      team1Standing.points += POINTS_LOSS;
    } else if (match.result === 'tie') {
      team1Standing.tied += 1;
      team1Standing.points += POINTS_TIE;
      team2Standing.tied += 1;
      team2Standing.points += POINTS_TIE;
    } else if (match.result === 'no_result') {
      team1Standing.nr += 1;
      team1Standing.points += POINTS_NR;
      team2Standing.nr += 1;
      team2Standing.points += POINTS_NR;
    }

    // NRR calculation rules:
    // If No Result, do not include in NRR calculation.
    if (match.result === 'no_result') continue;

    // We only process NRR if we have the runs and overs
    if (
      match.team1_runs !== null &&
      match.team1_overs !== null &&
      match.team2_runs !== null &&
      match.team2_overs !== null
    ) {
      // Limit to convert balls if team is all out
      const matchBallsLimit = oversToBalls(match.overs_limit);

      // Team 1
      let t1BallsFaced = oversToBalls(match.team1_overs);
      if (match.team1_wickets === allOutWickets && t1BallsFaced < matchBallsLimit) {
        t1BallsFaced = matchBallsLimit;
      }
      
      // Team 2
      let t2BallsFaced = oversToBalls(match.team2_overs);
      if (match.team2_wickets === allOutWickets && t2BallsFaced < matchBallsLimit) {
        t2BallsFaced = matchBallsLimit;
      }

      team1Standing.runsScored += match.team1_runs;
      team1Standing.ballsFaced += t1BallsFaced;
      team1Standing.runsConceded += match.team2_runs;
      team1Standing.ballsBowled += t2BallsFaced; // Opponent faced = Team 1 bowled

      // Team 2
      team2Standing.runsScored += match.team2_runs;
      team2Standing.ballsFaced += t2BallsFaced;
      team2Standing.runsConceded += match.team1_runs;
      team2Standing.ballsBowled += t1BallsFaced; // Opponent faced = Team 2 bowled
    }
  }

  // Calculate final NRR and return array
  const standingsArray = Array.from(standingsMap.values());
  for (const s of standingsArray) {
    const runsScoredRate = s.ballsFaced > 0 ? s.runsScored / (s.ballsFaced / 6) : 0;
    const runsConcededRate = s.ballsBowled > 0 ? s.runsConceded / (s.ballsBowled / 6) : 0;
    
    // Check if team played any complete match, otherwise NRR is 0
    if (s.ballsFaced === 0 && s.ballsBowled === 0) {
      s.nrr = 0;
    } else {
      s.nrr = runsScoredRate - runsConcededRate;
    }
  }

  // Sort by Points (descending), then NRR (descending)
  standingsArray.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.nrr - a.nrr;
  });

  return standingsArray;
}
