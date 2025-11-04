import { Controller, Get, Query, Param } from '@nestjs/common';
import { ChartService } from './chart.service';
import { DateTime } from 'luxon';

@Controller('chart')
export class ChartController {
  constructor(private readonly chartService: ChartService) {}

  /**
   * 取得股票K線圖資料
   * GET /chart/candlestick/:symbol?days=60&startDate=2024-10-01&endDate=2024-11-01
   */
  @Get('candlestick/:symbol')
  async getCandlestickChart(
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 60;
    const data = await this.chartService.getStockCandlestickData(
      symbol.toUpperCase(),
      startDate,
      endDate,
      daysNum,
    );

    return {
      symbol: symbol.toUpperCase(),
      type: 'candlestick',
      count: data.length,
      data,
      chartConfig: this.chartService.generateChartConfig('candlestick', data, {
        title: `${symbol.toUpperCase()} K線圖`,
      }),
    };
  }

  /**
   * 取得技術分析圖表資料
   * GET /chart/technical/:symbol?days=60
   */
  @Get('technical/:symbol')
  async getTechnicalChart(
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const daysNum = days ? parseInt(days, 10) : 60;
    const data = await this.chartService.getTechnicalChartData(
      symbol.toUpperCase(),
      startDate,
      endDate,
      daysNum,
    );

    return {
      symbol: symbol.toUpperCase(),
      type: 'technical',
      data,
      charts: {
        candlestick: this.chartService.generateChartConfig(
          'candlestick',
          data.candlestick,
          { title: `${symbol.toUpperCase()} K線圖與技術指標` },
        ),
        rsi: this.chartService.generateChartConfig('line', data.rsi, {
          title: 'RSI 相對強弱指標',
          scales: { y: { min: 0, max: 100 } },
        }),
        macd: this.chartService.generateChartConfig('line', data.macd, {
          title: 'MACD 指標',
        }),
        volume: this.chartService.generateChartConfig('bar', data.volume, {
          title: '成交量',
        }),
      },
    };
  }

  /**
   * 取得大盤指數圖表
   * GET /chart/market-index?days=90
   */
  @Get('market-index')
  async getMarketIndexChart(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 90;
    const data = await this.chartService.getMarketIndexChart(daysNum);

    return {
      type: 'market-index',
      period: `${daysNum} 天`,
      data,
      charts: {
        taiex: this.chartService.generateChartConfig('line', data.taiex, {
          title: '台灣加權指數走勢',
          borderColor: 'rgb(75, 192, 192)',
          fill: false,
        }),
        volume: this.chartService.generateChartConfig('bar', data.volume, {
          title: '大盤成交量',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }),
        foreignInvestors: this.chartService.generateChartConfig(
          'line',
          data.foreignInvestors,
          {
            title: '外資買賣超',
            borderColor: 'rgb(255, 99, 132)',
          },
        ),
        sitc: this.chartService.generateChartConfig('line', data.sitc, {
          title: '投信買賣超',
          borderColor: 'rgb(54, 162, 235)',
        }),
      },
    };
  }

  /**
   * 取得行業類股表現圖表
   * GET /chart/sector-performance?date=2024-11-01
   */
  @Get('sector-performance')
  async getSectorPerformanceChart(@Query('date') date?: string) {
    const data = await this.chartService.getSectorPerformanceChart(date);
    const targetDate = date || DateTime.local().toISODate();

    return {
      type: 'sector-performance',
      date: targetDate,
      count: data.sectors.length,
      data: data.sectors,
      chartConfig: this.chartService.generateChartConfig(
        'bar',
        {
          labels: data.sectors.map((s) => s.name),
          datasets: [
            {
              label: '漲跌幅 (%)',
              data: data.sectors.map((s) => s.changePercent),
              backgroundColor: data.sectors.map((s) =>
                s.changePercent >= 0
                  ? 'rgba(75, 192, 192, 0.6)'
                  : 'rgba(255, 99, 132, 0.6)',
              ),
              borderColor: data.sectors.map((s) =>
                s.changePercent >= 0
                  ? 'rgba(75, 192, 192, 1)'
                  : 'rgba(255, 99, 132, 1)',
              ),
              borderWidth: 1,
            },
          ],
        },
        {
          title: '類股表現',
          indexAxis: 'y',
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      ),
    };
  }

  /**
   * 取得技術指標分布圖表
   * GET /chart/technical-distribution?date=2024-11-01
   */
  @Get('technical-distribution')
  async getTechnicalDistributionChart(@Query('date') date?: string) {
    const data = await this.chartService.getTechnicalIndicatorDistribution(
      date,
    );
    const targetDate = date || DateTime.local().toISODate();

    return {
      type: 'technical-distribution',
      date: targetDate,
      data,
      charts: {
        rsi: this.chartService.generateChartConfig(
          'bar',
          {
            labels: data.rsiDistribution.map((d) => d.range),
            datasets: [
              {
                label: '股票數量',
                data: data.rsiDistribution.map((d) => d.count),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
              },
            ],
          },
          { title: 'RSI 指標分布' },
        ),
        score: this.chartService.generateChartConfig(
          'bar',
          {
            labels: data.scoreDistribution.map((d) => d.range),
            datasets: [
              {
                label: '股票數量',
                data: data.scoreDistribution.map((d) => d.count),
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)', // 強烈賣出
                  'rgba(255, 159, 64, 0.6)', // 賣出
                  'rgba(255, 205, 86, 0.6)', // 中性
                  'rgba(75, 192, 192, 0.6)', // 買進
                  'rgba(54, 162, 235, 0.6)', // 強烈買進
                ],
              },
            ],
          },
          { title: '技術評分分布' },
        ),
        signals: this.chartService.generateChartConfig(
          'bar',
          {
            labels: data.signalDistribution.map((d) => d.type),
            datasets: [
              {
                label: '信號數量',
                data: data.signalDistribution.map((d) => d.count),
                backgroundColor: [
                  'rgba(75, 192, 192, 0.6)', // 買進
                  'rgba(255, 99, 132, 0.6)', // 賣出
                  'rgba(201, 203, 207, 0.6)', // 中性
                ],
              },
            ],
          },
          { title: '買賣信號分布' },
        ),
      },
    };
  }

  /**
   * 取得熱門股票排行榜圖表
   * GET /chart/top-stocks/:type?date=2024-11-01&limit=10
   * type: gainers | losers | volume | technical
   */
  @Get('top-stocks/:type')
  async getTopStocksChart(
    @Param('type') type: 'gainers' | 'losers' | 'volume' | 'technical',
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const data = await this.chartService.getTopStocksChart(
      type,
      date,
      limitNum,
    );

    const targetDate = date || DateTime.local().toISODate();

    const typeLabels = {
      gainers: '漲幅排行榜',
      losers: '跌幅排行榜',
      volume: '成交量排行榜',
      technical: '技術評分排行榜',
    };

    return {
      type,
      title: typeLabels[type],
      date: targetDate,
      count: data.data.length,
      data: data.data,
      chartConfig: this.chartService.generateChartConfig(
        'bar',
        {
          labels: data.data.map((stock) => `${stock.symbol} ${stock.name}`),
          datasets: [
            {
              label:
                type === 'gainers' || type === 'losers'
                  ? '漲跌幅 (%)'
                  : type === 'volume'
                    ? '成交量'
                    : '技術評分',
              data: data.data.map((stock) =>
                type === 'gainers' || type === 'losers'
                  ? stock.changePercent
                  : stock.value,
              ),
              backgroundColor:
                type === 'gainers'
                  ? 'rgba(75, 192, 192, 0.6)'
                  : type === 'losers'
                    ? 'rgba(255, 99, 132, 0.6)'
                    : 'rgba(54, 162, 235, 0.6)',
            },
          ],
        },
        {
          title: typeLabels[type],
          indexAxis: 'y',
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      ),
    };
  }

  /**
   * 取得市場概況儀表板資料
   * GET /chart/market-dashboard?date=2024-11-01
   */
  @Get('market-dashboard')
  async getMarketDashboard(@Query('date') date?: string) {
    const targetDate = date || DateTime.local().toISODate();

    const [
      marketIndex,
      sectorPerformance,
      technicalDistribution,
      topGainers,
      topLosers,
    ] = await Promise.all([
      this.chartService.getMarketIndexChart(30),
      this.chartService.getSectorPerformanceChart(targetDate),
      this.chartService.getTechnicalIndicatorDistribution(targetDate),
      this.chartService.getTopStocksChart('gainers', targetDate, 5),
      this.chartService.getTopStocksChart('losers', targetDate, 5),
    ]);

    return {
      date: targetDate,
      dashboard: {
        marketIndex: {
          latest: marketIndex.taiex[marketIndex.taiex.length - 1],
          trend: marketIndex.taiex.slice(-7), // 最近7天趨勢
        },
        sectorPerformance: sectorPerformance.sectors
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 5),
        technicalOverview: {
          buySignals: technicalDistribution.signalDistribution.find(
            (s) => s.type === '買進信號',
          )?.count || 0,
          sellSignals: technicalDistribution.signalDistribution.find(
            (s) => s.type === '賣出信號',
          )?.count || 0,
          neutralSignals: technicalDistribution.signalDistribution.find(
            (s) => s.type === '中性',
          )?.count || 0,
        },
        topMovers: {
          gainers: topGainers.data,
          losers: topLosers.data,
        },
      },
    };
  }
}