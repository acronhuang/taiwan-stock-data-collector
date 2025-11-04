import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module';
import { ScraperModule } from '../scraper/scraper.module';
import { MarketStatsRepository } from './market-stats.repository';
import { MarketStats, MarketStatsSchema } from './market-stats.schema';
import { MarketStatsService } from './market-stats.service';
import { ScraperServiceContainer } from './scraper-container.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketStats.name, schema: MarketStatsSchema },
    ]),
    ScraperModule,
    forwardRef(() => CommonModule),
  ],
  providers: [
    MarketStatsRepository,
    MarketStatsService,
    ScraperServiceContainer,
  ],
  exports: [MarketStatsRepository, MarketStatsService],
})
export class MarketStatsModule {}
