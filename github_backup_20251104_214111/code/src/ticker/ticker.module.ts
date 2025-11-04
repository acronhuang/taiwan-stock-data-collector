import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../common/common.module';
import { ScraperModule } from '../scraper/scraper.module';
import { TickerRepository } from './ticker.repository';
import { Ticker, TickerSchema } from './ticker.schema';

import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticker.name, schema: TickerSchema }]),
    ScraperModule,
    forwardRef(() => CommonModule),
  ],
  controllers: [TickerController],
  providers: [TickerRepository, TickerService],
  exports: [TickerRepository, TickerService],
})
export class TickerModule {}
