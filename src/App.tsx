import { useEffect, useMemo, useState } from "react";

type Pick = { symbol: string; name: string; price: number; changePct: number; change: number; volume?: number; datetime?: string; currency?: string; score?: number; demo?: boolean; pnl?: number; entryPrice?: number; currentPrice?: number; pnlPct?: number };
type Day = { date: string; picks: Pick[]; settled: boolean; closedAt?: string };
const DEMO: Pick[] = [
  {symbol:"NVDA",name:"NVIDIA",price:188.42,changePct:2.34,change:4.31,demo:true},
  {symbol:"AMD",name:"Advanced Micro Devices",price:218.15,changePct:1.91,change:4.09,demo:true},
  {symbol:"META",name:"Meta Platforms",price:712.6,changePct:1.36,change:9.56,demo:true},
  {symbol:"MSFT",name:"Microsoft",price:523.7,changePct:0.92,change:4.78,demo:true},
  {symbol:"AVGO",name:"Broadcom",price:342.8,changePct:0.74,change:2.51,demo:true}
];
const STORE = "stock-intelligence-v1";
const money = (v:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(v);
const pct = (v:number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
function readDays(): Day[] { try { const raw = localStorage.getItem(STORE); return raw ? JSON.parse(raw) as Day[] : []; } catch { return []; } }
export default function App() {
  const [days,setDays] = useState<Day[]>(readDays);
  const [picks,setPicks] = useState<Pick[]>([]);
  const [loading,setLoading] = useState(false);
  const [live,setLive] = useState(false);
  const [notice,setNotice] = useState("Demo preview loaded. Add your Twelve Data key to enable live market quotes.");
  const [universe,setUniverse] = useState(0);
  const [asOf,setAsOf] = useState("");
  const [tab,setTab] = useState<"overview"|"history">("overview");
  useEffect(()=>{ localStorage.setItem(STORE,JSON.stringify(days)); },[days]);
  const today = new Date().toLocaleDateString("en-CA");
  const todayRecord = days.find(d=>d.date===today);
  const activePicks = todayRecord?.picks ?? picks;
  const settled = todayRecord?.settled ?? false;
  const stats = useMemo(()=>{
    const closed = days.filter(d=>d.settled);
    const all = closed.flatMap(d=>d.picks);
    const pnl = all.reduce((s,p)=>s+(p.pnl ?? 0),0);
    const wins = all.filter(p=>(p.pnl ?? 0)>0).length;
    return {days:closed.length, trades:all.length, pnl, wins, accuracy:all.length ? wins/all.length*100 : 0};
  },[days]);
  async function selectPicks() {
    setLoading(true); setNotice("Scanning Nasdaq watchlist and ranking available quotes…");
    try {
      const response = await fetch("/api/analyze");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Live quote request failed.");
      const chosen: Pick[] = data.picks;
      setPicks(chosen); setLive(true); setUniverse(data.universeSize); setAsOf(data.asOf);
      setNotice(`Live quotes loaded from Twelve Data. Ranking method: ${data.method}.`);
    } catch (err) {
      setPicks(DEMO); setLive(false); setUniverse(20); setAsOf(new Date().toISOString());
      setNotice(`${err instanceof Error ? err.message : "Live data unavailable"} Showing illustrative demo prices — not live market data.`);
    } finally { setLoading(false); }
  }
  function savePicks() {
    if (activePicks.length !== 5) return;
    const record: Day = {date:today,picks:activePicks.map(p=>({...p,entryPrice:p.price, pnl:0} as Pick)),settled:false};
    setDays(prev=>[record,...prev.filter(d=>d.date!==today)]);
    setNotice("Today's five picks are saved. Return later and refresh quotes to score their simulated performance.");
  }
  async function refreshAndSettle() {
    setLoading(true);
    try {
      const response = await fetch("/api/analyze");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not refresh live quotes.");
      const latest = new Map<string,Pick>((data.quotes as Pick[]).map(p=>[p.symbol,p]));
      const existing = days.find(d=>d.date===today);
      if (!existing) throw new Error("Save today's five picks first.");
      const scored = existing.picks.map(p=>{
        const current = latest.get(p.symbol);
        if (!current) return p;
        const entry = (p as Pick & {entryPrice?:number}).entryPrice ?? p.price;
        return {...p, currentPrice:current.price, pnl:current.price-entry, pnlPct:(current.price/entry-1)*100};
      });
      const record: Day = {...existing,picks:scored,settled:true,closedAt:new Date().toISOString()};
      setDays(prev=>[record,...prev.filter(d=>d.date!==today)]);
      setNotice("Score updated using refreshed live quotes. This is a simple paper-trading mark, not a broker execution.");
    } catch(err) { setNotice(err instanceof Error ? err.message : "Could not settle scores."); }
    finally { setLoading(false); }
  }
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">S<span>i</span></span><span>STOCK<span className="brand-light">INTELLIGENCE</span><small>RESEARCH LAB / NASDAQ</small></span></a><div className="top-right"><span className="live-dot"/><span>{live ? "LIVE DATA CONNECTED" : "PAPER-TRADING MODE"}</span><span className="avatar">SI</span></div></header>
    <section className="hero"><div><div className="eyebrow"><span className="pulse"/> AI MARKET RESEARCH · PART A</div><h1>Find the signal.<br/><em>Track the outcome.</em></h1><p className="hero-copy">A disciplined daily stock-selection experiment. Pick five Nasdaq stocks, record the entry prices, then measure what actually happened.</p><div className="hero-actions"><button className="primary" onClick={selectPicks} disabled={loading}>{loading ? <><span className="spinner"/> Analysing…</> : "↗  Analyse & pick 5 stocks"}</button><span className="tiny-note">Research only · No real orders</span></div></div><div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core"><span>SI</span><small>MARKET<br/>ENGINE</small></div><div className="float-chip chip-a"><b>05</b><span>DAILY PICKS</span></div><div className="float-chip chip-b"><b>24/7</b><span>DATA-LED</span></div><div className="float-chip chip-c"><span className="up-arrow">↗</span><span>MOMENTUM<br/>SIGNALS</span></div></div></section>
    <div className="notice"><span>ⓘ</span><p>{notice}</p></div>
    <section className="stat-grid"><article className="stat-card"><span>SIMULATED NET P/L</span><strong className={stats.pnl>=0?"positive":"negative"}>{stats.pnl>=0?"+":""}{money(stats.pnl)}</strong><small>From scored picks only</small></article><article className="stat-card"><span>DIRECTIONAL WIN RATE</span><strong>{stats.trades ? stats.accuracy.toFixed(1)+"%" : "—"}</strong><small>{stats.wins} winning picks · {stats.trades} scored</small></article><article className="stat-card"><span>SESSIONS SCORED</span><strong>{stats.days}</strong><small>Daily records retained here</small></article><article className="stat-card"><span>ACTIVE WATCHLIST</span><strong>{universe || "20"}</strong><small>Nasdaq candidates scanned</small></article></section>
    <div className="section-head"><div><div className="eyebrow">THE DAILY SHORTLIST</div><h2>Today's five picks<span className="green-dot">.</span></h2></div><div className="tabs"><button className={tab==="overview"?"selected":""} onClick={()=>setTab("overview")}>Overview</button><button className={tab==="history"?"selected":""} onClick={()=>setTab("history")}>Score history</button></div></div>
    {tab==="overview" ? <><div className="table-wrap"><table><thead><tr><th># / ASSET</th><th>LAST PRICE</th><th>DAY CHANGE</th><th>ANALYST SIGNAL</th><th>SIMULATED P/L</th></tr></thead><tbody>{activePicks.length ? activePicks.map((p,i)=><tr key={p.symbol}><td><div className="asset"><span className="rank">{String(i+1).padStart(2,"0")}</span><span className="ticker">{p.symbol}<small>{p.name}</small></span></div></td><td className="price">{money(p.price)}</td><td className={(p.changePct??0)>=0?"positive":"negative"}>{pct(p.changePct??0)}</td><td><span className="signal"><span/> {p.demo?"DEMO SIGNAL":"MOMENTUM"}</span></td><td>{todayRecord?.settled ? <span className={(p.pnl??0)>=0?"positive":"negative"}>{(p.pnl??0)>=0?"+":""}{money(p.pnl??0)}</span> : <span className="muted">Pending</span>}</td></tr>) : <tr><td colSpan={5} className="empty">Select “Analyse & pick 5 stocks” to generate today's shortlist.</td></tr>}</tbody></table></div><div className="action-row"><div className="asof">{asOf ? `Quote scan: ${new Date(asOf).toLocaleString()}` : "Waiting for first analysis"}<br/><span>Demo values are illustrative; live data requires a configured API key.</span></div><div className="buttons"><button className="secondary" onClick={savePicks} disabled={activePicks.length!==5||!!todayRecord}>＋ Save today's picks</button><button className="primary compact" onClick={refreshAndSettle} disabled={loading||!todayRecord||settled}>{loading?"Refreshing…":"Refresh & score ↗"}</button></div></div><p className="fineprint">Scoring compares each saved entry price with the latest available quote. One share per pick is assumed; commissions, spreads, taxes and slippage are excluded. Results are not investment advice.</p></> : <div className="history">{days.length ? days.map(d=><article className="history-card" key={d.date}><div><strong>{d.date}</strong><small>{d.picks.map(p=>p.symbol).join(" · ")}</small></div><div className="history-result">{d.settled ? <><strong className={(d.picks.reduce((s,p)=>s+(p.pnl??0),0))>=0?"positive":"negative"}>{d.picks.reduce((s,p)=>s+(p.pnl??0),0)>=0?"+":""}{money(d.picks.reduce((s,p)=>s+(p.pnl??0),0))}</strong><small>SIMULATED P/L</small></> : <span className="pending">PENDING SCORE</span>}</div></article>) : <div className="empty history-empty">No saved sessions yet. Generate and save your first five picks.</div>}</div>}
    <section className="method"><div><div className="eyebrow">HOW THE ENGINE THINKS</div><h2>Measure first.<br/><em>Improve with evidence.</em></h2></div><div className="method-steps"><article><span>01</span><div><strong>Scan the universe</strong><p>Read quotes from a fixed Nasdaq-focused watchlist and skip invalid responses.</p></div></article><article><span>02</span><div><strong>Rank five candidates</strong><p>Use daily percentage momentum with a small volume adjustment. It is a transparent baseline, not a trained AI prediction model.</p></div></article><article><span>03</span><div><strong>Keep score</strong><p>Store daily picks and entry prices in this browser, then compare with refreshed prices to track win rate and simulated P/L.</p></div></article></div></section>
    <footer><span>STOCK INTELLIGENCE <b>·</b> RESEARCH LAB</span><span>Built for learning. Not financial advice. No live trading.</span></footer>
  </main>;
}