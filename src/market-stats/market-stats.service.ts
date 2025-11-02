import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { MarketStatsRepository } from './market-stats.repository';
import { TwseScraperService } from '../scraper/twse-scraper.service';
import { TaifexScraperService } from '../scraper/taifex-scraper.service';
import { TdccScraperService } from '../scraper/tdcc-scraper.service';
import { UsdtScraperService } from '../scraper/usdt-scraper.service';
import { HolidayService } from '../common/holiday.service';
import { ApiStatusService } from '../common/api-status.service';

@Injectable()
export class MarketStatsService {
  private readonly logger = new Logger(MarketStatsService.name);

  constructor(
    private readonly marketStatsRepository: MarketStatsRepository,
    private readonly twseScraperService: TwseScraperService,
    private readonly taifexScraperService: TaifexScraperService,
    private readonly tdccScraperService: TdccScraperService,
    private readonly usdtScraperService: UsdtScraperService,
    private readonly holidayService: HolidayService,
    private readonly apiStatusService: ApiStatusService,
  ) {}

  /**
   * 決定要更新的目標日期
   * 規則：
   * 1. 如果是工作日且時間 >= 15:00 或 >= 20:00，使用當日
   * 2. 否則使用上一個工作日
   */
  private async getTargetUpdateDate(): Promise<string> {
    const now = DateTime.local();
    const today = now.toISODate();
    const currentHour = now.hour;
    
    // 檢查今天是否為工作日
    const isTodayWorkingDay = !(await this.holidayService.isHoliday(today));
    
    // 如果今天是工作日且時間已到 15:00 或 20:00
    if (isTodayWorkingDay && (currentHour >= 15 || currentHour >= 20)) {
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
   * 手動觸發完整的大盤籌碼更新
   */
  async updateMarketStats(customDate?: string) {
    const targetDate = customDate || await this.getTargetUpdateDate();
    
    // 提前檢查是否為休假日，避免執行所有子任務
    if (await this.holidayService.isHoliday(targetDate)) {
      this.logger.log(`${targetDate} 為休假日，跳過所有大盤籌碼更新`);
      return;
    }

    const updates = [
      this.updateTaiex,
      this.updateInstInvestorsTrades,
      this.updateMarginTransactions,
      this.updateFiniTxfNetOi,
      this.updateFiniTxoNetOiValue,
      this.updateLargeTradersTxfNetOi,
      this.updateRetailMxfPosition,
      this.updateTxoPutCallRatio,
      this.updateUsdTwdRate,
    ];

    for (const update of updates) {
      await update.call(this, targetDate);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    Logger.log(`${targetDate} 大盤籌碼已更新`, MarketStatsService.name);
  }

  /**
   * 晚上 8 點完整大盤更新比對
   */
  @Cron('0 0 20 * * 1-5') // 週一到週五晚上 8 點執行
  async scheduledFullUpdateEvening() {
    this.logger.log('🌙 開始執行晚上 20:00 完整大盤更新比對');
    await this.updateMarketStats();
  }

  @Cron('0 0 15 * * 1-5') // 15:00 - 收集大盤加權指數和成交量
  async updateTaiex(customDate?: string) {
    const targetDate = customDate || await this.getTargetUpdateDate();
    
    // 先檢查目標日期是否為假日
    if (await this.holidayService.isHoliday(targetDate)) {
      Logger.log(`${targetDate} 集中市場加權指數: 跳過假日`, MarketStatsService.name);
      return;
    }

    const fetchedData = await this.twseScraperService.fetchMarketTrades({ date: targetDate });
    
    if (!fetchedData) {
      this.apiStatusService.logApiResult(targetDate, 'TWSE_MARKET_TRADES', '集中市場加權指數', false);
      return;
    }

    const dataToUpdate = {
      date: fetchedData.date,
      taiexPrice: fetchedData.price,
      taiexChange: fetchedData.change,
      taiexTradeValue: fetchedData.tradeValue,
    };

    const result = await this.marketStatsRepository.smartUpdate(dataToUpdate);
    
    if (result.updated) {
      const reasonText = result.reason === 'new_data' ? '新增' : '更新';
      Logger.log(`${targetDate} 集中市場加權指數: 已${reasonText}`, MarketStatsService.name);
    } else {
      Logger.log(`${targetDate} 集中市場加權指數: 資料相同，跳過更新`, MarketStatsService.name);
    }
  }

  @Cron('0 30 15 * * 1-5') // 15:30 - 收集三大法人買賣超資料
  async updateInstInvestorsTrades(customDate?: string) {
    const targetDate = customDate || await this.getTargetUpdateDate();
    
    // 先檢查目標日期是否為假日
    if (await this.holidayService.isHoliday(targetDate)) {
      Logger.log(`${targetDate} 集中市場三大法人買賣超: 跳過假日`, MarketStatsService.name);
      return;
    }

    const fetchedData = await this.twseScraperService.fetchInstInvestorsTrades({ date: targetDate });
    
    if (!fetchedData) {
      this.apiStatusService.logApiResult(targetDate, 'TWSE_BFI82U', '集中市場三大法人買賣超', false);
      return;
    }

    const dataToUpdate = {
      date: fetchedData.date,
      finiNetBuySell: fetchedData.finiNetBuySell,
      sitcNetBuySell: fetchedData.sitcNetBuySell,
      dealersNetBuySell: fetchedData.dealersNetBuySell,
    };

    const result = await this.marketStatsRepository.smartUpdate(dataToUpdate);
    
    if (result.updated) {
      const reasonText = result.reason === 'new_data' ? '新增' : '更新';
      Logger.log(`${targetDate} 集中市場三大法人買賣超: 已${reasonText}`, MarketStatsService.name);
    } else {
      Logger.log(`${targetDate} 集中市場三大法人買賣超: 資料相同，跳過更新`, MarketStatsService.name);
    }
  }

    @Cron('0 30 21 * * *')
  async updateMarginTransactions(date: string = DateTime.local().toISODate()) {
    // 先檢查假日
    if (await this.holidayService.isHoliday(date)) {
      Logger.log(`${date} 集中市場信用交易: 跳過假日`, MarketStatsService.name);
      return;
    }

    const fetchedData = await this.twseScraperService.fetchMarginTransactions({ date });
    
    if (!fetchedData) {
      this.apiStatusService.logApiResult(date, 'TWSE_MARGIN', '集中市場信用交易', false);
      return;
    }

    const dataToUpdate = {
      date: fetchedData.date,
      marginBalance: fetchedData.marginBalance,
      marginBalanceChange: fetchedData.marginBalanceChange,
      marginBalanceValue: fetchedData.marginBalanceValue,
      marginBalanceValueChange: fetchedData.marginBalanceValueChange,
      shortBalance: fetchedData.shortBalance,
      shortBalanceChange: fetchedData.shortBalanceChange,
    };

    const result = await this.marketStatsRepository.smartUpdate(dataToUpdate);
    
    if (result.updated) {
      const reasonText = result.reason === 'new_data' ? '新增' : '更新';
      Logger.log(`${date} 集中市場信用交易: 已${reasonText}`, MarketStatsService.name);
    } else {
      Logger.log(`${date} 集中市場信用交易: 資料相同，跳過更新`, MarketStatsService.name);
    }
  }

  @Cron('0 0 15 * * *')
  async updateFiniTxfNetOi(date: string = DateTime.local().toISODate()) {
    const updated = await this.taifexScraperService.fetchInstInvestorsTxfTrades({ date })
      .then(data => data && {
        date: data.date,
        finiTxfNetOi: data.finiTxfNetOi,
      })
      .then(data => data && this.marketStatsRepository.updateMarketStats(data));

    if (updated) Logger.log(`${date} 外資臺股期貨未平倉淨口數: 已更新`, MarketStatsService.name);
    else Logger.warn(`${date} 外資臺股期貨未平倉淨口數: 尚無資料或非交易日`, MarketStatsService.name);
  }

  @Cron('5 0 15 * * *')
  async updateFiniTxoNetOiValue(date: string = DateTime.local().toISODate()) {
    const updated = await this.taifexScraperService.fetchInstInvestorsTxoTrades({ date })
      .then(data => data && {
        date: data.date,
        finiTxoCallsNetOiValue: data.finiTxoCallsNetOiValue,
        finiTxoPutsNetOiValue: data.finiTxoPutsNetOiValue,
      })
      .then(data => data && this.marketStatsRepository.updateMarketStats(data));

    if (updated) Logger.log(`${date} 外資臺指選擇權未平倉淨金額: 已更新`, MarketStatsService.name);
    else Logger.warn(`${date} 外資臺指選擇權未平倉淨金額: 尚無資料或非交易日`, MarketStatsService.name);
  }

  @Cron('10 0 15 * * *')
  async updateLargeTradersTxfNetOi(date: string = DateTime.local().toISODate()) {
    const updated = await this.taifexScraperService.fetchLargeTradersTxfPosition({ date })
      .then(data => data && {
        date: data.date,
        topTenSpecificFrontMonthTxfNetOi: data.topTenSpecificFrontMonthTxfNetOi,
        topTenSpecificBackMonthsTxfNetOi: data.topTenSpecificBackMonthsTxfNetOi,
      })
      .then(data => data && this.marketStatsRepository.updateMarketStats(data));

    if (updated) Logger.log(`${date} 十大特法臺股期貨未平倉淨口數: 已更新`, MarketStatsService.name);
    else Logger.warn(`${date} 十大特法臺股期貨未平倉淨口數: 尚無資料或非交易日`, MarketStatsService.name);
  }

  @Cron('15 0 15 * * *')
  async updateRetailMxfPosition(date: string = DateTime.local().toISODate()) {
    const updated = await this.taifexScraperService.fetchRetailMxfPosition({ date })
      .then(data => data && {
        date: data.date,
        retailMxfNetOi: data.retailMxfNetOi,
        retailMxfLongShortRatio: data.retailMxfLongShortRatio,
      })
      .then(data => data && this.marketStatsRepository.updateMarketStats(data));

    if (updated) Logger.log(`${date} 散戶小台淨部位: 已更新`, MarketStatsService.name);
    else Logger.warn(`${date} 散戶小台淨部位: 尚無資料或非交易日`, MarketStatsService.name);
  }

  @Cron('20 0 15 * * *')
  async updateTxoPutCallRatio(date: string = DateTime.local().toISODate()) {
    const updated = await this.taifexScraperService.fetchTxoPutCallRatio({ date })
      .then(data => data && {
        date: data.date,
        txoPutCallRatio: data.txoPutCallRatio,
      })
      .then(data => data && this.marketStatsRepository.updateMarketStats(data));

    if (updated) Logger.log(`${date} 臺指選擇權 Put/Call Ratio: 已更新`, MarketStatsService.name);
    else Logger.warn(`${date} 臺指選擇權 Put/Call Ratio: 尚無資料或非交易日`, MarketStatsService.name);
  }

  @Cron('0 0 17 * * *')
  async updateUsdTwdRate(date: string = DateTime.local().toISODate()) {
    const updated = await this.taifexScraperService.fetchExchangeRates({ date })
      .then(data => data && {
        date: data.date,
        usdtwd: data.usdtwd,
      })
      .then(data => data && this.marketStatsRepository.updateMarketStats(data));

    if (updated) Logger.log(`${date} 美元兌新臺幣匯率: 已更新`, MarketStatsService.name);
    else Logger.warn(`${date} 美元兌新臺幣匯率: 尚無資料或非交易日`, MarketStatsService.name);
  }
}
