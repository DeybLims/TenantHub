const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbz17asvx2Gnydy5pP3POrG72pI7lmPRoyvLrLoRxdE-sK6pMFEcu4bEV96IehqR3MEu/exec";

export async function fetchFromSheets(
  action: string,
  params?: Record<string, string>,
): Promise<unknown> {
  const url = new URL(GOOGLE_APPS_SCRIPT_URL);
  url.searchParams.set("action", action);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Sheets API returned ${response.status}`);
  }

  const raw = await response.text();

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    const preview = raw.trim().slice(0, 120);
    if (preview === "API Active") {
      throw new Error(
        "Sheets API is active but did not return JSON. Check your Apps Script deployment.",
      );
    }
    throw new Error(`Expected JSON from Sheets API but received: "${preview}"`);
  }
}
