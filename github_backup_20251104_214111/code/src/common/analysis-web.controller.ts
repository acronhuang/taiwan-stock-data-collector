import { Controller, Get, Param, Query, Render } from '@nestjs/common';
import { TechnicalAnalysisService } from '../technical-analysis/technical-analysis.service';
import { ChartService } from '../chart/chart.service';
import { DateTime } from 'luxon';

@Controller('analysis')
export class AnalysisWebController {
  constructor(
    private readonly technicalAnalysisService: TechnicalAnalysisService,
    private readonly chartService: ChartService,
  ) {}

  /**
   * 技術分析主頁
   * GET /analysis
   */
  @Get()
  @Render('analysis/index')
  async analysisHome(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();
    
    // 取得市場概況
    const marketOverview = await this.technicalAnalysisService.getMarketTechnicalOverview(date);

    const [topRated, buySignals, sellSignals] = await Promise.all([
      this.technicalAnalysisService.getTopRatedStocks(targetDate, 10),
      this.technicalAnalysisService.getBuySignalStocks(targetDate),
      this.technicalAnalysisService.getSellSignalStocks(targetDate),
    ]);

    return {
      title: '技術分析系統',
      currentDate: targetDate, // 使用用戶選擇的日期
      selectedDate: targetDate,
      marketOverview,
      topRated: topRated.slice(0, 10),
      buySignals: buySignals.slice(0, 10),
      sellSignals: sellSignals.slice(0, 10),
    };
  }

  /**
   * 股票詳細技術分析頁面
   * GET /analysis/stock/:symbol
   */
  @Get('stock/:symbol')
  @Render('analysis/stock-detail')
  async stockAnalysis(
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
  ) {
    const symbolUpper = symbol.toUpperCase();
    const daysNum = days ? parseInt(days, 10) : 60;

    const [report, chartData] = await Promise.all([
      this.technicalAnalysisService.getTechnicalAnalysisReport(
        symbolUpper,
        undefined,
      ),
      this.chartService.getTechnicalChartData(symbolUpper, undefined, undefined, daysNum),
    ]);

    // 檢查是否有錯誤
    if (report.error) {
      console.error('Error getting technical analysis report:', report.error);
      return {
        title: `${symbolUpper} 技術分析`,
        error: report.error,
      };
    }

    // 轉換為模板期望的資料格式
    const stockInfo = {
      symbol: report.symbol,
      name: report.name,
      closePrice: report.currentPrice,
      volume: report.historicalData?.[0]?.volume || 0,
      market: '台股',
      industry: '半導體',
    };

    const technicalAnalysis = {
      technicalScore: report.technicalScore,
      recommendation: report.recommendation,
      signals: report.signals,
      ...report.indicators, // 展開 indicators (ma5, ma20, rsi12 等)
    };

    console.log('Stock info:', stockInfo);
    console.log('Technical analysis:', technicalAnalysis);

    return {
      title: `${symbolUpper} 技術分析`,
      symbol: symbolUpper,
      stockInfo,
      technicalAnalysis,
      report,
      chartData,
      days: daysNum,
      lastUpdate: DateTime.local().toFormat('yyyy-MM-dd HH:mm:ss'),
    };
  }

  /**
   * 市場概況儀表板
   * GET /analysis/dashboard
   */
  @Get('dashboard')
  @Render('analysis/dashboard')
  async marketDashboard(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();

    const [
      marketIndex,
      sectorPerformance,
      technicalDistribution,
    ] = await Promise.all([
      this.chartService.getMarketIndexChart(30),
      this.chartService.getSectorPerformanceChart(targetDate),
      this.chartService.getTechnicalIndicatorDistribution(targetDate),
    ]);

    const dashboard = {
      marketIndex: {
        latest: marketIndex.taiex[marketIndex.taiex.length - 1],
        trend: marketIndex.taiex.slice(-7),
      },
      volume: marketIndex.volume.slice(-7),
      foreignInvestors: marketIndex.foreignInvestors.slice(-7),
    };

    return {
      title: '市場概況儀表板',
      currentDate: targetDate,
      dashboard,
      sectorPerformance,
      technicalDistribution,
    };
  }

  /**
   * 買賣信號頁面
   * GET /analysis/signals
   */
  @Get('signals')
  @Render('analysis/signals')
  async tradingSignals(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();

    const [buySignals, sellSignals, stats] = await Promise.all([
      this.technicalAnalysisService.getBuySignalStocks(targetDate),
      this.technicalAnalysisService.getSellSignalStocks(targetDate),
      this.technicalAnalysisService.getTechnicalStats(targetDate),
    ]);

    return {
      title: '買賣信號分析',
      currentDate: targetDate,
      buySignals,
      sellSignals,
      stats,
    };
  }

  /**
   * 排行榜頁面
   * GET /analysis/rankings
   */
  @Get('rankings')
  @Render('analysis/rankings')
  async stockRankings(
    @Query('date') date?: string,
    @Query('type') type?: string,
  ) {
    const targetDate = date || DateTime.local().toISODate();
    const rankingType = type || 'technical';

    const [
      topGainers,
      topLosers,
      topVolume,
      topTechnical,
    ] = await Promise.all([
      this.chartService.getTopStocksChart('gainers', targetDate, 20),
      this.chartService.getTopStocksChart('losers', targetDate, 20),
      this.chartService.getTopStocksChart('volume', targetDate, 20),
      this.chartService.getTopStocksChart('technical', targetDate, 20),
    ]);

    return {
      title: '股票排行榜',
      currentDate: targetDate,
      activeType: rankingType,
      rankings: {
        gainers: topGainers.data,
        losers: topLosers.data,
        volume: topVolume.data,
        technical: topTechnical.data,
      },
    };
  }

  /**
   * 批量計算技術指標管理頁面
   * GET /analysis/batch-calculate
   */
  @Get('batch-calculate')
  @Render('analysis/batch-calculate')
  async batchCalculatePage() {
    const missingData = await this.technicalAnalysisService.getMissingTechnicalIndicatorDates();
    
    return {
      title: '批量計算技術指標',
      missingData,
    };
  }

  /**
   * 批量計算技術指標測試頁面
   * GET /analysis/batch-calculate-test
   */
  @Get('batch-calculate-test')
  @Render('analysis/batch-calculate-test')
  async batchCalculateTestPage() {
    const missingData = await this.technicalAnalysisService.getMissingTechnicalIndicatorDates();
    
    return {
      title: '批量計算技術指標 (測試版)',
      missingData,
    };
  }
}