import { Controller, Get, Query } from '@nestjs/common';
import { HolidayService } from '../common/holiday.service';

@Controller('holiday')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get('check')
  async checkHoliday(@Query('date') date: string) {
    if (!date) {
      return { error: '請提供日期參數 (格式: YYYY-MM-DD)' };
    }

    try {
      const isHoliday = await this.holidayService.isHoliday(date);
      const isWorkingDay = await this.holidayService.isWorkingDay(date);

      return {
        date,
        isHoliday,
        isWorkingDay,
        message: isHoliday ? '此日期為休假日' : '此日期為工作日',
      };
    } catch (error) {
      return {
        error: '檢查失敗',
        message: error.message,
      };
    }
  }

  @Get('working-days')
  async getWorkingDays(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      return { error: '請提供 startDate 和 endDate 參數 (格式: YYYY-MM-DD)' };
    }

    try {
      const workingDays = await this.holidayService.getWorkingDays(
        startDate,
        endDate,
      );

      return {
        startDate,
        endDate,
        workingDays,
        count: workingDays.length,
      };
    } catch (error) {
      return {
        error: '查詢失敗',
        message: error.message,
      };
    }
  }

  @Get('next-working-day')
  async getNextWorkingDay(@Query('date') date: string) {
    if (!date) {
      return { error: '請提供日期參數 (格式: YYYY-MM-DD)' };
    }

    try {
      const nextWorkingDay = await this.holidayService.getNextWorkingDay(date);

      return {
        date,
        nextWorkingDay,
        message: `${date} 的下一個工作日是 ${nextWorkingDay}`,
      };
    } catch (error) {
      return {
        error: '查詢失敗',
        message: error.message,
      };
    }
  }

  @Get('cache-stats')
  getCacheStats() {
    return this.holidayService.getCacheStats();
  }

  @Get('clear-cache')
  clearCache() {
    this.holidayService.clearCache();
    return { message: '快取已清除' };
  }
}
