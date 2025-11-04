import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MopsScraperService } from './mops-scraper.service';
import { TaifexScraperService } from './taifex-scraper.service';
import { TdccScraperService } from './tdcc-scraper.service';
import { TpexScraperService } from './tpex-scraper.service';
import { TwseScraperService } from './twse-scraper.service';
import { UsdtScraperService } from './usdt-scraper.service';
import { YahooFinanceService } from './yahoo-finance.service';

@Module({
  imports: [HttpModule],
  providers: [
    TwseScraperService,
    TpexScraperService,
    TaifexScraperService,
    TdccScraperService,
    MopsScraperService,
    UsdtScraperService,
    YahooFinanceService,
  ],
  exports: [
    TwseScraperService,
    TpexScraperService,
    TaifexScraperService,
    TdccScraperService,
    MopsScraperService,
    UsdtScraperService,
    YahooFinanceService,
  ],
})
export class ScraperModule {}
