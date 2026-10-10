export const handler = async () => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    const apiKey = process.env.FOOTBALL_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Football API key is not configured on Netlify."
        })
      };
    }

    const response = await fetch(
      "https://api.football-data.org/v4/matches",
      {
        method: "GET",
        headers: {
          "X-Auth-Token": apiKey
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: "The football API request failed.",
          details: data.message || "Check your API key and API access."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: data.matches?.length || 0,
        matches: data.matches || []
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Unable to fetch football matches.",
        details: error.message
      })
    };
  }
};