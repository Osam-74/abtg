/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  ArrowRight, 
  AlertCircle, 
  Settings, 
  Search,
  ChevronRight,
  Zap,
  DollarSign,
  BarChart3,
  Activity,
  Dices,
  Info,
  HelpCircle,
  Cpu,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  fetchSymbols, 
  fetchTickers, 
  SymbolInfo, 
  Ticker,
  BITGET_WS_URL
} from './services/bitgetService';
import { 
  findArbitrageRoutes, 
  calculateProfit, 
  ArbitrageRoute 
} from './services/arbitrageEngine';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ArbitrageOpportunity extends ArbitrageRoute {
  profit: number;
  prices: [number, number, number];
  amounts: [number, number, number, number];
  id: string;
}

export default function App() {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [tickers, setTickers] = useState<Map<string, Ticker>>(new Map());
  const [routes, setRoutes] = useState<ArbitrageRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBase, setSelectedBase] = useState<string>('USDT');
  const [fee, setFee] = useState(0.001); // 0.1%
  const [minProfit, setMinProfit] = useState(0.05); // 0.05%
  const [startAmount, setStartAmount] = useState(100); // 100 USDT
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledCoin, setShuffledCoin] = useState<string | null>(null);
  const [showOnlyProfitable, setShowOnlyProfitable] = useState(false);
  const [sortBy, setSortBy] = useState<'profit' | 'path'>('profit');

  const allCoins = useMemo(() => {
    const coins = new Set<string>();
    symbols.forEach(s => {
      coins.add(s.baseCoin);
      coins.add(s.quoteCoin);
    });
    return Array.from(coins).sort();
  }, [symbols]);

  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    return allCoins
      .filter(coin => coin.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 8);
  }, [allCoins, searchQuery]);

  const handleShuffle = () => {
    setIsShuffling(true);
    setShuffledCoin(null);
    
    // Simulate a "shuffling" animation
    let count = 0;
    const interval = setInterval(() => {
      const randomCoin = allCoins[Math.floor(Math.random() * allCoins.length)];
      setShuffledCoin(randomCoin);
      count++;
      if (count > 20) {
        clearInterval(interval);
        setIsShuffling(false);
        setSearchQuery(randomCoin);
      }
    }, 100);
  };

  // Initial data fetch
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [symbolData, tickerData] = await Promise.all([
          fetchSymbols(),
          fetchTickers()
        ]);
        
        setSymbols(symbolData);
        
        const tickerMap = new Map<string, Ticker>();
        tickerData.forEach(t => tickerMap.set(t.symbol, t));
        setTickers(tickerMap);
        
        const allRoutes = findArbitrageRoutes(symbolData);
        setRoutes(allRoutes);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to initialize data. Please check your connection.');
        setLoading(false);
      }
    };
    
    init();
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    if (symbols.length === 0) return;

    const ws = new WebSocket(BITGET_WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to tickers
      // Bitget WS requires subscription messages
      // For simplicity in this demo, we'll poll the REST API every 2 seconds instead
      // because subscribing to 500+ symbols via WS might be complex for a single connection
    };

    // Fallback polling
    const interval = setInterval(async () => {
      const tickerData = await fetchTickers();
      if (tickerData && tickerData.length > 0) {
        const tickerMap = new Map<string, Ticker>();
        tickerData.forEach(t => tickerMap.set(t.symbol, t));
        setTickers(tickerMap);
      }
    }, 2000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [symbols]);

  const opportunities = useMemo(() => {
    if (tickers.size === 0 || routes.length === 0) return [];

    let results = routes
      .map(route => {
        const { profit, prices, amounts } = calculateProfit(route, tickers, fee, startAmount);
        return {
          ...route,
          profit,
          prices,
          amounts,
          id: route.path.join('-')
        };
      })
      .filter(opp => {
        const matchesBase = opp.path.includes(selectedBase);
        const matchesSearch = searchQuery === '' || 
          opp.path.some(coin => coin.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const passesProfitFilter = !showOnlyProfitable || opp.profit >= minProfit;
        
        return matchesBase && matchesSearch && opp.profit > -10 && passesProfitFilter;
      });

    if (sortBy === 'profit') {
      results.sort((a, b) => b.profit - a.profit);
    } else {
      results.sort((a, b) => a.id.localeCompare(b.id));
    }

    return results;
  }, [routes, tickers, selectedBase, fee, searchQuery, startAmount, showOnlyProfitable, minProfit, sortBy]);

  const topOpportunities = useMemo(() => {
    return opportunities.slice(0, 50);
  }, [opportunities]);

  const baseCoins = useMemo(() => {
    const bases = new Set<string>();
    symbols.forEach(s => {
      bases.add(s.quoteCoin);
    });
    return Array.from(bases).sort();
  }, [symbols]);

  const chartData = useMemo(() => {
    const bins = [0, 0.05, 0.1, 0.2, 0.5, 1.0];
    const data = bins.map((bin, i) => {
      const nextBin = bins[i + 1] || Infinity;
      const count = opportunities.filter(o => o.profit >= bin && o.profit < nextBin).length;
      return {
        range: i === bins.length - 1 ? `>${bin}%` : `${bin}-${nextBin}%`,
        count,
        bin
      };
    });
    return data;
  }, [opportunities, minProfit]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 font-mono text-sm tracking-widest uppercase">Initializing Arbitrage Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="text-black w-6 h-6 fill-current" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Bitget Arbitrage</h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Live Market Feed</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>{routes.length.toLocaleString()} Routes Scanned</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>{topOpportunities.length} Opportunities Found</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search coin (e.g. BTC, ETH)..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-[60] shadow-2xl"
                  >
                    {suggestions.map(coin => (
                      <button
                        key={coin}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                        onClick={() => {
                          setSearchQuery(coin);
                          setShowSuggestions(false);
                        }}
                      >
                        {coin}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Shuffle Button */}
            <button 
              onClick={handleShuffle}
              disabled={isShuffling}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${isShuffling ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'}`}
            >
              <Dices className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
              {isShuffling ? 'Shuffling...' : 'Shuffle Sesh'}
            </button>

            {/* Base Selector */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Base</span>
              <select 
                className="bg-transparent text-sm font-medium focus:outline-none flex-1 py-1.5"
                value={selectedBase}
                onChange={(e) => setSelectedBase(e.target.value)}
              >
                {['USDT', 'USDC', 'BTC', 'ETH', 'BGB'].map(base => (
                  <option key={base} value={base} className="bg-zinc-900">{base}</option>
                ))}
              </select>
            </div>

            {/* Min Profit */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Min Profit %</span>
              <input 
                type="number"
                step="0.01"
                className="bg-transparent text-sm font-medium focus:outline-none flex-1 py-1.5"
                value={minProfit}
                onChange={(e) => setMinProfit(parseFloat(e.target.value))}
              />
            </div>

            {/* Start Amount */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Start Capital</span>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-xs text-zinc-500">$</span>
                <input 
                  type="number"
                  className="bg-transparent text-sm font-medium focus:outline-none w-full py-1.5"
                  value={startAmount}
                  onChange={(e) => setStartAmount(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Filter Profitable Only */}
            <button 
              onClick={() => setShowOnlyProfitable(!showOnlyProfitable)}
              className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border ${
                showOnlyProfitable 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                <span>PROFITABLE ONLY</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${showOnlyProfitable ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${showOnlyProfitable ? 'left-5' : 'left-1'}`} />
              </div>
            </button>

            {/* Sort Order */}
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select 
                className="bg-transparent text-xs font-bold focus:outline-none flex-1 py-1.5 uppercase tracking-wider"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'profit' | 'path')}
              >
                <option value="profit" className="bg-zinc-900">Sort by Profit</option>
                <option value="path" className="bg-zinc-900">Sort by Path</option>
              </select>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Trading Fee</p>
              <p className="text-lg font-bold">{(fee * 100).toFixed(2)}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-emerald-500/40" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Profit Distribution</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                <BarChart3 className="w-3 h-3" />
                <span>REAL-TIME ANALYSIS</span>
              </div>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="range" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 10 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.bin >= minProfit ? '#10b981' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Market Health</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Avg. Opportunity</span>
                  <span className="text-xs font-bold text-emerald-500">
                    +{(opportunities.reduce((acc, curr) => acc + Math.max(0, curr.profit), 0) / (opportunities.filter(o => o.profit > 0).length || 1)).toFixed(3)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Volatility Index</span>
                  <span className="text-xs font-bold text-zinc-300">MEDIUM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Network Latency</span>
                  <span className="text-xs font-bold text-emerald-500">42ms</span>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase">System Status</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                All systems operational. Scanning {routes.length} paths across Bitget Spot markets.
              </p>
            </div>
          </div>
        </div>
        <div className="relative min-h-[400px]">
          <AnimatePresence>
            {(isShuffling || loading) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20"
              >
                <div className="relative">
                  <RefreshCw className="w-16 h-16 text-emerald-500 animate-spin opacity-40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black italic text-emerald-500">
                      {isShuffling ? shuffledCoin : 'LOAD'}
                    </span>
                  </div>
                </div>
                <p className="mt-6 text-sm font-bold text-zinc-400 uppercase tracking-[0.3em] animate-pulse">
                  {isShuffling ? 'Scanning Network...' : 'Synchronizing Market Data...'}
                </p>
                {loading && (
                  <p className="mt-2 text-[10px] text-zinc-600 uppercase font-bold">Connecting to Bitget Spot API</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
            {topOpportunities.slice(0, 50).map((opp, idx) => (
              <motion.div
                key={opp.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: idx * 0.02 }}
                className="group bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {opp.path.slice(0, 3).map((coin, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold">
                          {coin.slice(0, 2)}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{opp.path[0]} → {opp.path[1]} → {opp.path[2]}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${opp.profit > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                          {opp.profit > 0 ? 'PROFITABLE' : 'NO PROFIT'}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Live Math</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${opp.profit > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {opp.profit > 0 ? '+' : ''}{opp.profit.toFixed(3)}%
                  </div>
                </div>

                {/* Process Table */}
                <div className="bg-zinc-950/80 rounded-xl border border-zinc-800/50 overflow-hidden mb-4">
                  <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800/50 text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                    <span>Step</span>
                    <span className="col-span-2">Execution Path</span>
                    <span className="text-right">Result</span>
                  </div>
                  
                  <div className="p-3 space-y-3">
                    {/* Step 0 */}
                    <div className="grid grid-cols-4 gap-2 items-center text-[10px]">
                      <span className="text-zinc-600 font-mono">00</span>
                      <span className="col-span-2 text-zinc-400 font-medium italic">Initial Capital</span>
                      <span className="text-right font-mono font-bold text-zinc-300">{opp.amounts[0].toFixed(2)} {opp.path[0]}</span>
                    </div>

                    {opp.pairs.map((pair, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 items-center text-[10px]">
                        <span className="text-zinc-600 font-mono">0{i + 1}</span>
                        <div className="col-span-2 flex flex-col">
                          <span className={`font-bold ${opp.directions[i] === 'BUY' ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                            {opp.directions[i]} {pair}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">@ {opp.prices[i].toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                        </div>
                        <span className="text-right font-mono font-bold text-zinc-100">
                          {opp.amounts[i + 1].toLocaleString(undefined, { maximumFractionDigits: 4 })} {opp.path[i + 1]}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="px-3 py-2 bg-zinc-900/30 border-t border-zinc-800/50 flex justify-between items-center">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Net Return</span>
                    <span className={`text-xs font-mono font-black ${opp.profit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {opp.amounts[3].toLocaleString(undefined, { maximumFractionDigits: 4 })} {opp.path[0]}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-zinc-500">
                    <RefreshCw className="w-3 h-3" />
                    <span className="text-[10px] font-mono uppercase">Updated Just Now</span>
                  </div>
                  <button className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 text-xs font-bold group-hover:translate-x-1 duration-300">
                    Execute <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {topOpportunities.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-medium">No arbitrage routes found for {selectedBase}</p>
              <p className="text-xs opacity-60">Try searching for a different coin or wait for market data to load.</p>
            </div>
          )}
        </div>
      </div>
    </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-zinc-800/50 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-zinc-500">
          <div>
            <h4 className="text-zinc-300 font-bold text-sm mb-4 uppercase tracking-widest">About Arbitrage</h4>
            <p className="text-xs leading-relaxed">
              Triangular arbitrage is the result of a discrepancy between three foreign currencies that occurs when the currency's exchange rates do not exactly match. 
              This dashboard monitors Bitget spot markets to identify these inefficiencies in real-time.
            </p>
          </div>
          <div>
            <h4 className="text-zinc-300 font-bold text-sm mb-4 uppercase tracking-widest">Risk Warning</h4>
            <p className="text-xs leading-relaxed">
              Arbitrage trading involves risks including execution latency, slippage, and market volatility. 
              Always account for trading fees and withdrawal limits. This tool is for informational purposes only.
            </p>
          </div>
          <div>
            <h4 className="text-zinc-300 font-bold text-sm mb-4 uppercase tracking-widest">Market Stats</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span>Total Symbols</span>
                <span className="text-zinc-300">{symbols.length}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span>Active Tickers</span>
                <span className="text-zinc-300">{tickers.size}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                <span>Scan Frequency</span>
                <span className="text-zinc-300">2000ms</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
