import { Body, Controller, Post } from '@nestjs/common';
import { TickerService } from './ticker.service';

@Controller('ticker')
export class TickerController {
  constructor(private readonly tickerService: TickerService) {}

  @Post('fetch-twse-equities')
  async fetchTwseEquities(@Body('date') date: string) {
    return this.tickerService.updateTwseEquitiesQuotes(date);
  }

  @Post('fetch-tpex-equities')
  async fetchTpexEquities(@Body('date') date: string) {
    return this.tickerService.updateTpexEquitiesQuotes(date);
  }

  @Post('fetch-all-equities')
  async fetchAllEquities(@Body('date') date: string) {
    const results = await Promise.allSettled([
      this.tickerService.updateTwseEquitiesQuotes(date),
      this.tickerService.updateTpexEquitiesQuotes(date),
    ]);
    
    const twseSuccess = results[0].status === 'fulfilled' && results[0].value === true;
    const tpexSuccess = results[1].status === 'fulfilled' && results[1].value === true;
    
    return {
      date,
      twse: twseSuccess ? 'success' : 'failed',
      tpex: tpexSuccess ? 'success' : 'failed',
      message: `${date} 個股資料抓取完成`
    };
  }
}
