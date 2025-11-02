import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketStats, MarketStatsSchema } from './market-stats.schema';
import { MarketStatsRepository } from './market-stats.repository';
import { ScraperModule } from '../scraper/scraper.module';
import { CommonModule } from '../common/common.module';
import { MarketStatsService } from './market-stats.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketStats.name, schema: MarketStatsSchema },
    ]),
    ScraperModule,
    CommonModule,
  ],
  providers: [MarketStatsRepository, MarketStatsService],
  exports: [MarketStatsRepository, MarketStatsService],
})
export class MarketStatsModule {}
