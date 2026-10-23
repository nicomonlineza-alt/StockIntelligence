import type { VercelRequest, VercelResponse } from "@vercel/node";

const WATCHLIST = [
  "NVDA","AAPL","MSFT","AMZN","META","GOOGL","AVGO","TSLA","AMD","NFLX",
  "COST","LLY","JPM","ORCL","PLTR","CRM","QCOM","MU","INTC","ADBE"
];

type Quote = { symbol: string; name?: string; close?: string; price?: string; percent_change?: string; change?: string; volume?: string; datetime?: string; currency?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET." });
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return res.status(503).json({ error: "Market data is not configured yet. Add TWELVE_DATA_API_KEY in Vercel environment variables." });
  try {
    const results = await Promise.all(WATCHLIST.map(async (symbol) => {
      const url = new URL("https://api.twelvedata.com/quote");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", key);
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json() as Quote & { status?: string; message?: string };
      const price = Number(data.close ?? data.price);
      const changePct = Number(data.percent_change);
      if (data.status === "error" || !Number.isFinite(price) || price <= 0 || !Number.isFinite(changePct)) return null;
      return { symbol, name: data.name ?? symbol, price, changePct, change: Number(data.change ?? 0), volume: Number(data.volume ?? 0), datetime: data.datetime ?? new Date().toISOString(), currency: data.currency ?? "USD" };
    }));
    const valid = results.filter((x): x is NonNullable<typeof x> => x !== null);
    if (valid.length < 5) return res.status(502).json({ error: "Not enough valid quotes returned. Check the Twelve Data plan, symbols, and API key.", received: valid.length });
    // Transparent baseline ranking: positive daily momentum, with a modest liquidity preference.
    // This is a research heuristic, not a promise or a trained predictive model.
    const ranked = valid.map(q => ({ ...q, score: q.changePct + (q.volume > 0 ? Math.min(Math.log10(q.volume) - 5, 1) * 0.15 : 0) }))
      .sort((a, b) => b.score - a.score);
    return res.status(200).json({ picks: ranked.slice(0, 5), quotes: valid, universeSize: valid.length, asOf: new Date().toISOString(), method: "Daily percentage momentum with a small volume/liquidity adjustment", disclaimer: "Research simulation only. Positive momentum can reverse; this does not guarantee profit." });
  } catch {
    return res.status(502).json({ error: "Could not reach Twelve Data. Please try again shortly." });
  }
}