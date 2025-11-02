import { Module } from '@nestjs/common';
import { HolidayService } from './holiday.service';
import { HolidayController } from './holiday.controller';
import { ApiStatusService } from './api-status.service';
import { ApiStatusController } from './api-status.controller';

@Module({
  controllers: [HolidayController, ApiStatusController],
  providers: [HolidayService, ApiStatusService],
  exports: [HolidayService, ApiStatusService],
})
export class CommonModule {}