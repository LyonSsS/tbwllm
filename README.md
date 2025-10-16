# TBWLLM - Trading Bot with LLM

**Algorithmic Trading System with TypeScript + Python**

A production-grade algorithmic trading bot supporting multiple strategies, backtesting, and paper trading.

## 🎯 Features

- ✅ Pure functional core: `(candles, params) → signals`
- ✅ TypeScript for production bot (type-safe, fast)
- ✅ Python for research & backtesting (vectorbt, pandas)
- ✅ Multiple technical indicators (SMA, EMA, RSI, MACD, etc.)
- ✅ Backtesting engine with performance metrics
- ✅ Paper trading support (no real money)
- ✅ Exchange integration via ccxt (60+ exchanges)
- ✅ TradingView webhook support
- ✅ Docker deployment ready

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Yarn or npm
- Python 3.10+ (for backtesting/research)

### Installation

```bash
# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Run the project
yarn dev
```

## 📁 Project Structure

```
tbwllm/
├── src/
│   ├── core/              # Pure strategy logic
│   │   ├── types.ts       # Zod schemas
│   │   ├── indicators/    # Technical indicators
│   │   └── strategies/    # Trading strategies
│   ├── data/              # Data fetching
│   ├── backtest/          # Backtesting engine
│   ├── bot/               # Production bot
│   └── tests/             # Tests & fixtures
├── python/                # Python research environment
│   ├── research/          # Backtesting & optimization
│   └── core/              # Strategy implementations
├── config/                # Configuration files
└── action.md              # Detailed implementation guide
```

## 🛠️ Available Commands

```bash
# Development
yarn dev              # Run development server
yarn build            # Build for production
yarn test             # Run tests

# Trading
yarn backtest         # Run backtesting
yarn bot:paper        # Start paper trading bot
yarn bot:webhook      # Start webhook server (TradingView)
```

## 📊 Implemented Indicators

- **SMA** - Simple Moving Average
- **EMA** - Exponential Moving Average
- **RSI** - Relative Strength Index
- More coming soon...

## 📚 Documentation

See [action.md](./action.md) for the complete implementation guide with:
- Detailed architecture
- Step-by-step implementation phases
- Code examples
- Best practices
- Deployment guide

## ⚠️ Disclaimer

**This software is for educational purposes only.**

- Trading cryptocurrencies and financial instruments carries risk
- Past performance does not guarantee future results
- Always start with paper trading (no real money)
- Never risk more than you can afford to lose
- Use at your own risk

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📧 Contact

GitHub: [@LyonSsS](https://github.com/LyonSsS)

---

**Status**: 🚧 Work in Progress - Phase 1 Foundation

