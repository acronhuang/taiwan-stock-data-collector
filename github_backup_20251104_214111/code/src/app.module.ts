import { Module, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { CommonModule } from './common/common.module';
import { MarketStatsModule } from './market-stats/market-stats.module';
import { MarketStatsService } from './market-stats/market-stats.service';
import { ScraperModule } from './scraper/scraper.module';
import { TickerModule } from './ticker/ticker.module';
import { TickerService } from './ticker/ticker.service';
import { TechnicalAnalysisModule } from './technical-analysis/technical-analysis.module';
import { ChartModule } from './chart/chart.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ScraperModule,
    MarketStatsModule,
    TickerModule,
    CommonModule,
    TechnicalAnalysisModule,
    ChartModule,
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private readonly marketStatsService: MarketStatsService,
    private readonly tickerService: TickerService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SCRAPER_INIT_ENABLED === 'true') {
      Logger.log('正在初始化應用程式...', AppModule.name);

      // 設定固定的日期範圍：2025-10-01到2025-10-31（完整10月）
      const startDate = DateTime.fromISO('2025-10-01');
      const endDate = DateTime.fromISO('2025-10-31');

      Logger.log(
        `開始抓取 ${startDate.toISODate()} 到 ${endDate.toISODate()} 的資料`,
        AppModule.name,
      );

      let processedDays = 0;
      const totalDays = endDate.diff(startDate, 'days').days + 1;

      for (let dt = startDate; dt <= endDate; dt = dt.plus({ day: 1 })) {
        processedDays++;
        Logger.log(
          `正在處理 ${dt.toISODate()} (${processedDays}/${totalDays})`,
          AppModule.name,
        );

        try {
          await this.marketStatsService.updateMarketStats(dt.toISODate());
          await this.tickerService.updateTickers(dt.toISODate());
          Logger.log(`${dt.toISODate()} 資料處理完成`, AppModule.name);
        } catch (error) {
          Logger.error(
            `${dt.toISODate()} 資料處理失敗: ${error.message}`,
            AppModule.name,
          );
        }

        // 加入延遲避免過於頻繁的請求
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      Logger.log('應用程式初始化完成', AppModule.name);
    }
  }
}
