import { describe, it, expect } from 'vitest';
import { oversToDecimal, calculateStandings, Team, Match } from './cricket-math';

describe('oversToDecimal', () => {
  it('converts overs to correct decimals', () => {
    expect(oversToDecimal(20)).toBe(20);
    expect(oversToDecimal(19.4)).toBeCloseTo(19.6666, 4);
    expect(oversToDecimal(0.1)).toBeCloseTo(0.1666, 4);
    expect(oversToDecimal(0.5)).toBeCloseTo(0.8333, 4);
  });
});

describe('calculateStandings', () => {
  const tA: Team = { id: 'A', name: 'Team A', logo_url: null, created_at: '' };
  const tB: Team = { id: 'B', name: 'Team B', logo_url: null, created_at: '' };
  const tC: Team = { id: 'C', name: 'Team C', logo_url: null, created_at: '' };
  
  const baseMatch: Omit<Match, 'id' | 'team1_runs' | 'team1_wickets' | 'team1_overs' | 'team2_runs' | 'team2_wickets' | 'team2_overs' | 'result'> = {
    match_date: '2024-01-01',
    overs_limit: 20,
    team1_id: 'A',
    team2_id: 'B',
    batting_first_id: 'A',
    winner_id: 'A',
    created_at: ''
  };

  it('calculates points correctly', () => {
    const matches: Match[] = [
      {
        ...baseMatch,
        id: '1',
        result: 'team1_win',
        team1_runs: 150, team1_wickets: 5, team1_overs: 20,
        team2_runs: 140, team2_wickets: 10, team2_overs: 19.4
      }
    ];

    const standings = calculateStandings([tA, tB], matches);
    
    const sA = standings.find(s => s.team_id === 'A')!;
    const sB = standings.find(s => s.team_id === 'B')!;

    expect(sA.points).toBe(2);
    expect(sA.won).toBe(1);
    expect(sB.points).toBe(0);
    expect(sB.lost).toBe(1);
    
    // NRR for A = (150/20) - (140/20) (B is all out, so overs = 20)
    // NRR for A = 7.5 - 7.0 = +0.5
    expect(sA.nrr).toBeCloseTo(0.5, 4);
    // NRR for B = (140/20) - (150/20) = -0.5
    expect(sB.nrr).toBeCloseTo(-0.5, 4);
  });

  it('handles tied matches correctly', () => {
    const matches: Match[] = [
      {
        ...baseMatch,
        id: '1',
        result: 'tie',
        winner_id: null,
        team1_runs: 150, team1_wickets: 5, team1_overs: 20,
        team2_runs: 150, team2_wickets: 6, team2_overs: 20
      }
    ];
    const standings = calculateStandings([tA, tB], matches);
    const sA = standings.find(s => s.team_id === 'A')!;
    
    expect(sA.points).toBe(1);
    expect(sA.tied).toBe(1);
    expect(sA.nrr).toBeCloseTo(0, 4); // 150/20 - 150/20
  });

  it('handles no result correctly', () => {
    const matches: Match[] = [
      {
        ...baseMatch,
        id: '1',
        result: 'no_result',
        winner_id: null,
        team1_runs: null, team1_wickets: null, team1_overs: null,
        team2_runs: null, team2_wickets: null, team2_overs: null
      }
    ];
    const standings = calculateStandings([tA, tB], matches);
    const sA = standings.find(s => s.team_id === 'A')!;
    
    expect(sA.points).toBe(1);
    expect(sA.nr).toBe(1);
    expect(sA.nrr).toBe(0);
  });

  it('sorts by points then NRR', () => {
    const matches: Match[] = [
      { // A vs B. A wins by a large margin
        ...baseMatch, id: '1', result: 'team1_win', winner_id: 'A',
        team1_id: 'A', team2_id: 'B',
        team1_runs: 200, team1_wickets: 0, team1_overs: 20,
        team2_runs: 100, team2_wickets: 10, team2_overs: 15 
      },
      { // C vs A. C wins by a small margin (A has 1 win, C has 1 win)
        ...baseMatch, id: '2', result: 'team1_win', winner_id: 'C',
        team1_id: 'C', team2_id: 'A',
        team1_runs: 150, team1_wickets: 9, team1_overs: 20,
        team2_runs: 140, team2_wickets: 10, team2_overs: 19
      }
    ];
    // Both A and C have 2 points.
    // A NRR: (200/20 + 140/20) - (100/20 + 150/20) = (17) - (12.5) = +4.5
    // C NRR: (150/20) - (140/20) = 7.5 - 7.0 = +0.5
    // A should be 1st, C should be 2nd, B should be 3rd
    const standings = calculateStandings([tA, tB, tC], matches);
    
    expect(standings[0].team_id).toBe('A');
    expect(standings[1].team_id).toBe('C');
    expect(standings[2].team_id).toBe('B');
  });
});
