import { DateTime } from 'luxon';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TickerType, Exchange, Market, Index } from './enums';
import { TickerRepository } from './ticker.repository';
import { TwseScraperService } from '../scraper/twse-scraper.service';
import { TpexScraperService } from '../scraper/tpex-scraper.service';
import { HolidayService } from '../common/holiday.service';
import { Ticker } from './ticker.schema';

@Injectable()
export class TickerService {
  private readonly logger = new Logger(TickerService.name);

  constructor(
    private readonly tickerRepository: TickerRepository,
    private readonly twseScraperService: TwseScraperService,
    private readonly tpexScraperService: TpexScraperService,
    private readonly holidayService: HolidayService,
  ) {}

  /**
   * 決定要更新的目標日期
   * 規則與 MarketStatsService 相同
   */
  private async getTargetUpdateDate(): Promise<string> {
    const now = DateTime.local();
    const today = now.toISODate();
    const currentHour = now.hour;
    
    // 檢查今天是否為工作日
    const isTodayWorkingDay = !(await this.holidayService.isHoliday(today));
    
    // 如果今天是工作日且時間已到 14:00, 16:00 或 20:00
    if (isTodayWorkingDay && (currentHour >= 14)) {
      this.logger.log(`使用當日 ${today} 進行更新 (當前時間: ${currentHour}:${now.minute.toString().padStart(2, '0')})`);
      return today;
    }
    
    // 否則找上一個工作日
    let targetDate = now.minus({ days: 1 });
    
    // 持續往前找，直到找到工作日
    while (await this.holidayService.isHoliday(targetDate.toISODate())) {
      targetDate = targetDate.minus({ days: 1 });
    }
    
    const targetDateStr = targetDate.toISODate();
    this.logger.log(`使用上一個工作日 ${targetDateStr} 進行更新 (當前時間未到更新時點或非工作日)`);
    return targetDateStr;
  }

  /**
   * 智能更新輔助方法
   */
  private async smartUpdate<T>(
    date: string,
    operationName: string,
    fetchFunction: () => Promise<T[] | null>,
    mapFunction: (data: T[]) => Partial<Ticker>[],
    filters?: Partial<Ticker>
  ): Promise<void> {
    // 檢查假日
    if (await this.holidayService.isHoliday(date)) {
      Logger.log(`${date} ${operationName}: 跳過假日`, TickerService.name);
      return;
    }

    // 檢查現有資料
    const existingCount = await this.tickerRepository.getTickerCount(date, filters);
    if (existingCount > 0) {
      Logger.log(`${date} ${operationName}: 已有 ${existingCount} 筆資料，跳過更新`, TickerService.name);
      return;
    }

    // 抓取資料
    const fetchedData = await fetchFunction();
    if (!fetchedData || fetchedData.length === 0) {
      Logger.warn(`${date} ${operationName}: 尚無資料或非交易日`, TickerService.name);
      return;
    }

    // 轉換和更新資料
    const tickerData = mapFunction(fetchedData);
    const result = await this.tickerRepository.smartBatchUpdate(tickerData);
    
    Logger.log(`${date} ${operationName}: 已更新 ${result.updated} 筆，跳過 ${result.skipped} 筆`, TickerService.name);
  }

  async updateTickers(date: string = DateTime.local().toISODate()) {
    // 提前檢查是否為休假日，避免執行所有子任務
    if (await this.holidayService.isHoliday(date)) {
      this.logger.log(`${date} 為休假日，跳過所有上市櫃行情更新`);
      return;
    }

    const updates = [
      [this.updateTwseIndicesQuotes, this.updateTpexIndicesQuotes],
      [this.updateTwseMarketTrades, this.updateTpexMarketTrades],
      [this.updateTwseIndicesTrades, this.updateTpexIndicesTrades],
      [this.updateTwseEquitiesQuotes, this.updateTpexEquitiesQuotes],
      [this.updateTwseEquitiesInstInvestorsTrades, this.updateTpexEquitiesInstInvestorsTrades],
    ];

    for (const group of updates) {
      await Promise.all(group.map(update => update.call(this, date)));
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    Logger.log(`${date} 上市櫃行情已更新`, TickerService.name);
  }

  @Cron('0 0 14 * * 1-5') // 14:00 - 開始收集指數收盤資料
  async updateTwseIndicesQuotes(customDate?: string) {
    const targetDate = customDate || await this.getTargetUpdateDate();
    
    // 先檢查目標日期是否為假日
    if (await this.holidayService.isHoliday(targetDate)) {
      Logger.log(`${targetDate} 上市指數收盤行情: 跳過假日`, TickerService.name);
      return;
    }

    // 檢查是否已有資料
    const existingCount = await this.tickerRepository.getTickerCount(targetDate, { 
      exchange: Exchange.TWSE, 
      type: TickerType.Index 
    });
    
    if (existingCount > 0) {
      Logger.log(`${targetDate} 上市指數收盤行情: 已有 ${existingCount} 筆資料，跳過更新`, TickerService.name);
      return;
    }

    const fetchedData = await this.twseScraperService.fetchIndicesQuotes({ date: targetDate });
    
    if (!fetchedData || fetchedData.length === 0) {
      Logger.warn(`${targetDate} 上市指數收盤行情: 尚無資料或非交易日`, TickerService.name);
      return;
    }

    const tickerData = fetchedData.map(ticker => ({
      date: ticker.date,
      type: TickerType.Index,
      exchange: Exchange.TWSE,
      market: Market.TSE,
      symbol: ticker.symbol,
      name: ticker.name,
      openPrice: ticker.openPrice,
      highPrice: ticker.highPrice,
      lowPrice: ticker.lowPrice,
      closePrice: ticker.closePrice,
      change: ticker.change,
      changePercent: ticker.changePercent,
    }));

    const result = await this.tickerRepository.smartBatchUpdate(tickerData);
    Logger.log(`${targetDate} 上市指數收盤行情: 已更新 ${result.updated} 筆，跳過 ${result.skipped} 筆`, TickerService.name);
  }

  @Cron('0 0 14 * * *')
  async updateTpexIndicesQuotes(date: string = DateTime.local().toISODate()) {
    await this.smartUpdate(
      date,
      '上櫃指數收盤行情',
      () => this.tpexScraperService.fetchIndicesQuotes({ date }),
      (data) => data.map(ticker => ({
        date: ticker.date,
        type: TickerType.Index,
        exchange: Exchange.TPEx,
        market: Market.OTC,
        symbol: ticker.symbol,
        name: ticker.name,
        openPrice: ticker.openPrice,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        closePrice: ticker.closePrice,
        change: ticker.change,
        changePercent: ticker.changePercent,
      })),
      { exchange: Exchange.TPEx, type: TickerType.Index }
    );
  }

  @Cron('0 30 14 * * *')
  async updateTwseMarketTrades(date: string = DateTime.local().toISODate()) {
    const updated = await this.twseScraperService.fetchMarketTrades({ date })
      .then(data => data && {
        date: data.date,
        type: TickerType.Index,
        exchange: Exchange.TWSE,
        market: Market.TSE,
        symbol: Index.TAIEX,
        tradeVolume: data.tradeVolume,
        tradeValue: data.tradeValue,
        transaction: data.transaction,
      })
      .then(ticker => ticker && this.tickerRepository.updateTicker(ticker));

    if (updated) Logger.log(`${date} 上市大盤成交量值: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上市大盤成交量值: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 30 14 * * *')
  async updateTpexMarketTrades(date: string = DateTime.local().toISODate()) {
    const updated = await this.tpexScraperService.fetchMarketTrades({ date })
      .then(data => data && {
        date: data.date,
        type: TickerType.Index,
        exchange: Exchange.TPEx,
        market: Market.OTC,
        symbol: Index.TPEX,
        tradeVolume: data.tradeVolume,
        tradeValue: data.tradeValue,
        transaction: data.transaction,
      })
      .then(ticker => ticker && this.tickerRepository.updateTicker(ticker));

    if (updated) Logger.log(`${date} 上櫃大盤成交量值: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上櫃大盤成交量值: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 0 15 * * *')
  async updateTwseIndicesTrades(date: string = DateTime.local().toISODate()) {
    const updated = await this.twseScraperService.fetchIndicesTrades({ date })
      .then(data => data && data.map(ticker => ({
        date: ticker.date,
        type: TickerType.Index,
        exchange: Exchange.TWSE,
        market: Market.TSE,
        symbol: ticker.symbol,
        tradeVolume: ticker.tradeVolume,
        tradeValue: ticker.tradeValue,
        tradeWeight: ticker.tradeWeight,
      })))
      .then(data => data && Promise.all(data.map(ticker => this.tickerRepository.updateTicker(ticker))));

    if (updated) Logger.log(`${date} 上市類股成交量值: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上市類股成交量值: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 0 15 * * *')
  async updateTpexIndicesTrades(date: string = DateTime.local().toISODate()) {
    const updated = await this.tpexScraperService.fetchIndicesTrades({ date })
      .then(data => data && data.map(ticker => ({
        date: ticker.date,
        type: TickerType.Index,
        exchange: Exchange.TPEx,
        market: Market.OTC,
        symbol: ticker.symbol,
        tradeVolume: ticker.tradeVolume,
        tradeValue: ticker.tradeValue,
        tradeWeight: ticker.tradeWeight,
      })))
      .then(data => data && Promise.all(data.map(ticker => this.tickerRepository.updateTicker(ticker))));

    if (updated) Logger.log(`${date} 上櫃類股成交量值: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上櫃類股成交量值: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 0 15-21/2 * * *')
  async updateTwseEquitiesQuotes(date: string = DateTime.local().toISODate()) {
    const updated = await this.twseScraperService.fetchEquitiesQuotes({ date })
      .then(data => data && data.map(ticker => ({
        date: ticker.date,
        type: TickerType.Equity,
        exchange: Exchange.TWSE,
        market: Market.TSE,
        symbol: ticker.symbol,
        name: ticker.name,
        openPrice: ticker.openPrice,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        closePrice: ticker.closePrice,
        change: ticker.change,
        changePercent: ticker.changePercent,
        tradeVolume: ticker.tradeVolume,
        tradeValue: ticker.tradeValue,
        transaction: ticker.transaction,
      })))
      .then(data => data && Promise.all(data.map(ticker => this.tickerRepository.updateTicker(ticker))));

    if (updated) Logger.log(`${date} 上市個股收盤行情: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上市個股收盤行情: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 0 15-21/2 * * *')
  async updateTpexEquitiesQuotes(date: string = DateTime.local().toISODate()) {
    const updated = await this.tpexScraperService.fetchEquitiesQuotes({ date })
      .then(data => data && data.map(ticker => ({ ...ticker,
        date: ticker.date,
        type: TickerType.Equity,
        exchange: Exchange.TPEx,
        market: Market.OTC,
        symbol: ticker.symbol,
        name: ticker.name,
        openPrice: ticker.openPrice,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        closePrice: ticker.closePrice,
        change: ticker.change,
        changePercent: ticker.changePercent,
        tradeVolume: ticker.tradeVolume,
        tradeValue: ticker.tradeValue,
        transaction: ticker.transaction,
      })))
      .then(data => data && Promise.all(data.map(ticker => this.tickerRepository.updateTicker(ticker))));

    if (updated) Logger.log(`${date} 上櫃個股收盤行情: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上櫃個股收盤行情: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 30 16 * * *')
  async updateTwseEquitiesInstInvestorsTrades(date: string = DateTime.local().toISODate()) {
    const updated = await this.twseScraperService.fetchEquitiesInstInvestorsTrades({ date })
      .then(data => data && data.map(ticker => ({
        date: ticker.date,
        type: TickerType.Equity,
        exchange: Exchange.TWSE,
        market: Market.TSE,
        symbol: ticker.symbol,
        finiNetBuySell: ticker.finiNetBuySell,
        sitcNetBuySell: ticker.sitcNetBuySell,
        dealersNetBuySell: ticker.dealersNetBuySell,
      })))
      .then(data => data && Promise.all(data.map(ticker => this.tickerRepository.updateTicker(ticker))));

    if (updated) Logger.log(`${date} 上市個股法人進出: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上市個股法人進出: 尚無資料或非交易日`, TickerService.name);
  }

  @Cron('0 30 16 * * *')
  async updateTpexEquitiesInstInvestorsTrades(date: string = DateTime.local().toISODate()) {
    const updated = await this.tpexScraperService.fetchEquitiesInstInvestorsTrades({ date })
      .then(data => data && data.map(ticker => ({
        date: ticker.date,
        type: TickerType.Equity,
        exchange: Exchange.TPEx,
        market: Market.OTC,
        symbol: ticker.symbol,
        finiNetBuySell: ticker.finiNetBuySell,
        sitcNetBuySell: ticker.sitcNetBuySell,
        dealersNetBuySell: ticker.dealersNetBuySell,
      })))
      .then(data => data && Promise.all(data.map(ticker => this.tickerRepository.updateTicker(ticker))));

    if (updated) Logger.log(`${date} 上櫃個股法人進出: 已更新`, TickerService.name);
    else Logger.warn(`${date} 上櫃個股法人進出: 尚無資料或非交易日`, TickerService.name);
  }
}
