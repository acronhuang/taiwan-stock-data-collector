import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { DateTime } from 'luxon';

@Controller('technical-analysis')
export class TechnicalAnalysisController {
  constructor(
    private readonly technicalAnalysisService: TechnicalAnalysisService,
  ) {}

  /**
   * 取得股票技術分析報告
   * GET /technical-analysis/report/:symbol?days=30
   */
  @Get('report/:symbol')
  async getTechnicalReport(
    @Param('symbol') symbol: string,
    @Query('date') date?: string,
  ) {
    return this.technicalAnalysisService.getTechnicalAnalysisReport(
      symbol.toUpperCase(),
      date,
    );
  }

  /**
   * 取得市場技術分析概況
   * GET /technical-analysis/market-overview?date=2024-11-01
   */
  @Get('market-overview')
  async getMarketOverview(@Query('date') date?: string) {
    return this.technicalAnalysisService.getMarketTechnicalOverview(date);
  }

  /**
   * 手動計算指定日期的技術指標
   * POST /technical-analysis/calculate
   */
  @Post('calculate')
  async calculateTechnicalIndicators(@Body() body: { date: string }) {
    const { date } = body;
    if (!date) {
      return { success: false, message: '請提供日期參數' };
    }

    try {
      await this.technicalAnalysisService.batchCalculateTechnicalIndicators(
        date,
      );
      return {
        success: true,
        message: `已開始計算 ${date} 的技術指標`,
        date,
      };
    } catch (error) {
      return {
        success: false,
        message: `計算技術指標失敗: ${error.message}`,
      };
    }
  }

  /**
   * 批量計算多個日期的技術指標
   * POST /technical-analysis/batch-calculate
   */
  @Post('batch-calculate')
  async batchCalculateMultipleDates(@Body() body: { 
    startDate?: string; 
    endDate?: string; 
    dates?: string[];
    mode: 'range' | 'list';
  }) {
    const { startDate, endDate, dates, mode } = body;
    
    try {
      let targetDates: string[] = [];
      
      if (mode === 'range' && startDate && endDate) {
        // 獲取日期範圍內有原始資料的日期
        targetDates = await this.technicalAnalysisService.getAvailableDatesInRange(startDate, endDate);
      } else if (mode === 'list' && dates?.length) {
        targetDates = dates;
      } else {
        return { success: false, message: '請提供有效的日期參數' };
      }

      if (targetDates.length === 0) {
        return { success: false, message: '沒有找到可計算的日期' };
      }

      // 開始批量計算
      const results = [];
      for (const date of targetDates) {
        try {
          await this.technicalAnalysisService.batchCalculateTechnicalIndicators(date);
          results.push({ date, status: 'success' });
        } catch (error) {
          results.push({ date, status: 'error', error: error.message });
        }
        // 避免資源過載，每次計算間隔 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return {
        success: true,
        message: `批量計算完成，處理了 ${targetDates.length} 個日期`,
        results,
        totalDates: targetDates.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `批量計算失敗: ${error.message}`,
      };
    }
  }

  /**
   * 獲取缺少技術指標的日期列表
   * GET /technical-analysis/missing-dates
   */
  @Get('missing-dates')
  async getMissingDates() {
    return this.technicalAnalysisService.getMissingTechnicalIndicatorDates();
  }

  /**
   * 取得買進信號股票清單
   * GET /technical-analysis/buy-signals?date=2024-11-01
   */
  @Get('buy-signals')
  async getBuySignals(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();
    const buySignals = await this.technicalAnalysisService.getBuySignalStocks(
      targetDate,
    );

    return {
      date: targetDate,
      count: buySignals.length,
      stocks: buySignals.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.closePrice,
        technicalScore: stock.technicalScore,
        recommendation: stock.recommendation,
        signals: stock.signals,
      })),
    };
  }

  /**
   * 取得賣出信號股票清單
   * GET /technical-analysis/sell-signals?date=2024-11-01
   */
  @Get('sell-signals')
  async getSellSignals(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();
    const sellSignals = await this.technicalAnalysisService.getSellSignalStocks(
      targetDate,
    );

    return {
      date: targetDate,
      count: sellSignals.length,
      stocks: sellSignals.map((stock) => ({
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.closePrice,
        technicalScore: stock.technicalScore,
        recommendation: stock.recommendation,
        signals: stock.signals,
      })),
    };
  }

  /**
   * 取得技術評分排行榜
   * GET /technical-analysis/top-rated?date=2024-11-01&limit=20
   */
  @Get('top-rated')
  async getTopRatedStocks(
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    const targetDate = date || DateTime.local().toISODate();
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const topRated = await this.technicalAnalysisService.getTopRatedStocks(
      targetDate,
      limitNum,
    );

    return {
      date: targetDate,
      count: topRated.length,
      stocks: topRated.map((stock, index) => ({
        rank: index + 1,
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.closePrice,
        technicalScore: stock.technicalScore,
        recommendation: stock.recommendation,
        ma5: stock.ma5,
        ma20: stock.ma20,
        rsi12: stock.rsi12,
        macd: stock.macd,
      })),
    };
  }

  /**
   * 取得指定股票的歷史技術指標
   * GET /technical-analysis/history/:symbol?startDate=2024-10-01&endDate=2024-11-01
   */
  @Get('history/:symbol')
  async getTechnicalHistory(
    @Param('symbol') symbol: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;

    const history = await this.technicalAnalysisService.getTechnicalIndicatorHistory(
      symbol.toUpperCase(),
      startDate,
      endDate,
      limitNum,
    );

    if (history.length === 0) {
      return {
        symbol: symbol.toUpperCase(),
        message: 'No technical analysis data found',
        data: [],
      };
    }

    return {
      symbol: symbol.toUpperCase(),
      name: history[0].name,
      count: history.length,
      data: history.reverse().map((item) => ({
        date: item.date,
        closePrice: item.closePrice,
        ma5: item.ma5,
        ma20: item.ma20,
        ma60: item.ma60,
        rsi12: item.rsi12,
        macd: item.macd,
        k9: item.k9,
        d9: item.d9,
        technicalScore: item.technicalScore,
        recommendation: item.recommendation,
        signals: item.signals,
      })),
    };
  }

  /**
   * 取得技術指標統計資訊
   * GET /technical-analysis/stats
   */
  @Get('stats')
  async getTechnicalStats(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();
    const stats = await this.technicalAnalysisService.getTechnicalStats(
      targetDate,
    );

    return {
      date: targetDate,
      ...stats,
    };
  }
}