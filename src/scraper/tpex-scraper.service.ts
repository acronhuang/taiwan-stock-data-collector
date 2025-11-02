import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import * as numeral from 'numeral';
import { firstValueFrom } from 'rxjs';
import { safeGet } from '../common/security.utils';

@Injectable()
export class TpexScraperService {
  constructor(private httpService: HttpService) {}

  async fetchMarketTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_index/st41_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables 而不是 iTotalRecords/aaData
    const json = response.data.tables?.[0]?.totalCount > 0 && response.data;
    if (!json) {
      return null;
    }

    return json.tables[0].data
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
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/aftertrading/market_highlight/highlight_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables
    const json = response.data.tables?.[0]?.data?.length > 0 && response.data;
    if (!json) {
      return null;
    }

    // 新結構：data[0] = [上櫃家數, 總資本額, 總市值, 成交值, 成交股數, 收市指數, 指數漲跌, 上漲家數, 漲停, 下跌, 跌停, 平盤, 未成交]
    const row = json.tables[0].data[0];
    return {
      date,
      up: numeral(row[7]).value(),
      limitUp: numeral(row[8]).value(),
      down: numeral(row[9]).value(),
      limitDown: numeral(row[10]).value(),
      unchanged: numeral(row[11]).value(),
      unmatched: numeral(row[12]).value(),
    };
  }

  async fetchInstInvestorsTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      t: 'D',
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/3insti/3insti_summary/3itrdsum_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables
    const json = response.data.tables?.[0]?.data?.length > 0 && response.data;
    if (!json) {
      return null;
    }

    // 新結構：data 陣列包含各法人的買賣超資料
    // [0] = 外資及陸資合計, [3] = 投信, [4] = 自營商合計
    const data = json.tables[0].data;

    return {
      date,
      finiNetBuySell: numeral(data[0][3]).value(), // 外資買賣超
      sitcNetBuySell: numeral(data[3][3]).value(), // 投信買賣超
      dealersBuySell: numeral(data[4][3]).value(), // 自營商買賣超
    };
  }

  async fetchMarginTransactions(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/margin_trading/margin_balance/margin_bal_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.iTotalRecords > 0 && response.data;
    if (!json) {
      return null;
    }

    const data = [...json.tfootData_one, ...json.tfootData_two]
      .map((row) => numeral(row).value())
      .filter((row) => row);

    return {
      date,
      marginBalance: data[4],
      marginBalanceChange: data[4] - data[0],
      marginBalanceValue: data[14],
      marginBalanceValueChange: data[14] - data[10],
      shortBalance: data[9],
      shortBalanceChange: data[9] - data[5],
    };
  }

  async fetchIndicesQuotes(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    // 使用市場焦點指標 API 替代已失效的每分鐘指數 API
    const url = `https://www.tpex.org.tw/web/stock/aftertrading/market_highlight/highlight_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables
    const json = response.data.tables?.[0]?.data?.length > 0 && response.data;
    if (!json) {
      return null;
    }

    // 從市場焦點指標提取櫃買指數資料
    // 欄位：[上櫃家數, 總資本額, 總市值, 成交值, 成交股數, 收市指數, 指數漲跌, 上漲家數, ...]
    const row = json.tables[0].data[0];

    // 驗證資料完整性
    if (!row || row.length < 7) {
      return null;
    }

    const closePrice = numeral(row[5]).value(); // 收市指數
    const change = numeral(row[6]).value(); // 指數漲跌

    // 驗證數值有效性
    if (closePrice === null || change === null || closePrice <= 0) {
      return null;
    }

    // 計算開盤價（收盤價 - 漲跌）
    const openPrice = numeral(closePrice).subtract(change).value();

    // 確保開盤價為正值
    if (openPrice <= 0) {
      return null;
    }

    // 由於這個 API 只提供收盤資料，我們只能返回櫃買指數
    return [
      {
        date,
        symbol: 'IX0043',
        name: '櫃買指數',
        openPrice: openPrice,
        highPrice: Math.max(openPrice, closePrice), // 取開盤和收盤的較高者
        lowPrice: Math.min(openPrice, closePrice), // 取開盤和收盤的較低者
        closePrice: closePrice,
        change: change,
        changePercent:
          change !== 0
            ? +numeral(change).divide(openPrice).multiply(100).format('0.00')
            : 0,
      },
    ];
  }

  async fetchIndicesTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/historical/trading_vol_ratio/sectr_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables
    const json = response.data.tables?.[0]?.data?.length > 0 && response.data;
    if (!json) {
      return null;
    }

    const sectorMappings = {
      光電業: { symbol: 'IX0055', name: '櫃買光電業類指數' },
      其他: { symbol: 'IX0100', name: '櫃買其他類指數' },
      其他電子業: { symbol: 'IX0099', name: '櫃買其他電子類指數' },
      化學工業: { symbol: 'IX0051', name: '櫃買化工類指數' },
      半導體業: { symbol: 'IX0053', name: '櫃買半導體類指數' },
      居家生活: { symbol: 'IX0191', name: '櫃買居家生活類指數' },
      建材營造: { symbol: 'IX0048', name: '櫃買營建類指數' },
      數位雲端: { symbol: 'IX0190', name: '櫃買數位雲端類指數' },
      文化創意業: { symbol: 'IX0075', name: '櫃買文化創意業類指數' },
      生技醫療: { symbol: 'IX0052', name: '櫃買生技醫療類指數' },
      紡織纖維: { symbol: 'IX0044', name: '櫃買紡纖類指數' },
      綠能環保: { symbol: 'IX0189', name: '櫃買綠能環保類指數' },
      航運業: { symbol: 'IX0049', name: '櫃買航運類指數' },
      觀光餐旅: { symbol: 'IX0050', name: '櫃買觀光類指數' },
      資訊服務業: { symbol: 'IX0059', name: '櫃買資訊服務類指數' },
      通信網路業: { symbol: 'IX0056', name: '櫃買通信網路類指數' },
      鋼鐵工業: { symbol: 'IX0046', name: '櫃買鋼鐵類指數' },
      電子通路業: { symbol: 'IX0058', name: '櫃買電子通路類指數' },
      電子零組件業: { symbol: 'IX0057', name: '櫃買電子零組件類指數' },
      電機機械: { symbol: 'IX0045', name: '櫃買機械類指數' },
      電腦及週邊設備業: { symbol: 'IX0054', name: '櫃買電腦及週邊類指數' },
    };

    const electronics = [
      'IX0053',
      'IX0054',
      'IX0055',
      'IX0056',
      'IX0057',
      'IX0058',
      'IX0059',
      'IX0099',
    ];

    // 新結構：tables[0].data 包含類股資料
    // 欄位：[類股名稱, 成交金額(元), 成交比重(%), 成交股數, 成交比重(%)]
    const data = json.tables[0].data.map((row) => {
      const [sector, tradeValue, tradeWeight] = row;
      return {
        date,
        symbol: safeGet(sectorMappings, sector, { symbol: '', name: '' })
          ?.symbol,
        name: safeGet(sectorMappings, sector, { symbol: '', name: '' })?.name,
        tradeValue: numeral(tradeValue).value(),
        tradeWeight: numeral(tradeWeight).value(),
      };
    });

    const [electronic] = _(data)
      .filter((data) => electronics.includes(data.symbol))
      .groupBy((_) => 'IX0047')
      .map((data, symbol) => ({
        date,
        symbol,
        name: '櫃買電子類指數',
        tradeValue: _.sumBy(data, 'tradeValue'),
        tradeWeight: +numeral(_.sumBy(data, 'tradeWeight')).format('0.00'),
      }))
      .value();

    return [...data, electronic].filter((index) => index.symbol);
  }

  async fetchEquitiesQuotes(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables
    const json = response.data.tables?.[0]?.data?.length > 0 && response.data;
    if (!json) {
      return null;
    }

    const isWarrant = (symbol: string) => {
      const rules = [
        /^7[0-3][0-9][0-9][0-9][0-9]$/,
        /^7[0-3][0-9][0-9][0-9]P$/,
        /^7[0-3][0-9][0-9][0-9]F$/,
        /^7[0-3][0-9][0-9][0-9]Q$/,
        /^7[0-3][0-9][0-9][0-9]C$/,
        /^7[0-3][0-9][0-9][0-9]B$/,
        /^7[0-3][0-9][0-9][0-9]X$/,
        /^7[0-3][0-9][0-9][0-9]Y$/,
      ];
      return rules.some((regex) => regex.test(symbol));
    };

    // 新結構：tables[0].data 包含個股資料
    // 欄位：[代號, 名稱, 收盤, 漲跌, 開盤, 最高, 最低, 均價, 成交股數, 成交金額, 成交筆數, ...]
    return json.tables[0].data
      .filter((row) => !isWarrant(row[0]))
      .map((row) => {
        const [
          symbol,
          name,
          closePrice,
          change,
          openPrice,
          highPrice,
          lowPrice,
          ,
          tradeVolume,
          tradeValue,
          transaction,
        ] = row;
        const data: Record<string, string | number | null> = {
          date,
          symbol,
          name,
        };
        data.openPrice = numeral(openPrice).value();
        data.highPrice = numeral(highPrice).value();
        data.lowPrice = numeral(lowPrice).value();
        data.closePrice = numeral(closePrice).value();
        data.tradeVolume = numeral(tradeVolume).value();
        data.tradeValue = numeral(tradeValue).value();
        data.transaction = numeral(transaction).value();
        data.change = numeral(change).value();
        data.changePercent =
          data.closePrice && data.change !== null
            ? +numeral(data.change as number)
                .divide((data.closePrice as number) - (data.change as number))
                .multiply(100)
                .format('0.00')
            : 0;
        return data;
      });
  }

  async fetchEquitiesInstInvestorsTrades(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      se: 'EW',
      t: 'D',
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    // 新的 API 結構使用 tables
    const json = response.data.tables?.[0]?.data?.length > 0 && response.data;
    if (!json) {
      return null;
    }

    // 新結構：tables[0].data 包含個股法人進出資料
    // 欄位順序: [0]代號 [1]名稱 [2-4]外資 [5-7]投信 [8-10]外資+投信 [11-13]自營(自行) [14-16]自營(避險) [17-19]券商 [20-22]自營+券商 [23]三大法人合計
    return json.tables[0].data.map((row) => {
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
        finiNetBuySell: numeral(values[2]).value(), // 外資買賣超 [4]
        sitcNetBuySell: numeral(values[5]).value(), // 投信買賣超 [7]
        dealersNetBuySell: numeral(values[18]).value(), // 自營+券商買賣超 [22]
      };
      return data;
    });
  }

  async fetchEquitiesValues(options?: { date: string }) {
    const date = options?.date ?? DateTime.local().toISODate();
    const [year, month, day] = date.split('-');
    const query = new URLSearchParams({
      d: `${+year - 1911}/${month}/${day}`,
      o: 'json',
    });
    const url = `https://www.tpex.org.tw/web/stock/aftertrading/peratio_analysis/pera_result.php?${query}`;

    const response = await firstValueFrom(this.httpService.get(url));
    const json = response.data.iTotalRecords > 0 && response.data;
    if (!json) {
      return null;
    }

    return json.aaData.map((row) => {
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
        peRatio: numeral(values[0]).value(),
        pbRatio: numeral(values[4]).value(),
        dividendYield: numeral(values[3]).value(),
        dividendYear: numeral(values[2]).value(),
      };
      return data;
    });
  }
}
