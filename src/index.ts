/**
 * TBWLLM - Trading Bot with LLM
 * 
 * Main entry point for the trading bot application.
 */

console.log('🚀 TBWLLM - Trading Bot with LLM');
console.log('📊 Algorithmic Trading System initialized');
console.log('');
console.log('Available commands:');
console.log('  yarn backtest  - Run backtesting on historical data');
console.log('  yarn bot:paper - Start paper trading bot');
console.log('  yarn bot:webhook - Start webhook server for TradingView alerts');
console.log('');
console.log('Project structure created successfully! ✅');
console.log('Next steps:');
console.log('  1. Run: yarn install');
console.log('  2. Copy .env.example to .env and configure');
console.log('  3. Implement your first strategy');
console.log('  4. Run backtests');
console.log('  5. Start paper trading');

export * from './core/types';
export * from './core/indicators';

