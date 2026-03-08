/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SymbolInfo, Ticker } from './bitgetService';

export interface ArbitrageRoute {
  path: [string, string, string, string]; // e.g., ['USDT', 'BTC', 'ETH', 'USDT']
  pairs: [string, string, string]; // e.g., ['BTCUSDT', 'ETHBTC', 'ETHUSDT']
  directions: [('BUY' | 'SELL'), ('BUY' | 'SELL'), ('BUY' | 'SELL')];
}

export const findArbitrageRoutes = (symbols: SymbolInfo[]): ArbitrageRoute[] => {
  const routes: ArbitrageRoute[] = [];
  const symbolMap = new Map<string, SymbolInfo>();
  const coinPairs = new Map<string, string[]>(); // coin -> [symbol, symbol, ...]

  symbols.forEach((s) => {
    if (s.status !== 'online') return;
    symbolMap.set(s.symbol, s);
    
    if (!coinPairs.has(s.baseCoin)) coinPairs.set(s.baseCoin, []);
    if (!coinPairs.has(s.quoteCoin)) coinPairs.set(s.quoteCoin, []);
    
    coinPairs.get(s.baseCoin)!.push(s.symbol);
    coinPairs.get(s.quoteCoin)!.push(s.symbol);
  });

  const coins = Array.from(coinPairs.keys());
  
  // To find a triangle (A, B, C):
  // 1. Pick a coin A.
  // 2. Find all pairs involving A. Let's say (A, B) exists via symbol S1.
  // 3. Find all pairs involving B. Let's say (B, C) exists via symbol S2.
  // 4. Check if a pair (C, A) exists via symbol S3.
  
  // Optimization: Only consider common base coins as the starting point to reduce search space.
  const startCoins = ['USDT', 'USDC', 'BTC', 'ETH'];
  
  startCoins.forEach(a => {
    if (!coinPairs.has(a)) return;
    
    const pairsA = coinPairs.get(a)!;
    
    pairsA.forEach(s1 => {
      const sym1 = symbolMap.get(s1)!;
      const b = sym1.baseCoin === a ? sym1.quoteCoin : sym1.baseCoin;
      
      const pairsB = coinPairs.get(b)!;
      
      pairsB.forEach(s2 => {
        if (s1 === s2) return;
        const sym2 = symbolMap.get(s2)!;
        const c = sym2.baseCoin === b ? sym2.quoteCoin : sym2.baseCoin;
        if (c === a) return;
        
        const pairsC = coinPairs.get(c)!;
        
        pairsC.forEach(s3 => {
          if (s3 === s1 || s3 === s2) return;
          const sym3 = symbolMap.get(s3)!;
          const d = sym3.baseCoin === c ? sym3.quoteCoin : sym3.baseCoin;
          
          if (d === a) {
            // Found a triangle (a, b, c, a)
            // Determine directions
            const directions: [('BUY' | 'SELL'), ('BUY' | 'SELL'), ('BUY' | 'SELL')] = [
              sym1.quoteCoin === a ? 'BUY' : 'SELL', // a -> b
              sym2.quoteCoin === b ? 'BUY' : 'SELL', // b -> c
              sym3.quoteCoin === c ? 'BUY' : 'SELL'  // c -> a
            ];
            
            routes.push({
              path: [a, b, c, a],
              pairs: [s1, s2, s3],
              directions
            });
          }
        });
      });
    });
  });

  // Remove duplicates (permutations of the same triangle)
  const uniqueRoutes: ArbitrageRoute[] = [];
  const seen = new Set<string>();
  
  routes.forEach(r => {
    const sortedPath = [...r.path.slice(0, 3)].sort().join('-');
    const key = `${sortedPath}-${r.path.join('->')}`;
    if (!seen.has(key)) {
      uniqueRoutes.push(r);
      seen.add(key);
    }
  });

  return uniqueRoutes;
};

export const calculateProfit = (
  route: ArbitrageRoute,
  tickers: Map<string, Ticker>,
  fee: number = 0.001,
  startAmount: number = 1.0
): { 
  profit: number; 
  prices: [number, number, number]; 
  amounts: [number, number, number, number];
} => {
  const amounts: [number, number, number, number] = [startAmount, 0, 0, 0];
  const prices: [number, number, number] = [0, 0, 0];
  let currentAmount = startAmount;
  
  for (let i = 0; i < 3; i++) {
    const pair = route.pairs[i];
    const direction = route.directions[i];
    const ticker = tickers.get(pair);
    
    if (!ticker) return { profit: -100, prices: [0, 0, 0], amounts: [startAmount, 0, 0, 0] };

    const ask = parseFloat(ticker.askPr);
    const bid = parseFloat(ticker.bidPr);

    if (direction === 'BUY') {
      currentAmount = (currentAmount / ask) * (1 - fee);
      prices[i] = ask;
    } else {
      currentAmount = (currentAmount * bid) * (1 - fee);
      prices[i] = bid;
    }
    amounts[i + 1] = currentAmount;
  }
  
  return {
    profit: ((currentAmount / startAmount) - 1) * 100,
    prices,
    amounts
  };
};
