import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticker, TickerSchema } from './ticker.schema';
import { TickerRepository } from './ticker.repository';
import { ScraperModule } from '../scraper/scraper.module';
import { CommonModule } from '../common/common.module';
import { TickerService } from './ticker.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticker.name, schema: TickerSchema },
    ]),
    ScraperModule,
    CommonModule,
  ],
  providers: [TickerRepository, TickerService],
  exports: [TickerRepository, TickerService],
})
export class TickerModule {}
