// 批次抓取台灣上市（TWSE）與上櫃（TPEx）個股資訊並寫入 MongoDB
// 用法：node batch-fetch-twse-tpex.js 2024-10-01 2024-10-31

const axios = require('axios');
const numeral = require('numeral');
const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'taiwan_stock';
const COLLECTION = 'tickers';

function getDateList(start, end) {
  const result = [];
  let d = new Date(start);
  const endDate = new Date(end);
  while (d <= endDate) {
    result.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return result;
}

async function fetchTwseEquities(date) {
  const query = new URLSearchParams({
    date: date.replace(/-/g, ''),
    type: 'ALLBUT0999',
    response: 'json',
  });
  const url = `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?${query}`;
  const { data } = await axios.get(url);
  if (data.stat !== 'OK' || !data.tables[8]) return [];
  return data.tables[8].data.map(row => ({
    date,
    type: 'Equity',
    exchange: 'TWSE',
    symbol: row[0],
    name: row[1],
    openPrice: numeral(row[4]).value(),
    highPrice: numeral(row[5]).value(),
    lowPrice: numeral(row[6]).value(),
    closePrice: numeral(row[7]).value(),
    tradeVolume: numeral(row[2]).value(),
    tradeValue: numeral(row[3]).value(),
  }));
}

async function fetchTpexEquities(date) {
  const query = new URLSearchParams({
    date: date.replace(/-/g, ''),
    type: 'sii',
    response: 'json',
  });
  const url = `https://www.tpex.org.tw/web/stock/aftertrading/daily_close_quotes/stk_quote_result.php?${query}`;
  const { data } = await axios.get(url);
  if (!data.aaData) return [];
  return data.aaData.map(row => ({
    date,
    type: 'Equity',
    exchange: 'TPEX',
    symbol: row[0],
    name: row[1],
    openPrice: numeral(row[5]).value(),
    highPrice: numeral(row[6]).value(),
    lowPrice: numeral(row[7]).value(),
    closePrice: numeral(row[8]).value(),
    tradeVolume: numeral(row[2]).value(),
    tradeValue: numeral(row[4]).value(),
  }));
}

async function main() {
  const [,, start, end] = process.argv;
  if (!start || !end) {
    console.log('用法: node batch-fetch-twse-tpex.js 2024-10-01 2024-10-31');
    process.exit(1);
  }
  const dates = getDateList(start, end);
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION);

  for (const date of dates) {
    console.log(`抓取 ${date} ...`);
    const twse = await fetchTwseEquities(date);
    const tpex = await fetchTpexEquities(date);
    const all = [...twse, ...tpex];
    for (const ticker of all) {
      await col.updateOne(
        { date: ticker.date, symbol: ticker.symbol, exchange: ticker.exchange },
        { $set: ticker },
        { upsert: true }
      );
    }
    console.log(`${date} 完成 (${all.length} 筆)`);
  }
  await client.close();
  console.log('批次抓取完成！');
}

main().catch(e => { console.error(e); process.exit(1); });
