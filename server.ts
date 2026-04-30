import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let twseCache: any[] | null = null;
  let lastTwseFetch = 0;
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // API Route to proxy market data and bypass CORS
  app.get("/api/prices", async (req, res) => {
    const symbolsQuery = req.query.symbols as string || "";
    const requestedSymbols = symbolsQuery.split(',').filter(Boolean).map(s => s.trim().toUpperCase());

    try {
      const resultData: any[] = [];
      const commonHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      // 1. Fetch Taiwan Stocks (TWSE) with Cache
      const now = Date.now();
      if (!twseCache || (now - lastTwseFetch > CACHE_DURATION)) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
          const twseRes = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { 
            signal: controller.signal,
            headers: commonHeaders
          });
          clearTimeout(timeout);
          if (twseRes.ok) {
            twseCache = await twseRes.json();
            lastTwseFetch = now;
          }
        } catch (err) {
          console.error('TWSE fetch error:', err);
        }
      }
      
      if (twseCache) {
        resultData.push(...twseCache);
      }

      // 2. Fetch Bitcoin (BTC)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
        const btcRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { 
          signal: controller.signal,
          headers: commonHeaders 
        });
        clearTimeout(timeout);
        if (btcRes.ok) {
          const btcData: any = await btcRes.json();
          const btcPrice = btcData.price;
          resultData.push({ Code: 'BTC', ClosingPrice: btcPrice });
          resultData.push({ Code: 'BTC-USD', ClosingPrice: btcPrice });
          resultData.push({ Code: 'BITCOIN', ClosingPrice: btcPrice });
        }
      } catch (err) {
        console.error('BTC fetch error:', err);
      }

      // 3. Fetch US Stocks or specific symbols that aren't in TWSE
      const usSymbols = requestedSymbols.filter(s => 
        !resultData.find(t => t.Code === s) && 
        !['BTC', 'BTC-USD', 'BITCOIN'].includes(s)
      );

      const commonUS = ['GOOGL', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', '2002'];
      const toFetch = Array.from(new Set([...usSymbols, ...commonUS.filter(s => requestedSymbols.includes(s) || !requestedSymbols.length)]));

      const limitedFetches = toFetch.slice(0, 15);

      const usPromises = limitedFetches.map(async (s) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
          const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?interval=1d`, { 
            signal: controller.signal,
            headers: commonHeaders 
          });
          clearTimeout(timeout);
          if (response.ok) {
            const chart: any = await response.json();
            const price = chart.chart.result?.[0]?.meta?.regularMarketPrice;
            if (price) {
              return { Code: s, ClosingPrice: price.toString() };
            }
          }
        } catch (e) {
          return null;
        }
        return null;
      });

      const usResults = (await Promise.all(usPromises)).filter(Boolean);
      res.json([...resultData, ...usResults]);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
