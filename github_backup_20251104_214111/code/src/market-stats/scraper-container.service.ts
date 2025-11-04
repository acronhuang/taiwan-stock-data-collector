import { Injectable } from '@nestjs/common';
import { TwseScraperService } from '../scraper/twse-scraper.service';
import { TaifexScraperService } from '../scraper/taifex-scraper.service';
import { TdccScraperService } from '../scraper/tdcc-scraper.service';
import { UsdtScraperService } from '../scraper/usdt-scraper.service';

/**
 * 聚合所有 Scraper 服務的容器
 * 用於減少 MarketStatsService 構造函數的參數數量
 */
@Injectable()
export class ScraperServiceContainer {
  constructor(
    public readonly twseScraperService: TwseScraperService,
    public readonly taifexScraperService: TaifexScraperService,
    public readonly tdccScraperService: TdccScraperService,
    public readonly usdtScraperService: UsdtScraperService,
  ) {}
}
