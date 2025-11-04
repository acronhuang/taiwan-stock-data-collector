const axios = require('axios');

async function inspectTpexAPIStructure() {
  console.log('🔍 檢查上櫃 API 資料結構:');
  console.log('============================================================');
  
  const testDate = { display: '2024-11-01', tpex: '113/11/01' };
  const url = `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_index/st41_result.php?d=${testDate.tpex}&o=json`;
  
  console.log(`📅 測試日期: ${testDate.display} (民國: ${testDate.tpex})`);
  console.log(`🔗 ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.tpex.org.tw/',
      }
    });

    console.log(`✅ 狀態: ${response.status}`);
    console.log('\n📊 完整回應結構:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}`);
  }
  
  console.log('\n============================================================');
  console.log('🏁 檢查完成');
}

inspectTpexAPIStructure().catch(console.error);