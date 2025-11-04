import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as csvtojson from 'csvtojson';
import * as _ from 'lodash';
import { DateTime } from 'luxon';
import * as numeral from 'numeral';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TdccScraperService {
  constructor(private httpService: HttpService) {}

  async fetchEquitiesHolders() {
    const url = 'https://smart.tdcc.com.tw/opendata/getOD.ashx?id=1-5';
    const response = await firstValueFrom(this.httpService.get(url));
    const json = await csvtojson({ noheader: true, output: 'csv' }).fromString(
      response.data,
    );
    const [fields, ...rows] = json;
    if (fields[0] !== '資料日期') {
      return null;
    }

    const distributions = rows.map((row) => ({
      date: DateTime.fromFormat(row[0], 'yyyyMMdd').toISODate(),
      symbol: row[1],
      level: numeral(row[2]).value(),
      holders: numeral(row[3]).value(),
      shares: numeral(row[4]).value(),
      proportion: numeral(row[5]).value(),
    }));

    return _(distributions)
      .groupBy('symbol')
      .map((rows) => {
        const { date, symbol } = rows[0];
        const data = rows.map((row) => _.omit(row, ['date', 'symbol']));
        return { date, symbol, data };
      })
      .value();
  }
}
