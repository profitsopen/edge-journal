# EDGE. Trade Journal

A personal trading journal built with React + Vite.

## Local Development

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Vercel auto-detects Vite — just click Deploy
4. Done. Your site is live at `your-project.vercel.app`

## Features

- Dashboard with equity curve, daily P&L, win rate, profit factor
- Trade log with CSV import (Tradovate, Rithmic, NinjaTrader)
- Per-trade journal: setup tag, entry trigger, stop/target, exit reason, market context, screenshot link, grade (A-F), rule adherence
- Monthly calendar view with daily P&L intensity + daily review notes
- Playbook — create named setups that auto-populate stats from tagged trades
- All data persists in localStorage (stays in your browser, private)
