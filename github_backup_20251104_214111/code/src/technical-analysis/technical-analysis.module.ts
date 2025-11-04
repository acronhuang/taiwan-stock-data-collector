import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TechnicalAnalysisService } from './technical-analysis.service';
import { TechnicalAnalysisController } from './technical-analysis.controller';
import { TechnicalIndicator, TechnicalIndicatorSchema } from './technical-indicator.schema';
import { TechnicalIndicatorRepository } from './technical-indicator.repository';
import { TickerModule } from '../ticker/ticker.module';
import { MarketStatsModule } from '../market-stats/market-stats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TechnicalIndicator.name, schema: TechnicalIndicatorSchema },
    ]),
    TickerModule,
    MarketStatsModule,
  ],
  controllers: [TechnicalAnalysisController],
  providers: [TechnicalAnalysisService, TechnicalIndicatorRepository],
  exports: [TechnicalAnalysisService, TechnicalIndicatorRepository],
})
export class TechnicalAnalysisModule {}