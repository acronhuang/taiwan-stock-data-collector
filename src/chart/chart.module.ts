import { Module } from '@nestjs/common';
import { ChartService } from './chart.service';
import { ChartController } from './chart.controller';
import { TechnicalAnalysisModule } from '../technical-analysis/technical-analysis.module';
import { TickerModule } from '../ticker/ticker.module';
import { MarketStatsModule } from '../market-stats/market-stats.module';

@Module({
  imports: [TechnicalAnalysisModule, TickerModule, MarketStatsModule],
  controllers: [ChartController],
  providers: [ChartService],
  exports: [ChartService],
})
export class ChartModule {}