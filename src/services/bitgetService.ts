/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';

const BITGET_API_BASE = 'https://api.bitget.com';

export interface SymbolInfo {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  minTradeAmount: string;
  maxTradeAmount: string;
  pricePrecision: string;
  quantityPrecision: string;
  status: string;
}

export interface Ticker {
  symbol: string;
  lastPr: string;
  bidPr: string;
  askPr: string;
  bidSz: string;
  askSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  ts: string;
}

export const fetchSymbols = async (): Promise<SymbolInfo[]> => {
  try {
    const response = await axios.get(`${BITGET_API_BASE}/api/v2/spot/public/symbols`, { 
      params: { productType: 'spot' },
      timeout: 10000 
    });
    if (response.data && response.data.code === '00000') {
      return response.data.data;
    }
    throw new Error(`Failed to fetch symbols: ${response.data?.msg || 'Unknown error'}`);
  } catch (error: any) {
    console.error('Error fetching symbols:', error.message);
    return [];
  }
};

export const fetchTickers = async (): Promise<Ticker[]> => {
  try {
    // For v2 tickers, productType is often required
    const response = await axios.get(`${BITGET_API_BASE}/api/v2/spot/market/tickers`, { 
      params: { productType: 'spot' },
      timeout: 10000 
    });
    if (response.data && response.data.code === '00000') {
      return response.data.data;
    }
    throw new Error(`Failed to fetch tickers: ${response.data?.msg || 'Unknown error'}`);
  } catch (error: any) {
    console.error('Error fetching tickers:', error.message);
    return [];
  }
};

export const BITGET_WS_URL = 'wss://ws.bitget.com/v2/ws/public';
