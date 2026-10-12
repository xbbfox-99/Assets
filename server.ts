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
    const symbolsQuery = (req.query.symbols as string) || "";
    const rawSymbols = symbolsQuery.split(',').filter(Boolean).map(s => s.trim());

    // Well-known alias mapping to standard codes
    const ALIAS_MAP: Record<string, string> = {
      '00551L': '009816', // 凱基台灣TOP50
      '凱基台灣TOP50': '009816',
      '台積電': '2330',
      '中鋼': '2002',
      '中鋼持股信託': '2002',
      '公提金': '2002',
      '中鴻': '2014',
      '台達電': '2308',
      '聯發科': '2454',
      '鴻海': '2317',
      '元大台灣50': '0050',
      '台灣50': '0050',
      '元大高股息': '0056',
      '國泰永續高股息': '00878',
      '富邦台50': '006208',
      '元太': '8069',
      '環球晶': '6488',
      '中美晶': '5483',
      '鈊象': '3293',
      '比特幣': 'BTC',
      '以太幣': 'ETH',
      'GOOGLE': 'GOOGL',
      '谷歌': 'GOOGL',
      '蘋果': 'AAPL',
      '微軟': 'MSFT',
      '輝達': 'NVDA',
      '特斯拉': 'TSLA',
    };

    const requestedSymbols = Array.from(new Set(rawSymbols.flatMap(raw => {
      const upper = raw.toUpperCase().trim();
      const cleaned = upper.replace(/\.(TW|TWO)$/i, '');
      const mapped = ALIAS_MAP[raw] || ALIAS_MAP[upper] || ALIAS_MAP[cleaned];
      return [upper, cleaned, mapped].filter(Boolean) as string[];
    })));

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
          const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout
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
      
      if (twseCache && Array.isArray(twseCache)) {
        resultData.push(...twseCache);

        // Also index by Name and handle aliases for convenience
        twseCache.forEach((item: any) => {
          if (item.Name && item.ClosingPrice) {
            resultData.push({ Code: item.Name.trim(), ClosingPrice: item.ClosingPrice });
          }
          if (item.Code === '009816') {
            resultData.push({ Code: '00551L', ClosingPrice: item.ClosingPrice });
            resultData.push({ Code: '凱基台灣TOP50', ClosingPrice: item.ClosingPrice });
          }
        });
      }

      // 2. Fetch Bitcoin (BTC) & Crypto
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
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
          resultData.push({ Code: '比特幣', ClosingPrice: btcPrice });
        }
      } catch (err) {
        console.error('BTC fetch error:', err);
      }

      // 3. Fetch US Stocks, OTC/TPEx stocks, or anything missing from TWSE via Yahoo Finance
      const foundCodes = new Set(resultData.map(t => String(t.Code).toUpperCase()));
      const missingSymbols = requestedSymbols.filter(s => 
        !foundCodes.has(s.toUpperCase()) && 
        !['BTC', 'BTC-USD', 'BITCOIN', '比特幣'].includes(s.toUpperCase())
      );

      const commonDefaults = ['GOOGL', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', '2002', '009816'];
      const toFetch = Array.from(new Set([...missingSymbols, ...commonDefaults.filter(s => requestedSymbols.includes(s) || !requestedSymbols.length)]));
      const limitedFetches = toFetch.slice(0, 20);

      const yahooPromises = limitedFetches.map(async (sym) => {
        const clean = sym.trim().toUpperCase();
        // Generate potential candidates for Yahoo Finance
        const candidates = [clean];
        if (/^\d{4,6}[A-Z]?$/.test(clean)) {
          candidates.push(`${clean}.TW`, `${clean}.TWO`);
        } else if (!clean.includes('.')) {
          candidates.push(`${clean}-USD`);
        }

        for (const candidate of candidates) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(candidate)}?interval=1d`, { 
              signal: controller.signal,
              headers: commonHeaders 
            });
            clearTimeout(timeout);
            if (response.ok) {
              const chart: any = await response.json();
              const price = chart.chart?.result?.[0]?.meta?.regularMarketPrice;
              if (price != null && !isNaN(price)) {
                const priceStr = price.toString();
                const matchedResults = [{ Code: clean, ClosingPrice: priceStr }];
                if (clean === '009816') {
                  matchedResults.push({ Code: '00551L', ClosingPrice: priceStr });
                  matchedResults.push({ Code: '凱基台灣TOP50', ClosingPrice: priceStr });
                }
                return matchedResults;
              }
            }
          } catch (e) {
            // Continue to next candidate
          }
        }
        return null;
      });

      const yahooResults = (await Promise.all(yahooPromises)).filter(Boolean).flat() as any[];
      res.json([...resultData, ...yahooResults]);
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
