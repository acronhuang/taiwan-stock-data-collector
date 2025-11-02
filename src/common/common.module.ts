import { Module, forwardRef } from '@nestjs/common';
import { ApiStatusController } from './api-status.controller';
import { ApiStatusService } from './api-status.service';
import { HolidayController } from './holiday.controller';
import { HolidayService } from './holiday.service';
import { AdminController } from './admin.controller';
import { MarketStatsModule } from '../market-stats/market-stats.module';
import { TickerModule } from '../ticker/ticker.module';

@Module({
  imports: [forwardRef(() => MarketStatsModule), forwardRef(() => TickerModule)],
  controllers: [HolidayController, ApiStatusController, AdminController],
  providers: [HolidayService, ApiStatusService],
  exports: [HolidayService, ApiStatusService],
})
export class CommonModule {}
