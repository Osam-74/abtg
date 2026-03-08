# Bitget Arbitrage Dashboard

A real-time arbitrage opportunity scanner for Bitget Spot markets.

## Features

- **Real-time Scanning**: Automatically polls Bitget Spot API for the latest prices and tickers.
- **Arbitrage Path Calculation**: Identifies triangular arbitrage opportunities across different base pairs (USDT, USDC, BTC, ETH, BGB).
- **Profit Filtering**: Filter to show only profitable opportunities above a set threshold.
- **Interactive UI**: Built with React, Tailwind CSS, and Motion for a smooth, modern experience.
- **Data Visualization**: Profit distribution charts using Recharts.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS 4
- **Animations**: Motion (formerly Framer Motion)
- **Icons**: Lucide React
- **Charts**: Recharts
- **API Client**: Axios

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd bitget-arbitrage
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Deployment

#### Vercel

This project is ready for deployment on Vercel.

1. Push your code to a GitHub repository.
2. Connect your GitHub repository to Vercel.
3. Vercel will automatically detect the Vite project and use the following settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. If you use any environment variables, add them in the Vercel project settings.

#### GitHub Pages

To deploy to GitHub Pages, you can use the `gh-pages` package or a GitHub Action.

## License

SPDX-License-Identifier: Apache-2.0
