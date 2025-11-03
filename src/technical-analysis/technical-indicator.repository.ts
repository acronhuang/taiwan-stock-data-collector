import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TechnicalIndicator,
  TechnicalIndicatorDocument,
} from './technical-indicator.schema';

@Injectable()
export class TechnicalIndicatorRepository {
  constructor(
    @InjectModel(TechnicalIndicator.name)
    private readonly model: Model<TechnicalIndicatorDocument>,
  ) {}

  /**
   * 更新或新增技術指標資料
   */
  async upsertTechnicalIndicator(
    data: Partial<TechnicalIndicator>,
  ): Promise<TechnicalIndicatorDocument> {
    const { date, symbol } = data;
    return this.model.findOneAndUpdate(
      { date, symbol },
      data,
      { upsert: true, new: true },
    );
  }

  /**
   * 批次更新技術指標
   */
  async batchUpsert(
    indicators: Partial<TechnicalIndicator>[],
  ): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;

    for (const indicator of indicators) {
      try {
        await this.upsertTechnicalIndicator(indicator);
        updated++;
      } catch (error) {
        errors++;
        console.error(
          `Error updating technical indicator for ${indicator.symbol} on ${indicator.date}:`,
          error.message,
        );
      }
    }

    return { updated, errors };
  }

  /**
   * 取得指定股票的技術指標歷史資料
   */
  async getTechnicalIndicators(
    symbol: string,
    startDate?: string,
    endDate?: string,
    limit?: number,
  ): Promise<TechnicalIndicatorDocument[]> {
    const query: any = { symbol };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    let queryBuilder = this.model.find(query).sort({ date: -1 });

    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }

    return queryBuilder.exec();
  }

  /**
   * 取得最新的技術指標資料
   */
  async getLatestTechnicalIndicator(
    symbol: string,
  ): Promise<TechnicalIndicatorDocument | null> {
    // 只取有技術指標資料的記錄（ma5 不為 null）
    return this.model.findOne({ 
      symbol, 
      ma5: { $ne: null }
    }).sort({ date: -1 }).exec();
  }

  /**
   * 取得所有股票在指定日期的技術指標
   */
  async getTechnicalIndicatorsByDate(
    date: string,
  ): Promise<TechnicalIndicatorDocument[]> {
    return this.model.find({ date }).sort({ symbol: 1 }).exec();
  }

  /**
   * 取得技術評分前N名的股票
   */
  async getTopRatedStocks(
    date: string,
    limit: number = 20,
  ): Promise<TechnicalIndicatorDocument[]> {
    return this.model
      .find({ date })
      .sort({ technicalScore: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * 取得有買進信號的股票
   */
  async getBuySignalStocks(
    date: string,
  ): Promise<TechnicalIndicatorDocument[]> {
    return this.model
      .find({
        date,
        $or: [
          { 'signals.macdBuy': true },
          { 'signals.kdGoldenCross': true },
          { 'signals.rsiOversold': true },
          { 'signals.volumeBreakout': true },
          { 'signals.priceBreakout': true },
        ],
      })
      .sort({ technicalScore: -1 })
      .exec();
  }

  /**
   * 取得有賣出信號的股票
   */
  async getSellSignalStocks(
    date: string,
  ): Promise<TechnicalIndicatorDocument[]> {
    return this.model
      .find({
        date,
        $or: [
          { 'signals.macdSell': true },
          { 'signals.kdDeathCross': true },
          { 'signals.rsiOverbought': true },
        ],
      })
      .sort({ technicalScore: 1 })
      .exec();
  }

  /**
   * 檢查是否已有技術指標資料
   */
  async hasTechnicalIndicator(date: string, symbol: string): Promise<boolean> {
    const count = await this.model.countDocuments({ date, symbol });
    return count > 0;
  }

  /**
   * 取得指定日期範圍內的資料筆數統計
   */
  async getDataCount(
    startDate?: string,
    endDate?: string,
    symbol?: string,
  ): Promise<number> {
    const query: any = {};

    if (symbol) query.symbol = symbol;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    return this.model.countDocuments(query);
  }

  /**
   * 刪除指定日期之前的舊資料
   */
  async deleteOldData(beforeDate: string): Promise<number> {
    const result = await this.model.deleteMany({ date: { $lt: beforeDate } });
    return result.deletedCount;
  }

  /**
   * 獲取所有已計算技術指標的日期
   */
  async getAllDates(): Promise<string[]> {
    return this.model.distinct('date');
  }

  /**
   * upsert方法別名
   */
  async upsert(data: Partial<TechnicalIndicator>): Promise<TechnicalIndicatorDocument> {
    return this.upsertTechnicalIndicator(data);
  }

  /**
   * 查找單一技術指標
   */
  async findOne(symbol: string, date: string): Promise<TechnicalIndicatorDocument | null> {
    return this.model.findOne({ symbol, date }).exec();
  }

  /**
   * 查找最新技術指標
   */
  async findLatest(symbol: string): Promise<TechnicalIndicatorDocument | null> {
    return this.getLatestTechnicalIndicator(symbol);
  }

  /**
   * 按日期查找技術指標
   */
  async findByDate(date: string): Promise<TechnicalIndicatorDocument[]> {
    return this.getTechnicalIndicatorsByDate(date);
  }
}