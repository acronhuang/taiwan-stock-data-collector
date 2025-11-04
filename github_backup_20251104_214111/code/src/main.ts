import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as hbs from 'hbs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 設置視圖引擎
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(process.cwd(), 'views'));
  app.setViewEngine('hbs');
  
  // 註冊 Handlebars 輔助函數
  registerHandlebarsHelpers();
  
  await app.listen(3000);
  console.log('🚀 應用程式已啟動於 http://localhost:3000');
  console.log('📊 管理面板: http://localhost:3000/admin/fetch-data');
  console.log('📊 技術分析: http://localhost:3000/analysis');
}

function registerHandlebarsHelpers() {
  // 數學運算
  hbs.registerHelper('add', (a, b) => a + b);
  hbs.registerHelper('subtract', (a, b) => a - b);
  hbs.registerHelper('multiply', (a, b) => a * b);
  hbs.registerHelper('divide', (a, b) => b !== 0 ? a / b : 0);
  
  // 比較運算
  hbs.registerHelper('gt', (a, b) => a > b);
  hbs.registerHelper('gte', (a, b) => a >= b);
  hbs.registerHelper('lt', (a, b) => a < b);
  hbs.registerHelper('lte', (a, b) => a <= b);
  hbs.registerHelper('eq', (a, b) => a === b);
  hbs.registerHelper('neq', (a, b) => a !== b);
  
  // 邏輯運算
  hbs.registerHelper('and', (...args) => {
    const options = args.pop();
    return args.every(Boolean);
  });
  hbs.registerHelper('or', (...args) => {
    const options = args.pop();
    return args.some(Boolean);
  });
  hbs.registerHelper('not', (value) => !value);
  
  // JSON處理
  hbs.registerHelper('json', (obj) => JSON.stringify(obj));
  
  // 條件渲染
  hbs.registerHelper('unless', function(conditional, options) {
    if (!conditional) {
      return options.fn(this);
    }
    return options.inverse(this);
  });
  
  // 格式化函數
  hbs.registerHelper('formatNumber', (num) => {
    if (typeof num !== 'number') return num;
    return num.toLocaleString();
  });
  
  hbs.registerHelper('formatPercent', (num) => {
    if (typeof num !== 'number') return num;
    return (num * 100).toFixed(2) + '%';
  });
  
  hbs.registerHelper('formatCurrency', (num) => {
    if (typeof num !== 'number') return num;
    return '$' + num.toLocaleString();
  });
  
  hbs.registerHelper('formatVolume', (volume) => {
    if (typeof volume !== 'number') return volume;
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toLocaleString();
  });
  
  hbs.registerHelper('formatBillion', (value) => {
    if (typeof value !== 'number') return value;
    return (value / 100000000).toFixed(2);
  });
  
  hbs.registerHelper('formatAmount', (amount) => {
    if (typeof amount !== 'number') return amount;
    return (amount / 1000).toFixed(0);
  });
  
  // 技術分析相關
  hbs.registerHelper('getRecommendationClass', (recommendation) => {
    switch(recommendation) {
      case 'strong_buy': return 'text-green-600';
      case 'buy': return 'text-blue-600';
      case 'hold': return 'text-yellow-600';
      case 'sell': return 'text-orange-600';
      case 'strong_sell': return 'text-red-600';
      default: return 'text-gray-600';
    }
  });
  
  hbs.registerHelper('getRecommendationText', (recommendation) => {
    switch(recommendation) {
      case 'strong_buy': return '強烈買進';
      case 'buy': return '買進';
      case 'hold': return '持有';
      case 'sell': return '賣出';
      case 'strong_sell': return '強烈賣出';
      default: return '-';
    }
  });
  
  hbs.registerHelper('getTrendClass', (trend) => {
    switch(trend) {
      case 'upward': return 'text-green-600';
      case 'downward': return 'text-red-600';
      case 'sideways': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  });
  
  hbs.registerHelper('getTrendText', (trend) => {
    switch(trend) {
      case 'upward': return '上升';
      case 'downward': return '下降';
      case 'sideways': return '盤整';
      default: return '-';
    }
  });
  
  hbs.registerHelper('getRSIClass', (rsi) => {
    if (rsi >= 70) return 'text-red-600';
    if (rsi <= 30) return 'text-green-600';
    return 'text-blue-600';
  });
  
  hbs.registerHelper('getRSIText', (rsi) => {
    if (rsi >= 70) return '超買';
    if (rsi <= 30) return '超賣';
    return '正常';
  });
  
  hbs.registerHelper('getKDClass', (kValue, dValue) => {
    if (kValue > dValue && kValue < 80) return 'bg-green-100 text-green-800';
    if (kValue < dValue && kValue > 20) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  });
  
  hbs.registerHelper('getKDText', (kValue, dValue) => {
    if (kValue > dValue && kValue < 80) return '黃金交叉';
    if (kValue < dValue && kValue > 20) return '死亡交叉';
    return '盤整';
  });
  
  hbs.registerHelper('getBollingerClass', (price, upper, lower) => {
    if (price >= upper) return 'bg-red-100 text-red-800';
    if (price <= lower) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  });
  
  hbs.registerHelper('getBollingerText', (price, upper, lower) => {
    if (price >= upper) return '接近上軌';
    if (price <= lower) return '接近下軌';
    return '中軌區間';
  });
  
  hbs.registerHelper('getMAComparisonClass', (price, ma) => {
    return price > ma ? 'text-green-600' : 'text-red-600';
  });
  
  hbs.registerHelper('getMAComparisonText', (price, ma) => {
    const diff = ((price - ma) / ma * 100).toFixed(2);
    return price > ma ? `+${diff}%` : `${diff}%`;
  });
  
  hbs.registerHelper('getSignalStrength', (score) => {
    if (score >= 80) return 'strong';
    if (score >= 60) return 'medium';
    return 'weak';
  });
  
  hbs.registerHelper('getRankClass', (index) => {
    if (index === 0) return '1';
    if (index === 1) return '2';
    if (index === 2) return '3';
    return 'other';
  });
  
  // 日期格式化
  hbs.registerHelper('formatDate', (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('zh-TW');
  });
  
  hbs.registerHelper('formatDateTime', (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('zh-TW');
  });
}

bootstrap();
