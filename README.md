# Stock Intelligence

A Nasdaq-focused stock research dashboard for daily five-stock selection, saved entry prices, simulated profit/loss, and directional win-rate tracking. Built for research and paper trading only; it never submits orders.

## Features
- Dark research dashboard with five daily stock picks.
- Server-side Twelve Data quote integration; the API key is never exposed to browser code.
- Transparent baseline ranking: daily percentage momentum plus a small volume adjustment.
- Save daily picks and entry prices in browser local storage.
- Refresh and score saved picks against later quotes; view a session history and simulated net P/L.
- Responsive interface and demo fallback when live data is not configured.

## Run locally
1. Install Node.js 20 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `TWELVE_DATA_API_KEY`.
4. Run `npm run dev` for the Vite interface.

For local API routes, run with Vercel CLI (`vercel dev`) after installing the Vercel CLI. Plain Vite dev mode serves the interface but does not execute `/api/analyze`.

## Deploy to Vercel
1. Import this GitHub repository into Vercel.
2. Set environment variable `TWELVE_DATA_API_KEY` in Project Settings for Preview and Production.
3. Deploy. Vercel detects Vite and the `api/analyze.ts` serverless function.
4. Confirm live quotes are returned before relying on results.

## Method and limitations
The current selector is a simple momentum baseline, not a trained predictive AI model. It ranks the available watchlist using the quote's daily percentage change and a small volume adjustment. That can be a useful starting benchmark but does not predict future returns or guarantee profit. The current 20-symbol watchlist is in `api/analyze.ts`.

Scoring uses one hypothetical share per pick and compares the saved entry price to a refreshed quote. Commissions, spread, slippage, taxes, dividends and currency conversion are not included. Results are stored in the current browser only (local storage), so they are not yet synced across devices or users. The first version does not automatically run at market close or backtest on unseen historical data.

## Safety
Research and simulation only. No brokerage integration, credentials, or live trading functionality.
