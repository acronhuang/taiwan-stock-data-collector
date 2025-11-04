const axios = require('axios');

async function analyzeTpexInstTradingFields() {
  console.log('🔍 分析上櫃個股法人進出欄位對應:');
  console.log('============================================================');
  
  const testDate = { display: '2024-11-01', tpex: '113/11/01' };
  const url = `https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php?d=${testDate.tpex}&se=EW&t=D&o=json`;
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.tpex.org.tw/',
      }
    });

    if (response.data.tables && response.data.tables[0]) {
      const table = response.data.tables[0];
      console.log(`📊 表格: ${table.title}`);
      console.log(`📊 資料筆數: ${table.data.length}`);
      
      console.log('\n📋 欄位對應 (共 ' + table.fields.length + ' 個欄位):');
      table.fields.forEach((field, index) => {
        console.log(`   [${index}] ${field}`);
      });
      
      console.log('\n📊 第一筆資料:');
      const firstRow = table.data[0];
      firstRow.forEach((value, index) => {
        console.log(`   [${index}] ${table.fields[index]}: ${value}`);
      });
      
      console.log('\n🎯 重要欄位分析:');
      // 尋找買賣超相關欄位
      table.fields.forEach((field, index) => {
        if (field.includes('買賣超')) {
          console.log(`   [${index}] ${field}: ${firstRow[index]}`);
        }
      });
    }
    
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}`);
  }
  
  console.log('\n============================================================');
  console.log('🏁 分析完成');
}

analyzeTpexInstTradingFields().catch(console.error);