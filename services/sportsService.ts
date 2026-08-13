
export interface SportEvent {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  startTimestamp: number;
  status: { type: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
  tournament: { name: string; category: { name: string; flag: string } };
}

export const sportsService = {
  async fetchLiveEvents(sport: string = 'football') {
    try {
      const url = `/api/sports/live/${sport}`;
      console.log(`Fetching live events from proxy: ${url}`);
      const response = await fetch(url);
      const data = await response.json().catch(() => null);
      
      if (!response.ok || (data && data.errors && Object.keys(data.errors).length > 0)) {
        console.warn(`Live API issue for ${sport}:`, data?.errors || response.status);
        // Fallback to scheduled if live not available or fails
        return this.fetchScheduledEvents(new Date().toISOString().split('T')[0], sport);
      }
      return data;
    } catch (error) {
      console.error('Error fetching live events:', error);
      return this.fetchScheduledEvents(new Date().toISOString().split('T')[0], sport);
    }
  },

  async fetchScheduledEvents(date: string = new Date().toISOString().split('T')[0], sport: string = 'football') {
    try {
      const url = `/api/sports/scheduled/${sport}/${date}`;
      console.log(`Fetching scheduled events from proxy: ${url}`);
      const response = await fetch(url);
      const data = await response.json().catch(() => null);

      if (!response.ok || (data && data.errors && Object.keys(data.errors).length > 0)) {
        console.warn(`Scheduled API issue for ${sport}:`, data?.errors || response.status);
        return { response: [], errors: data?.errors || [`HTTP ${response.status}`] };
      }
      return data;
    } catch (error) {
      console.error('Error fetching scheduled events:', error);
      return { response: [], errors: [(error as Error).message] };
    }
  },

  async fetchEventOdds(eventId: number | string) {
    try {
      const url = `/api/sports/odds/${eventId}`;
      console.log(`Fetching odds from proxy: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch event odds: ${response.status} - ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching event odds:', error);
      return null;
    }
  },

  async fetchSports() {
    try {
      const response = await fetch('/api/sports/list');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to fetch sports: ${response.status} - ${text}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching sports:', error);
      return null;
    }
  },

  async fetchPitches(eventId: string | number, atBatId: string | number) {
    try {
      const response = await fetch(`/api/sports/pitches/${eventId}/${atBatId}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pitches:', error);
      return null;
    }
  },

  async fetchCountries(sport: string = 'football') {
    try {
      const url = `/api/sports/countries/${sport}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.errors && data.errors.length > 0)) {
        console.warn(`Countries API issue for ${sport}:`, data?.errors || response.status);
        return { response: [], errors: data?.errors || [`HTTP ${response.status}`] };
      }
      return data;
    } catch (error) {
      console.error('Error fetching countries:', error);
      return { response: [], errors: [(error as Error).message] };
    }
  },

  async fetchLeagues(sport: string = 'football', country: string) {
    try {
      const url = `/api/sports/leagues/${sport}/${country}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.errors && data.errors.length > 0)) {
        console.warn(`Leagues API issue for ${sport}:`, data?.errors || response.status);
        return { response: [], errors: data?.errors || [`HTTP ${response.status}`] };
      }
      return data;
    } catch (error) {
      console.error('Error fetching leagues:', error);
      return { response: [], errors: [(error as Error).message] };
    }
  },

  async fetchTeamFixtures(sport: string, teamId: number | string, season?: number | string) {
    try {
      const url = `/api/sports/team-fixtures/${sport}/${teamId}${season ? `?season=${season}` : ''}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.errors && Object.keys(data.errors).length > 0)) {
        return { response: [], errors: data?.errors || [`HTTP ${response.status}`] };
      }
      return data;
    } catch (error) {
      console.error('Error fetching team fixtures:', error);
      return { response: [], errors: [(error as Error).message] };
    }
  },
  
  async searchTeams(sport: string, query: string) {
    try {
      if (!query || query.length < 3) return { response: [] };
      const url = `/api/sports/search-teams/${sport}/${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json().catch(() => null);
      if (!response.ok || (data && data.errors && Object.keys(data.errors).length > 0)) {
        return { response: [], errors: data?.errors || [`HTTP ${response.status}`] };
      }
      return data;
    } catch (error) {
      console.error('Error searching teams:', error);
      return { response: [], errors: [(error as Error).message] };
    }
  }
};
