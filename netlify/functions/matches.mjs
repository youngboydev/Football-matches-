
export default async (request) => {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    return Response.json(
      { error: "API token is not configured on Netlify." },
      { status: 500 }
    );
  }

  try {
    const url = new URL(
      "https://api.football-data.org/v4/matches"
    );

    // Today's matches, using UTC dates.
    const today = new Date().toISOString().slice(0, 10);
    url.searchParams.set("dateFrom", today);
    url.searchParams.set("dateTo", today);

    const apiResponse = await fetch(url, {
      headers: {
        "X-Auth-Token": token
      }
    });

    if (!apiResponse.ok) {
      console.error(
        "Football API returned status:",
        apiResponse.status
      );

      return Response.json(
        {
          error:
            apiResponse.status === 429
              ? "API request limit reached."
              : apiResponse.status === 403
              ? "Your plan may not allow this data."
              : apiResponse.status === 401
              ? "Invalid API token."
              : "Football data provider error."
        },
        { status: apiResponse.status === 429 ? 429 : 502 }
      );
    }

    const data = await apiResponse.json();

    return Response.json(
      {
        matches: data.matches || [],
        count: (data.matches || []).length,
        updatedAt: new Date().toISOString()
      },
      {
        headers: {
          "Cache-Control": "public, max-age=30"
        }
      }
    );
  } catch (error) {
    console.error("Matches function error:", error);

    return Response.json(
      { error: "Unable to fetch football matches." },
      { status: 502 }
    );
  }
};
