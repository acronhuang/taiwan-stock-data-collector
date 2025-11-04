// 詳細檢查個股法人進出 API 回應格式
const axios = require('axios');

async function analyzeInstInvestorsAPI() {
  console.log('🔍 詳細分析個股法人進出 API 格式');
  console.log('=====================================');
  
  const testDate = '2025-10-01';
  const formattedDate = testDate.replace(/-/g, '');
  
  const url = `https://www.twse.com.tw/rwd/zh/fund/T86?date=${formattedDate}&selectType=ALLBUT0999&response=json`;
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.data?.stat === 'OK' && response.data.data && response.data.data.length > 0) {
      console.log('📋 欄位名稱:', response.data.fields);
      console.log('\n📊 第一筆完整資料:');
      const firstRow = response.data.data[0];
      firstRow.forEach((value, index) => {
        console.log(`   [${index}] ${response.data.fields[index]}: ${value}`);
      });
      
      console.log('\n🧮 當前解析邏輯:');
      console.log('   finiNetBuySell = values[2] + values[5]');
      console.log('   sitcNetBuySell = values[8]');
      console.log('   dealersNetBuySell = values[9]');
      
      console.log('\n🔍 values 陣列內容:');
      const [symbol, name, ...values] = firstRow;
      values.forEach((value, index) => {
        console.log(`   values[${index}]: ${value}`);
      });
      
      console.log('\n💡 計算結果:');
      console.log(`   finiNetBuySell = ${values[2]} + ${values[5]} = ${(parseFloat(values[2]) || 0) + (parseFloat(values[5]) || 0)}`);
      console.log(`   sitcNetBuySell = ${values[8]}`);
      console.log(`   dealersNetBuySell = ${values[9]}`);
      
    }
    
  } catch (error) {
    console.error('❌ API 調用失敗:', error.message);
  }
}

analyzeInstInvestorsAPI();