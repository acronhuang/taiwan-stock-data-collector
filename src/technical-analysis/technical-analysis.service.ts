import { Injectable, Logger } from '@nestjs/common';
import { DateTime } from 'luxon';
import { TechnicalIndicatorRepository } from './technical-indicator.repository';
import { TickerRepository } from '../ticker/ticker.repository';
import { TickerService } from '../ticker/ticker.service';
import { TechnicalIndicator } from './technical-indicator.schema';

@Injectable()
export class TechnicalAnalysisService {
  private readonly logger = new Logger(TechnicalAnalysisService.name);

  constructor(
    private readonly technicalIndicatorRepository: TechnicalIndicatorRepository,
    private readonly tickerRepository: TickerRepository,
    private readonly tickerService: TickerService,
  ) {}

  /**
   * 計算簡單移動平均線 (SMA)
   */
  private calculateSMA(prices: number[], period: number): number | null {
    if (prices.length < period) return null;
    const sum = prices.slice(0, period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * 計算指數移動平均線 (EMA)
   */
  private calculateEMA(
    prices: number[],
    period: number,
    previousEMA?: number,
  ): number | null {
    if (prices.length === 0) return null;

    const currentPrice = prices[0];
    const multiplier = 2 / (period + 1);

    if (previousEMA === undefined) {
      if (prices.length < period) return null;
      const sma = this.calculateSMA(prices, period);
      return sma;
    }

    return currentPrice * multiplier + previousEMA * (1 - multiplier);
  }

  /**
   * 計算RSI (相對強弱指標)
   */
  private calculateRSI(prices: number[], period: number): number | null {
    if (prices.length < period + 1) return null;

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i - 1] - prices[i];
      if (change > 0) {
        gainSum += change;
      } else {
        lossSum += Math.abs(change);
      }
    }

    if (lossSum === 0) return 100;

    const avgGain = gainSum / period;
    const avgLoss = lossSum / period;
    const rs = avgGain / avgLoss;

    return 100 - (100 / (1 + rs));
  }

  /**
   * 計算MACD
   */
  private calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
  ): { macd: number | null; signal: number | null; histogram: number | null } {
    if (prices.length < slowPeriod) {
      return { macd: null, signal: null, histogram: null };
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    if (fastEMA === null || slowEMA === null) {
      return { macd: null, signal: null, histogram: null };
    }

    const macd = fastEMA - slowEMA;
    
    // 簡化版signal計算
    const signal = macd;
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  /**
   * 計算KD指標
   */
  private calculateKD(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 9,
  ): { k: number | null; d: number | null } {
    if (highs.length < period || lows.length < period || closes.length < period) {
      return { k: null, d: null };
    }

    const periodHighs = highs.slice(0, period);
    const periodLows = lows.slice(0, period);
    const currentClose = closes[0];

    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);

    if (highestHigh === lowestLow) {
      return { k: 50, d: 50 };
    }

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k; // 簡化版D值

    return { k, d };
  }

  /**
   * 批量計算技術指標
   */
  async batchCalculateTechnicalIndicators(date: string): Promise<any> {
    this.logger.log(`開始批量計算技術指標: ${date}`);

    try {
      // 獲取該日期的所有股票數據
      const tickers = await this.tickerRepository.findByDate(date);
      
      if (!tickers || tickers.length === 0) {
        this.logger.warn(`沒有找到 ${date} 的股票數據`);
        return { date, processed: 0, message: 'No ticker data found' };
      }

      let processed = 0;

      for (const ticker of tickers) {
        try {
          // 獲取歷史數據用於計算技術指標
          const historicalData = await this.tickerRepository.findHistoricalData(
            ticker.symbol,
            date,
            250, // 最多250天歷史數據
          );

          if (historicalData.length < 5) {
            continue; // 數據不足，跳過
          }

          // 準備價格數據
          const closes = historicalData.map(h => h.closePrice);
          const highs = historicalData.map(h => h.highPrice);
          const lows = historicalData.map(h => h.lowPrice);
          const volumes = historicalData.map(h => h.tradeVolume);

          // 計算各種技術指標
          const ma5 = this.calculateSMA(closes, 5);
          const ma10 = this.calculateSMA(closes, 10);
          const ma20 = this.calculateSMA(closes, 20);
          const ma60 = this.calculateSMA(closes, 60);
          const ma120 = this.calculateSMA(closes, 120);
          const ma240 = this.calculateSMA(closes, 240);

          const ema12 = this.calculateEMA(closes, 12);
          const ema26 = this.calculateEMA(closes, 26);

          const macdData = this.calculateMACD(closes);
          const rsi6 = this.calculateRSI(closes, 6);
          const rsi12 = this.calculateRSI(closes, 12);
          const rsi24 = this.calculateRSI(closes, 24);

          const kdData = this.calculateKD(highs, lows, closes);

          // 保存技術指標到數據庫
          const technicalIndicator = {
            date,
            symbol: ticker.symbol,
            name: ticker.name,
            type: ticker.type,
            openPrice: ticker.openPrice,
            highPrice: ticker.highPrice,
            lowPrice: ticker.lowPrice,
            closePrice: ticker.closePrice,
            volume: ticker.tradeVolume,
            ma5,
            ma10,
            ma20,
            ma60,
            ma120,
            ma240,
            ema12,
            ema26,
            macd: macdData.macd,
            macdSignal: macdData.signal,
            macdHistogram: macdData.histogram,
            rsi6,
            rsi12,
            rsi24,
            k9: kdData.k,
            d9: kdData.d,
            wr10: null, // 暫時設為null
            wr20: null,
            bbUpper: null,
            bbMiddle: ma20,
            bbLower: null,
            bbWidth: null,
            volumeMa5: this.calculateSMA(volumes, 5),
            volumeMa20: this.calculateSMA(volumes, 20),
            volumeRatio: volumes.length > 0 ? volumes[0] / (this.calculateSMA(volumes, 20) || 1) : null,
            priceStrength: null,
            trendDirection: 'sideways',
            trendStrength: 50,
            supportLevel: Math.min(...lows.slice(0, 20)),
            resistanceLevel: Math.max(...highs.slice(0, 20)),
            signals: {
              macdBuy: false,
              macdSell: false,
              rsiOverbought: false,
              rsiOversold: false,
              kdGoldenCross: false,
              kdDeathCross: false,
              volumeBreakout: false,
              priceBreakout: false,
              bollingerBuySignal: false,
              bollingerSellSignal: false,
              williamsOversold: false,
              williamsOverbought: false,
            },
            technicalScore: 0,
            recommendation: 'hold',
          };

          await this.technicalIndicatorRepository.upsert(technicalIndicator);
          processed++;

        } catch (error) {
          this.logger.error(`計算 ${ticker.symbol} 技術指標時發生錯誤:`, error);
        }
      }

      this.logger.log(`${date} 技術指標計算完成，處理了 ${processed} 支股票`);
      return { date, processed, total: tickers.length };

    } catch (error) {
      this.logger.error(`批量計算技術指標時發生錯誤:`, error);
      throw error;
    }
  }

  /**
   * 取得技術分析報告
   */
  async getTechnicalAnalysisReport(symbol: string, date?: string): Promise<any> {
    const targetDate = date || DateTime.local().toISODate();
    
    try {
      const indicator = await this.technicalIndicatorRepository.findOne(symbol, targetDate);
      
      if (!indicator) {
        // 嘗試查找最近的數據
        const latestIndicator = await this.technicalIndicatorRepository.findLatest(symbol);
        
        return {
          symbol,
          date: targetDate,
          hasData: !!latestIndicator,
          data: latestIndicator || null,
          message: latestIndicator 
            ? `使用最新可用數據 (${latestIndicator.date})`
            : '暫無技術分析數據'
        };
      }

      return {
        symbol,
        date: targetDate,
        hasData: true,
        data: indicator
      };
    } catch (error) {
      this.logger.error(`獲取技術分析報告時發生錯誤:`, error);
      throw error;
    }
  }

  /**
   * 取得市場技術分析概況
   */
  async getMarketTechnicalOverview(date: string): Promise<any> {
    try {
      const indicators = await this.technicalIndicatorRepository.findByDate(date);
      
      if (!indicators || indicators.length === 0) {
        return {
          date,
          hasData: false,
          message: '暫無市場技術分析數據'
        };
      }

      // 計算市場統計
      const totalStocks = indicators.length;
      const bullishCount = indicators.filter(i => i.technicalScore > 20).length;
      const bearishCount = indicators.filter(i => i.technicalScore < -20).length;
      const neutralCount = totalStocks - bullishCount - bearishCount;

      return {
        date,
        hasData: true,
        totalStocks,
        bullishCount,
        bearishCount,
        neutralCount,
        bullishPercentage: (bullishCount / totalStocks * 100).toFixed(1),
        bearishPercentage: (bearishCount / totalStocks * 100).toFixed(1),
        neutralPercentage: (neutralCount / totalStocks * 100).toFixed(1),
      };
    } catch (error) {
      this.logger.error(`獲取市場技術分析概況時發生錯誤:`, error);
      throw error;
    }
  }

  /**
   * 取得缺失的技術指標日期
   */
  async getMissingTechnicalIndicatorDates(): Promise<any> {
    try {
      const allTickerDates = await this.tickerRepository.getAllDates();
      const techDates = await this.technicalIndicatorRepository.getAllDates();
      
      const missingDates = allTickerDates.filter(date => !techDates.includes(date));
      
      return {
        totalTickerDates: allTickerDates.length,
        totalTechDates: techDates.length,
        missingDates: missingDates.sort(),
        missingCount: missingDates.length,
      };
    } catch (error) {
      this.logger.error(`獲取缺失技術指標日期時發生錯誤:`, error);
      throw error;
    }
  }

  /**
   * 取得指定日期範圍內的可用日期
   */
  async getAvailableDatesInRange(startDate: string, endDate: string): Promise<string[]> {
    try {
      return await this.tickerRepository.getAvailableDates(startDate, endDate);
    } catch (error) {
      this.logger.error(`獲取可用日期範圍時發生錯誤:`, error);
      throw error;
    }
  }

  // 添加其他必要的方法
  async getBuySignalStocks(date: string, limit?: number): Promise<any[]> {
    // 簡化實作
    return [];
  }

  async getSellSignalStocks(date: string, limit?: number): Promise<any[]> {
    // 簡化實作
    return [];
  }

  async getTopRatedStocks(date: string, limit?: number): Promise<any[]> {
    // 簡化實作
    return [];
  }

  async getTechnicalIndicatorHistory(symbol: string, startDate?: string, endDate?: string, limit?: number): Promise<any[]> {
    try {
      return await this.technicalIndicatorRepository.getTechnicalIndicators(
        symbol,
        startDate,
        endDate,
        limit
      );
    } catch (error) {
      this.logger.error(`獲取技術指標歷史時發生錯誤:`, error);
      return [];
    }
  }

  async getTechnicalStats(date: string): Promise<any> {
    // 簡化實作
    return {};
  }
}
