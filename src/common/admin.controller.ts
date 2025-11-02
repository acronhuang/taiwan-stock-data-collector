import { Controller, Get, Post, Query, Body, Render, Res } from '@nestjs/common';
import { Response } from 'express';
import { MarketStatsService } from '../market-stats/market-stats.service';
import { TickerService } from '../ticker/ticker.service';
import { HolidayService } from './holiday.service';
import { DateTime } from 'luxon';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly marketStatsService: MarketStatsService,
    private readonly tickerService: TickerService,
    private readonly holidayService: HolidayService,
  ) {}

  @Get()
  async dashboard(@Res() res: Response) {
    return res.redirect('/admin/fetch-data');
  }

  @Get('fetch-data')
  @Render('admin/fetch-data')
  async fetchDataPage() {
    // 取得最近30天的工作日作為建議日期
    const workingDays = [];
    let date = DateTime.local();
    
    for (let i = 0; i < 30 && workingDays.length < 10; i++) {
      const dateStr = date.minus({ days: i }).toISODate();
      const isHoliday = await this.holidayService.isHoliday(dateStr);
      if (!isHoliday) {
        workingDays.push(dateStr);
      }
    }

    return {
      title: '手動資料抓取',
      workingDays,
      currentDate: DateTime.local().toISODate(),
    };
  }

  @Post('fetch-single-day')
  async fetchSingleDay(@Body() body: { date: string }, @Res() res: Response) {
    const { date } = body;
    
    try {
      const isHoliday = await this.holidayService.isHoliday(date);
      if (isHoliday) {
        return res.json({
          success: false,
          message: `${date} 是假日，無法抓取資料`,
        });
      }

      // 抓取大盤資料
      await this.marketStatsService.updateMarketStats(date);
      
      // 抓取個股資料
      await this.tickerService.updateTickers(date);

      return res.json({
        success: true,
        message: `成功抓取 ${date} 的資料`,
      });
    } catch (error) {
      return res.json({
        success: false,
        message: `抓取失敗: ${error.message}`,
      });
    }
  }

  @Post('fetch-date-range')
  async fetchDateRange(
    @Body() body: { startDate: string; endDate: string },
    @Res() res: Response,
  ) {
    const { startDate, endDate } = body;

    try {
      const start = DateTime.fromISO(startDate);
      const end = DateTime.fromISO(endDate);
      const results = [];

      let current = start;
      while (current <= end) {
        const dateStr = current.toISODate();
        const isHoliday = await this.holidayService.isHoliday(dateStr);

        if (!isHoliday) {
          try {
            await this.marketStatsService.updateMarketStats(dateStr);
            await this.tickerService.updateTickers(dateStr);
            results.push({ date: dateStr, success: true, message: '成功' });
          } catch (error) {
            results.push({
              date: dateStr,
              success: false,
              message: error.message,
            });
          }
        } else {
          results.push({
            date: dateStr,
            success: false,
            message: '假日跳過',
          });
        }

        current = current.plus({ days: 1 });
      }

      return res.json({
        success: true,
        message: `批次抓取完成`,
        results,
      });
    } catch (error) {
      return res.json({
        success: false,
        message: `批次抓取失敗: ${error.message}`,
      });
    }
  }

  @Get('status')
  async getStatus() {
    // 這裡可以添加系統狀態檢查
    return {
      timestamp: new Date().toISOString(),
      status: 'running',
      message: '系統運行正常',
    };
  }
}