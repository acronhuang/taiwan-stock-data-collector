import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import * as numeral from 'numeral';
import { firstValueFrom } from 'rxjs';
import { safeGet } from '../common/security.utils';

@Injectable()
export class TwseScraperService {
  constructor(private httpService: HttpService) {}

  async fetchListedStocks(options?: { market: 'TSE' | 'OTC' }) {
    const market = options?.market ?? 'TSE';
    const url = {
      TSE: 'https://isin.twse.com.tw/isin/class_main.jsp?market=1&issuetype=1',
      OTC: 'https://isin.twse.com.tw/isin/class_main.jsp?market=2&issuetype=4',
    };
    const targetUrl = safeGet(
      url,
      market,
      'https://isin.twse.com.tw/isin/class_main.jsp?market=1&issuetype=1',
    );
    const response = await firstValueFrom(
      this.httpService.get(targetUrl, { responseType: 'arraybuffer' }),
    );
    const page = iconv.decode(response.data, 'big5');
    const $ = cheerio.load(page);

    return $('.h4 tr')
      .slice(1)
      .map((_, el) => {
        const td = $(el).find('td');
        return {
          symbol: td.eq(2).text().trim(),
          name: td.eq(3).text().trim(),
          market: td.eq(4).text().trim(),
          industry: td.eq(6).text().trim(),
        };
      })
      .toArray();
  }

  async fetchMarketTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/FMTQIK?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    return json.data
      .map((row) => {
        const [year, month, day] = row[0].split('/');
        return {
          date: `${+year + 1911}-${month.padStart(2, '0')}-${day.padStart(
            2,
            '0',
          )}`,
          tradeVolume: numeral(row[1]).value(),
          tradeValue: numeral(row[2]).value(),
          transaction: numeral(row[3]).value(),
          price: numeral(row[4]).value(),
          change: numeral(row[5]).value(),
        };
      })
      .find((data) => data.date === date);
  }

  async fetchMarketBreadth(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    const raw = json.tables[7].data.map((row) => row[2]);
    const [up, limitUp] = raw[0].replace(')', '').split('(');
    const [down, limitDown] = raw[1].replace(')', '').split('(');
    const [unchanged, unmatched, notApplicable] = raw.slice(2);

    return {
      date,
      up: numeral(up).value(),
      limitUp: numeral(limitUp).value(),
      down: numeral(down).value(),
      limitDown: numeral(limitDown).value(),
      unchanged: numeral(unchanged).value(),
      unmatched: numeral(unmatched).value() + numeral(notApplicable).value(),
    };
  }

  async fetchInstInvestorsTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      dayDate: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      type: 'day',
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/fund/BFI82U?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    const data = json.data
      .map((row) => row.slice(1))
      .flat()
      .map((row) => numeral(row).value());

    return {
      date,
      finiNetBuySell: data[11] + data[14],
      sitcNetBuySell: data[8],
      dealersNetBuySell: data[2] + data[5],
    };
  }

  async fetchMarginTransactions(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      selectType: 'MS',
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    const data = json.tables[0].data
      .map((data) => data.slice(1))
      .flat()
      .map((data) => numeral(data).value());

    return {
      date,
      marginBalance: data[4],
      marginBalanceChange: data[4] - data[3],
      marginBalanceValue: data[14],
      marginBalanceValueChange: data[14] - data[13],
      shortBalance: data[9],
      shortBalanceChange: data[9] - data[8],
    };
  }

  /**
   * 取得指數定義清單
   */
  private getIndicesDefinitions() {
    return [
      { symbol: 'IX0001', name: '發行量加權股價指數' },
      { symbol: 'IX0007', name: '未含金融保險股指數' },
      { symbol: 'IX0008', name: '未含電子股指數' },
      { symbol: 'IX0009', name: '未含金融電子股指數' },
      { symbol: 'IX0010', name: '水泥類指數' },
      { symbol: 'IX0011', name: '食品類指數' },
      { symbol: 'IX0012', name: '塑膠類指數' },
      { symbol: 'IX0016', name: '紡織纖維類指數' },
      { symbol: 'IX0017', name: '電機機械類指數' },
      { symbol: 'IX0018', name: '電器電纜類指數' },
      { symbol: 'IX0019', name: '化學生技醫療類指數' },
      { symbol: 'IX0020', name: '化學類指數' },
      { symbol: 'IX0021', name: '生技醫療類指數' },
      { symbol: 'IX0022', name: '玻璃陶瓷類指數' },
      { symbol: 'IX0023', name: '造紙類指數' },
      { symbol: 'IX0024', name: '鋼鐵類指數' },
      { symbol: 'IX0025', name: '橡膠類指數' },
      { symbol: 'IX0026', name: '汽車類指數' },
      { symbol: 'IX0027', name: '電子工業類指數' },
      { symbol: 'IX0028', name: '半導體類指數' },
      { symbol: 'IX0029', name: '電腦及週邊設備類指數' },
      { symbol: 'IX0030', name: '光電類指數' },
      { symbol: 'IX0031', name: '通信網路類指數' },
      { symbol: 'IX0032', name: '電子零組件類指數' },
      { symbol: 'IX0033', name: '電子通路類指數' },
      { symbol: 'IX0034', name: '資訊服務類指數' },
      { symbol: 'IX0035', name: '其他電子類指數' },
      { symbol: 'IX0036', name: '建材營造類指數' },
      { symbol: 'IX0037', name: '航運類指數' },
      { symbol: 'IX0038', name: '觀光類指數' },
      { symbol: 'IX0039', name: '金融保險類指數' },
      { symbol: 'IX0040', name: '貿易百貨類指數' },
      { symbol: 'IX0041', name: '油電燃氣類指數' },
      { symbol: 'IX0185', name: '綠能環保類指數' },
      { symbol: 'IX0186', name: '數位雲端類指數' },
      { symbol: 'IX0187', name: '運動休閒類指數' },
      { symbol: 'IX0188', name: '居家生活類指數' },
      { symbol: 'IX0042', name: '其他類指數' },
    ];
  }

  /**
   * 處理指數報價資料並計算 OHLC
   */
  private processIndicesQuotes(
    quotes: Array<{
      date: string;
      time: string;
      symbol: string;
      name: string;
      price: number;
    }>,
  ) {
    return _(quotes)
      .groupBy('symbol')
      .map((quotes) => {
        const [prev, ...rows] = quotes;
        const { date, symbol, name } = prev;
        const data: {
          date: string;
          symbol: string;
          name: string;
          openPrice: number;
          highPrice: number;
          lowPrice: number;
          closePrice: number;
          change: number;
          changePercent: number;
        } = {
          date,
          symbol,
          name,
          openPrice: _.minBy(rows, 'time')?.price || 0,
          highPrice: _.maxBy(rows, 'price')?.price || 0,
          lowPrice: _.minBy(rows, 'price')?.price || 0,
          closePrice: _.maxBy(rows, 'time')?.price || 0,
          change: 0,
          changePercent: 0,
        };
        data.change = numeral(data.closePrice).subtract(prev.price).value();
        data.changePercent = +numeral(data.change)
          .divide(prev.price)
          .multiply(100)
          .format('0.00');
        return data;
      })
      .value();
  }

  async fetchIndicesQuotes(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_INDEX?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    const indices = this.getIndicesDefinitions();

    const quotes = json.data.flatMap((row) => {
      const [time, ...values] = row;
      return values.map((value, i) => ({
        date,
        time,
        symbol: indices[i]?.symbol || '',
        name: indices[i]?.name || '',
        price: numeral(value).value(),
      }));
    });

    return this.processIndicesQuotes(quotes);
  }

  async fetchIndicesTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/BFIAMU?${query}`;
    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    const market = await this.fetchMarketTrades({ date });
    if (!market) {
      return null;
    }

    const indices = [
      { symbol: 'IX0010', name: '水泥類指數' },
      { symbol: 'IX0011', name: '食品類指數' },
      { symbol: 'IX0012', name: '塑膠類指數' },
      { symbol: 'IX0016', name: '紡織纖維類指數' },
      { symbol: 'IX0017', name: '電機機械類指數' },
      { symbol: 'IX0018', name: '電器電纜類指數' },
      { symbol: 'IX0019', name: '化學生技醫療類指數' },
      { symbol: 'IX0020', name: '化學類指數' },
      { symbol: 'IX0021', name: '玻璃陶瓷類指數' },
      { symbol: 'IX0022', name: '玻璃陶瓷類指數' },
      { symbol: 'IX0023', name: '造紙類指數' },
      { symbol: 'IX0024', name: '鋼鐵類指數' },
      { symbol: 'IX0025', name: '橡膠類指數' },
      { symbol: 'IX0026', name: '汽車類指數' },
      { symbol: 'IX0027', name: '電子工業類指數' },
      { symbol: 'IX0028', name: '半導體類指數' },
      { symbol: 'IX0029', name: '電腦及週邊設備類指數' },
      { symbol: 'IX0030', name: '光電類指數' },
      { symbol: 'IX0031', name: '通信網路類指數' },
      { symbol: 'IX0032', name: '電子零組件類指數' },
      { symbol: 'IX0033', name: '電子通路類指數' },
      { symbol: 'IX0034', name: '資訊服務類指數' },
      { symbol: 'IX0035', name: '其他電子類指數' },
      { symbol: 'IX0036', name: '建材營造類指數' },
      { symbol: 'IX0037', name: '航運類指數' },
      { symbol: 'IX0038', name: '觀光事業類指數' },
      { symbol: 'IX0039', name: '金融保險類指數' },
      { symbol: 'IX0040', name: '貿易百貨類指數' },
      { symbol: 'IX0041', name: '油電燃氣類指數' },
      { symbol: 'IX0042', name: '其他類指數' },
      { symbol: 'IX0185', name: '綠能環保類指數' },
      { symbol: 'IX0186', name: '數位雲端類指數' },
      { symbol: 'IX0187', name: '運動休閒類指數' },
      { symbol: 'IX0188', name: '居家生活類指數' },
    ];

    return json.data.map((row, i) => {
      const { symbol, name } = indices[i];
      const tradeValue = numeral(row[2]).value();
      const data: {
        date: string;
        symbol: string;
        name: string;
        tradeVolume: number;
        tradeValue: number;
        tradeWeight: number;
      } = {
        date,
        symbol,
        name,
        tradeVolume: numeral(row[1]).value(),
        tradeValue,
        tradeWeight: +numeral(tradeValue)
          .divide(market.tradeValue)
          .multiply(100)
          .format('0.00'),
      };
      return data;
    });
  }

  async fetchEquitiesQuotes(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      type: 'ALLBUT0999',
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?${query}`;

    console.log(`🔍 TWSE API URL: ${url}`);
    const response = await firstValueFrom(this.httpService.get(url));
    console.log(`📊 TWSE API 狀態: ${response.data.stat}`);
    console.log(`📈 Tables 數量: ${response.data.tables?.length || 0}`);
    console.log(`📋 Table 8 資料數量: ${response.data.tables?.[8]?.data?.length || 0}`);
    
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      console.log('❌ TWSE API 無有效資料');
      return null;
    }

    return json.tables[8].data.map((row) => {
      // TWSE API 欄位順序: [證券代號, 證券名稱, 成交股數, 成交筆數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌(+/-), 漲跌價差, 最後揭示買價, 最後揭示買量, 最後揭示賣價, 最後揭示賣量, 本益比, 殖利率(%)]
      const [symbol, name, tradeVolume, transaction, tradeValue, openPrice, highPrice, lowPrice, closePrice, direction, change] = row;
      
      const parsedClosePrice = numeral(closePrice).value();
      const parsedChange = direction === '<p style="color:green">' 
        ? -numeral(change).value() 
        : numeral(change).value();

      const data: {
        date: string;
        symbol: string;
        name: string;
        openPrice: number;
        highPrice: number;
        lowPrice: number;
        closePrice: number;
        tradeVolume: number;
        tradeValue: number;
        transaction: number;
        change: number;
        changePercent: number;
      } = {
        date,
        symbol,
        name,
        openPrice: numeral(openPrice).value(),
        highPrice: numeral(highPrice).value(),
        lowPrice: numeral(lowPrice).value(),
        closePrice: parsedClosePrice,
        tradeVolume: numeral(tradeVolume).value(),
        tradeValue: numeral(tradeValue).value(),
        transaction: numeral(transaction).value(),
        change: parsedChange,
        changePercent: parsedClosePrice && parsedChange
          ? +numeral(parsedChange)
              .divide(parsedClosePrice - parsedChange)
              .multiply(100)
              .format('0.00')
          : 0,
      };
      return data;
    });
  }

  async fetchEquitiesInstInvestorsTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      selectType: 'ALLBUT0999',
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/fund/T86?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    return json.data.map((row) => {
      const [symbol, name, ...values] = row;
      const data: {
        date: string;
        symbol: string;
        name: string;
        finiNetBuySell: number;
        sitcNetBuySell: number;
        dealersNetBuySell: number;
      } = {
        date,
        symbol,
        name,
        finiNetBuySell: numeral(values[4]).value() + numeral(values[7]).value(), // 外陸資買賣超 + 外資自營商買賣超
        sitcNetBuySell: numeral(values[10]).value(), // 投信買賣超
        dealersNetBuySell: numeral(values[11]).value(), // 自營商買賣超
      };
      return data;
    });
  }

  async fetchEquitiesValues(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const query = new URLSearchParams({
      date: DateTime.fromISO(date).toFormat('yyyyMMdd'),
      selectType: 'ALL',
      response: 'json',
    });
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.stat === 'OK' && response.data;
    if (!json) {
      return null;
    }

    return json.data.map((row) => {
      const [symbol, name, ...values] = row;
      const data: {
        date: string;
        symbol: string;
        name: string;
        peRatio: number;
        pbRatio: number;
        dividendYield: number;
        dividendYear: number;
      } = {
        date,
        symbol,
        name,
        peRatio: numeral(values[2]).value(),
        pbRatio: numeral(values[3]).value(),
        dividendYield: numeral(values[0]).value(),
        dividendYear: numeral(values[1]).value(),
      };
      return data;
    });
  }
}
