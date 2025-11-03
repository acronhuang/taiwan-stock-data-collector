import { Injectable } from '@nestjs/common';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import { TickerRepository } from '../ticker/ticker.repository';
import { MarketStatsRepository } from '../market-stats/market-stats.repository';
import { DateTime } from 'luxon';

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalChartData {
  candlestick: CandlestickData[];
  ma5?: ChartDataPoint[];
  ma20?: ChartDataPoint[];
  ma60?: ChartDataPoint[];
  rsi?: ChartDataPoint[];
  macd?: {
    macd: ChartDataPoint[];
    signal: ChartDataPoint[];
    histogram: ChartDataPoint[];
  };
  volume?: ChartDataPoint[];
}

@Injectable()
export class ChartService {
  constructor(
    private readonly technicalAnalysisService: TechnicalAnalysisService,
    private readonly tickerRepository: TickerRepository,
    private readonly marketStatsRepository: MarketStatsRepository,
  ) {}

  /**
   * 取得股票K線圖資料
   */
  async getStockCandlestickData(
    symbol: string,
    startDate?: string,
    endDate?: string,
    days: number = 60,
  ): Promise<CandlestickData[]> {
    const end = endDate || DateTime.local().toISODate();
    const start =
      startDate || DateTime.fromISO(end).minus({ days }).toISODate();

    const tickers = await this.tickerRepository.getHistoricalTickers(
      symbol,
      start,
      end,
    );

    return tickers
      .reverse() // 時間順序
      .map((ticker) => ({
        date: ticker.date,
        open: ticker.openPrice || ticker.closePrice,
        high: ticker.highPrice || ticker.closePrice,
        low: ticker.lowPrice || ticker.closePrice,
        close: ticker.closePrice,
        volume: ticker.tradeVolume,
      }))
      .filter((data) => data.close > 0); // 過濾無效資料
  }

  /**
   * 取得技術指標圖表資料
   */
  async getTechnicalChartData(
    symbol: string,
    startDate?: string,
    endDate?: string,
    days: number = 60,
  ): Promise<TechnicalChartData> {
    const end = endDate || DateTime.local().toISODate();
    const start =
      startDate || DateTime.fromISO(end).minus({ days }).toISODate();

    // 取得K線資料
    const candlestick = await this.getStockCandlestickData(
      symbol,
      start,
      end,
      days,
    );

    // 取得技術指標資料
    const technicalData = await this.technicalAnalysisService.getTechnicalIndicatorHistory(
      symbol,
      start,
      end,
    );

    const technicalMap = new Map(
      technicalData.map((item) => [item.date, item]),
    );

    // 組合圖表資料
    const chartData: TechnicalChartData = {
      candlestick,
      ma5: [],
      ma20: [],
      ma60: [],
      rsi: [],
      macd: {
        macd: [],
        signal: [],
        histogram: [],
      },
      volume: [],
    };

    candlestick.forEach((candle) => {
      const technical = technicalMap.get(candle.date);
      if (technical) {
        // 移動平均線
        if (technical.ma5) {
          chartData.ma5.push({
            date: candle.date,
            value: technical.ma5,
          });
        }
        if (technical.ma20) {
          chartData.ma20.push({
            date: candle.date,
            value: technical.ma20,
          });
        }
        if (technical.ma60) {
          chartData.ma60.push({
            date: candle.date,
            value: technical.ma60,
          });
        }

        // RSI
        if (technical.rsi12) {
          chartData.rsi.push({
            date: candle.date,
            value: technical.rsi12,
          });
        }

        // MACD
        if (technical.macd !== null && technical.macd !== undefined) {
          chartData.macd.macd.push({
            date: candle.date,
            value: technical.macd,
          });
        }
        if (
          technical.macdSignal !== null &&
          technical.macdSignal !== undefined
        ) {
          chartData.macd.signal.push({
            date: candle.date,
            value: technical.macdSignal,
          });
        }
        if (
          technical.macdHistogram !== null &&
          technical.macdHistogram !== undefined
        ) {
          chartData.macd.histogram.push({
            date: candle.date,
            value: technical.macdHistogram,
          });
        }
      }

      // 成交量
      if (candle.volume) {
        chartData.volume.push({
          date: candle.date,
          value: candle.volume,
        });
      }
    });

    return chartData;
  }

  /**
   * 取得大盤指數圖表資料
   */
  async getMarketIndexChart(
    days: number = 90,
  ): Promise<{
    taiex: ChartDataPoint[];
    volume: ChartDataPoint[];
    foreignInvestors: ChartDataPoint[];
    sitc: ChartDataPoint[];
  }> {
    const endDate = DateTime.local().toISODate();
    const startDate = DateTime.local().minus({ days }).toISODate();

    const marketData = await this.marketStatsRepository.getMarketStatsRange(
      startDate,
      endDate,
    );

    const taiex: ChartDataPoint[] = [];
    const volume: ChartDataPoint[] = [];
    const foreignInvestors: ChartDataPoint[] = [];
    const sitc: ChartDataPoint[] = [];

    marketData.forEach((data) => {
      if (data.taiexPrice) {
        taiex.push({
          date: data.date,
          value: data.taiexPrice,
          label: `${data.taiexPrice} (${data.taiexChange >= 0 ? '+' : ''}${data.taiexChange})`,
        });
      }

      if (data.taiexTradeValue) {
        volume.push({
          date: data.date,
          value: data.taiexTradeValue,
        });
      }

      if (data.finiNetBuySell !== null && data.finiNetBuySell !== undefined) {
        foreignInvestors.push({
          date: data.date,
          value: data.finiNetBuySell,
        });
      }

      if (data.sitcNetBuySell !== null && data.sitcNetBuySell !== undefined) {
        sitc.push({
          date: data.date,
          value: data.sitcNetBuySell,
        });
      }
    });

    return { taiex, volume, foreignInvestors, sitc };
  }

  /**
   * 取得行業類股表現圖表
   */
  async getSectorPerformanceChart(
    date?: string,
  ): Promise<{
    sectors: Array<{
      name: string;
      symbol: string;
      closePrice: number;
      change: number;
      changePercent: number;
    }>;
  }> {
    const targetDate = date || DateTime.local().toISODate();

    // 取得主要類股指數
    const sectorSymbols = [
      'IX0028', // 半導體
      'IX0030', // 光電
      'IX0027', // 電子
      'IX0024', // 鋼鐵
      'IX0021', // 生技醫療
      'IX0039', // 金融
      'IX0037', // 航運
      'IX0026', // 汽車
      'IX0020', // 化學
      'IX0016', // 紡織
    ];

    const sectors = [];
    for (const symbol of sectorSymbols) {
      const ticker = await this.tickerRepository.getTicker(targetDate, symbol);
      if (ticker) {
        sectors.push({
          name: ticker.name,
          symbol: ticker.symbol,
          closePrice: ticker.closePrice,
          change: ticker.change || 0,
          changePercent: ticker.changePercent || 0,
        });
      }
    }

    return { sectors };
  }

  /**
   * 取得技術指標分布圖表
   */
  async getTechnicalIndicatorDistribution(
    date?: string,
  ): Promise<{
    rsiDistribution: { range: string; count: number }[];
    scoreDistribution: { range: string; count: number }[];
    signalDistribution: { type: string; count: number }[];
  }> {
    const targetDate = date || DateTime.local().toISODate();

    const stats = await this.technicalAnalysisService.getTechnicalStats(
      targetDate,
    );

    // RSI 分布
    const rsiDistribution = [
      { range: '0-30 (超賣)', count: 0 },
      { range: '30-50', count: 0 },
      { range: '50-70', count: 0 },
      { range: '70-100 (超買)', count: 0 },
    ];

    // 技術評分分布
    const scoreDistribution = [
      { range: '-100 to -60 (強烈賣出)', count: 0 },
      { range: '-60 to -30 (賣出)', count: 0 },
      { range: '-30 to 30 (中性)', count: 0 },
      { range: '30 to 60 (買進)', count: 0 },
      { range: '60 to 100 (強烈買進)', count: 0 },
    ];

    // 信號分布
    const signalDistribution = [
      { type: '買進信號', count: stats.buySignals },
      { type: '賣出信號', count: stats.sellSignals },
      { type: '中性', count: stats.neutralSignals },
    ];

    return { rsiDistribution, scoreDistribution, signalDistribution };
  }

  /**
   * 取得熱門股票排行榜圖表資料
   */
  async getTopStocksChart(
    type: 'gainers' | 'losers' | 'volume' | 'technical',
    date?: string,
    limit: number = 10,
  ): Promise<{
    type: string;
    data: Array<{
      rank: number;
      symbol: string;
      name: string;
      value: number;
      change?: number;
      changePercent?: number;
    }>;
  }> {
    const targetDate = date || DateTime.local().toISODate();

    let data = [];

    switch (type) {
      case 'gainers':
        // 漲幅最大
        const gainers = await this.tickerRepository.getTickersByDate(
          targetDate,
        );
        data = gainers
          .filter((t) => t.changePercent > 0 && t.type === 'Equity')
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, limit)
          .map((stock, index) => ({
            rank: index + 1,
            symbol: stock.symbol,
            name: stock.name,
            value: stock.closePrice,
            change: stock.change,
            changePercent: stock.changePercent,
          }));
        break;

      case 'losers':
        // 跌幅最大
        const losers = await this.tickerRepository.getTickersByDate(targetDate);
        data = losers
          .filter((t) => t.changePercent < 0 && t.type === 'Equity')
          .sort((a, b) => a.changePercent - b.changePercent)
          .slice(0, limit)
          .map((stock, index) => ({
            rank: index + 1,
            symbol: stock.symbol,
            name: stock.name,
            value: stock.closePrice,
            change: stock.change,
            changePercent: stock.changePercent,
          }));
        break;

      case 'volume':
        // 成交量最大
        const volumeStocks = await this.tickerRepository.getTickersByDate(
          targetDate,
        );
        data = volumeStocks
          .filter((t) => t.type === 'Equity' && t.tradeVolume > 0)
          .sort((a, b) => b.tradeVolume - a.tradeVolume)
          .slice(0, limit)
          .map((stock, index) => ({
            rank: index + 1,
            symbol: stock.symbol,
            name: stock.name,
            value: stock.tradeVolume,
            change: stock.change,
            changePercent: stock.changePercent,
          }));
        break;

      case 'technical':
        // 技術評分最高
        const topTechnical = await this.technicalAnalysisService.getTopRatedStocks(
          targetDate,
          limit,
        );
        data = topTechnical.map((stock, index) => ({
          rank: index + 1,
          symbol: stock.symbol,
          name: stock.name,
          value: stock.technicalScore,
          change: stock.closePrice,
          changePercent: 0, // 技術評分沒有變化百分比
        }));
        break;
    }

    return { type, data };
  }

  /**
   * 生成圖表配置 (用於前端圖表庫)
   */
  generateChartConfig(
    chartType: 'line' | 'candlestick' | 'bar' | 'area',
    data: any,
    options?: any,
  ) {
    const baseConfig = {
      type: chartType,
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: options?.title || '台灣股市圖表',
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              parser: 'YYYY-MM-DD',
              tooltipFormat: 'YYYY-MM-DD',
              displayFormats: {
                day: 'MM-DD',
              },
            },
          },
          y: {
            beginAtZero: false,
          },
        },
        ...options,
      },
    };

    return baseConfig;
  }
}