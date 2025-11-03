import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type TechnicalIndicatorDocument = HydratedDocument<TechnicalIndicator>;

// 定義信號類型接口
export interface TechnicalSignals {
  macdBuy: boolean;
  macdSell: boolean;
  rsiOverbought: boolean;
  rsiOversold: boolean;
  kdGoldenCross: boolean;
  kdDeathCross: boolean;
  volumeBreakout: boolean;
  priceBreakout: boolean;
  bollingerBuySignal: boolean;
  bollingerSellSignal: boolean;
  williamsOversold: boolean;
  williamsOverbought: boolean;
}

@Schema({ timestamps: true })
export class TechnicalIndicator {
  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  symbol: string;

  @Prop()
  name: string;

  @Prop()
  type: string; // 'stock' | 'index' | 'market'

  // 價格資料
  @Prop()
  openPrice: number;

  @Prop()
  highPrice: number;

  @Prop()
  lowPrice: number;

  @Prop()
  closePrice: number;

  @Prop()
  volume: number;

  // 移動平均線 (Moving Averages)
  @Prop()
  ma5: number; // 5日移動平均

  @Prop()
  ma10: number; // 10日移動平均

  @Prop()
  ma20: number; // 20日移動平均

  @Prop()
  ma60: number; // 60日移動平均

  @Prop()
  ma120: number; // 120日移動平均

  @Prop()
  ma240: number; // 240日移動平均

  // 指數移動平均線 (Exponential Moving Averages)
  @Prop()
  ema12: number; // 12日EMA

  @Prop()
  ema26: number; // 26日EMA

  // MACD 指標
  @Prop()
  macd: number; // MACD線

  @Prop()
  macdSignal: number; // MACD信號線

  @Prop()
  macdHistogram: number; // MACD柱狀圖

  // RSI 相對強弱指標
  @Prop()
  rsi6: number; // 6日RSI

  @Prop()
  rsi12: number; // 12日RSI

  @Prop()
  rsi24: number; // 24日RSI

  // KD 隨機指標
  @Prop()
  k9: number; // 9日K值

  @Prop()
  d9: number; // 9日D值

  // 威廉指標 (Williams %R)
  @Prop()
  wr10: number; // 10日威廉指標

  @Prop()
  wr20: number; // 20日威廉指標

  // 布林通道 (Bollinger Bands)
  @Prop()
  bbUpper: number; // 布林通道上軌

  @Prop()
  bbMiddle: number; // 布林通道中軌 (20MA)

  @Prop()
  bbLower: number; // 布林通道下軌

  @Prop()
  bbWidth: number; // 布林通道寬度

  // 成交量指標
  @Prop()
  volumeMa5: number; // 5日成交量均值

  @Prop()
  volumeMa20: number; // 20日成交量均值

  @Prop()
  volumeRatio: number; // 量比 (當日成交量/平均成交量)

  // 價格強度指標
  @Prop()
  priceStrength: number; // 價格強度 (收盤價相對於區間的位置)

  // 趨勢指標
  @Prop()
  trendDirection: string; // 'up' | 'down' | 'sideways'

  @Prop()
  trendStrength: number; // 趨勢強度 (0-100)

  // 支撐阻力位
  @Prop()
  supportLevel: number; // 支撐位

  @Prop()
  resistanceLevel: number; // 阻力位

  // 買賣信號 - 使用 Mixed 類型
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  signals: TechnicalSignals;

  // 綜合評分
  @Prop()
  technicalScore: number; // 技術面綜合評分 (-100 to 100)

  @Prop()
  recommendation: string; // 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
}

export const TechnicalIndicatorSchema = SchemaFactory.createForClass(
  TechnicalIndicator,
).index({ date: -1, symbol: 1 }, { unique: true });