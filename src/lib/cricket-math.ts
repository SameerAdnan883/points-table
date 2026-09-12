export type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
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
  oversFaced: number;
  runsConceded: number;
  oversBowled: number;
};

const POINTS_WIN = 2;
const POINTS_TIE = 1;
const POINTS_NR = 1;
const POINTS_LOSS = 0;

/**
 * Converts cricket overs format (e.g. 19.4) to decimal (e.g. 19.666666)
 */
export function oversToDecimal(overs: number): number {
  const fullOvers = Math.floor(overs);
  const balls = Math.round((overs - fullOvers) * 10);
  return fullOvers + balls / 6;
}

export function calculateStandings(teams: Team[], matches: Match[]): TeamStanding[] {
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
      oversFaced: 0,
      runsConceded: 0,
      oversBowled: 0,
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
      // Team 1
      let t1OversFaced = oversToDecimal(match.team1_overs);
      if (match.team1_wickets === 10 && t1OversFaced < match.overs_limit) {
        t1OversFaced = match.overs_limit;
      }
      let t2OversFaced = oversToDecimal(match.team2_overs);
      if (match.team2_wickets === 10 && t2OversFaced < match.overs_limit) {
        t2OversFaced = match.overs_limit;
      }

      team1Standing.runsScored += match.team1_runs;
      team1Standing.oversFaced += t1OversFaced;
      team1Standing.runsConceded += match.team2_runs;
      team1Standing.oversBowled += t2OversFaced; // Opponent faced = Team 1 bowled

      // Team 2
      team2Standing.runsScored += match.team2_runs;
      team2Standing.oversFaced += t2OversFaced;
      team2Standing.runsConceded += match.team1_runs;
      team2Standing.oversBowled += t1OversFaced; // Opponent faced = Team 2 bowled
    }
  }

  // Calculate final NRR and return array
  const standingsArray = Array.from(standingsMap.values());
  for (const s of standingsArray) {
    const runsScoredRate = s.oversFaced > 0 ? s.runsScored / s.oversFaced : 0;
    const runsConcededRate = s.oversBowled > 0 ? s.runsConceded / s.oversBowled : 0;
    
    // Check if team played any complete match, otherwise NRR is 0
    if (s.oversFaced === 0 && s.oversBowled === 0) {
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
