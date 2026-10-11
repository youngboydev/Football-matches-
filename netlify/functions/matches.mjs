
const LEAGUES = [
  { code: "eng.1", name: "Premier League" },
  { code: "esp.1", name: "La Liga" },
  { code: "ita.1", name: "Serie A" },
  { code: "ger.1", name: "Bundesliga" },
  { code: "fra.1", name: "Ligue 1" },
  { code: "uefa.champions", name: "UEFA Champions League" },
  { code: "usa.1", name: "MLS" }
];

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

function normalizeMatch(event, league) {
  const competition = event.competitions?.[0];

  if (!competition) return null;

  const competitors = competition.competitors || [];
  const home = competitors.find(t => t.homeAway === "home");
  const away = competitors.find(t => t.homeAway === "away");

  if (!home || !away) return null;

  const statusInfo = event.status?.type || {};
  const state = statusInfo.state;

  let status = "SCHEDULED";

  if (state === "in") status = "IN_PLAY";
  if (state === "post") {
    status = statusInfo.name === "STATUS_FINAL"
      ? "FINISHED"
      : "FINISHED";
  }

  const homeScore =
    home.score !== undefined && home.score !== ""
      ? Number(home.score)
      : null;

  const awayScore =
    away.score !== undefined && away.score !== ""
      ? Number(away.score)
      : null;

  const clock = event.status?.displayClock || "";
  const period = event.status?.period || 0;

  const minute = state === "in"
    ? (clock ? `${clock}'` : `${period > 0 ? period : ""}`)
    : null;

  return {
    id: String(event.id),
    competition: {
      name: league.name,
      code: league.code
    },
    homeTeam: {
      name: home.team?.displayName || home.team?.name || "Home",
      shortName: home.team?.abbreviation || home.team?.shortDisplayName || "HOME"
    },
    awayTeam: {
      name: away.team?.displayName || away.team?.name || "Away",
      shortName: away.team?.abbreviation || away.team?.shortDisplayName || "AWAY"
    },
    homeCrest: home.team?.logo || "",
    awayCrest: away.team?.logo || "",
    utcDate: event.date || null,
    status,
    minute,
    stage: event.season?.name || "",
    homeScore,
    awayScore,
    score: {
      fullTime: {
        home: homeScore,
        away: awayScore
      }
    },
    venue: competition.venue?.fullName || "",
    matchStatus: statusInfo.detail || statusInfo.description || ""
  };
}

export const handler = async () => {
  try {
    const results = await Promise.allSettled(
      LEAGUES.map(async league => {
        const url = `${ESPN_URL}/${league.code}/scoreboard`;

        const response = await fetch(url, {
          headers: { Accept: "application/json" }
        });

        if (!response.ok) {
          throw new Error(
            `${league.name}: ESPN returned HTTP ${response.status}`
          );
        }

        const data = await response.json();

        return (data.events || [])
          .map(event => normalizeMatch(event, league))
          .filter(Boolean);
      })
    );

    const matches = results
      .filter(result => result.status === "fulfilled")
      .flatMap(result => result.value)
      .sort((a, b) => {
        const aLive = a.status === "IN_PLAY" ? 0 : 1;
        const bLive = b.status === "IN_PLAY" ? 0 : 1;

        if (aLive !== bLive) return aLive - bLive;

        return new Date(a.utcDate || 0) -
          new Date(b.utcDate || 0);
      });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=30"
      },
      body: JSON.stringify({
        source: "ESPN",
        matches,
        count: matches.length
      })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Unable to fetch ESPN football matches",
        matches: []
      })
    };
  }
};
