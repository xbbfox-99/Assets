export const COMMON_STOCK_MAP: Record<string, string> = {
  // 台股知名個股 & ETF
  '台積電': '2330',
  '鴻海': '2317',
  '聯發科': '2454',
  '台達電': '2308',
  '中鋼': '2002',
  '中鋼持股信託': '2002',
  '公提金': '2002',
  '中鴻': '2014',
  '元大台灣50': '0050',
  '台灣50': '0050',
  '凱基台灣TOP50': '009816',
  '00551L': '009816', // 舊筆誤代號對應至凱基台灣TOP50正確代號
  '元大高股息': '0056',
  '國泰永續高股息': '00878',
  '富邦台50': '006208',
  '復華台灣科技優息': '00929',
  '元大台灣價值高息': '00940',
  '元大美債20年': '00679B',
  '國泰20年美債': '00687B',
  '元太': '8069',
  '環球晶': '6488',
  '中美晶': '5483',
  '鈊象': '3293',

  // 美股與加密貨幣
  '比特幣': 'BTC',
  '以太幣': 'ETH',
  'GOOGLE': 'GOOGL',
  '谷歌': 'GOOGL',
  '蘋果': 'AAPL',
  '微軟': 'MSFT',
  '輝達': 'NVDA',
  '特斯拉': 'TSLA',
};

/**
 * 取得投資項目的有效查詢代號 (去除空白、後綴、容錯繁中名稱或筆誤代號)
 */
export function getEffectiveSymbol(item: { name?: string; symbol?: string }): string {
  if (item.symbol && item.symbol.trim()) {
    let s = item.symbol.trim().toUpperCase();
    if (s === '00551L') return '009816';
    if (s.endsWith('.TW')) s = s.replace(/\.TW$/, '');
    if (s.endsWith('.TWO')) s = s.replace(/\.TWO$/, '');
    return s;
  }

  // 若 symbol 為空，嘗試自名稱中推斷
  if (item.name) {
    const trimmedName = item.name.trim();

    // 1. 完全或部分匹配常用字典
    for (const [key, code] of Object.entries(COMMON_STOCK_MAP)) {
      if (trimmedName.includes(key) || key.includes(trimmedName)) {
        return code;
      }
    }

    // 2. 從名稱中提取 4-6 碼台股代號 (如 "2330 台積電" -> "2330")
    const match = trimmedName.match(/\b(\d{4,6}[A-Z]?)\b/i);
    if (match) {
      const code = match[1].toUpperCase();
      return code === '00551L' ? '009816' : code;
    }
  }

  return '';
}
