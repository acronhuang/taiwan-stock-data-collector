const axios = require('axios');

async function findAlternativeTpexIndexAPIs() {
  console.log('🔍 尋找替代的上櫃指數 API:');
  console.log('============================================================');
  
  const testDate = { display: '2024-11-01', tpex: '113/11/01' };
  
  // 測試可能的替代 API
  const apis = [
    {
      name: '上櫃指數歷史資料',
      url: `https://www.tpex.org.tw/web/stock/historical/trading_vol_ratio/sectr_result.php?d=${testDate.tpex}&o=json`
    },
    {
      name: '上櫃市場焦點指標（包含指數）',
      url: `https://www.tpex.org.tw/web/stock/aftertrading/market_highlight/highlight_result.php?d=${testDate.tpex}&o=json`
    },
    {
      name: '上櫃日交易統計（包含指數價格）',
      url: `https://www.tpex.org.tw/web/stock/aftertrading/daily_trading_index/st41_result.php?d=${testDate.tpex}&o=json`
    },
    {
      name: '上櫃指數收盤統計',
      url: `https://www.tpex.org.tw/web/stock/iNdex_info/index_close/index_close_result.php?d=${testDate.tpex}&o=json`
    }
  ];

  for (const api of apis) {
    console.log(`\n📡 ${api.name}`);
    console.log(`🔗 ${api.url}`);
    
    try {
      const response = await axios.get(api.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.tpex.org.tw/',
        }
      });

      console.log(`✅ 狀態: ${response.status} | API狀態: ${response.data.stat || '未知'}`);
      
      if (response.data.tables && response.data.tables.length > 0) {
        const table = response.data.tables[0];
        console.log(`📊 表格: ${table.title}`);
        console.log(`📊 資料筆數: ${table.data ? table.data.length : 0}`);
        
        if (table.data && table.data.length > 0) {
          console.log(`📊 欄位: ${table.fields ? table.fields.join(', ') : '無欄位資訊'}`);
          console.log(`📊 第一筆: ${JSON.stringify(table.data[0]).substring(0, 150)}...`);
          
          // 檢查是否包含指數價格資訊
          if (table.data[0].some(field => 
            typeof field === 'string' && 
            (field.includes('指數') || field.includes('點') || /^\d+\.\d+$/.test(field))
          )) {
            console.log(`🎯 ✅ 可能包含指數價格資訊`);
          }
        }
      } else if (response.data.aaData) {
        console.log(`📊 舊格式資料筆數: ${response.data.aaData.length}`);
        console.log(`📊 第一筆: ${JSON.stringify(response.data.aaData[0]).substring(0, 150)}...`);
      } else {
        console.log(`❌ 無可用資料`);
      }
      
    } catch (error) {
      console.log(`❌ 錯誤: ${error.message}`);
      if (error.response && error.response.status === 404) {
        console.log(`   此 API 已失效 (404)`);
      }
    }
  }
  
  console.log('\n============================================================');
  console.log('🏁 測試完成');
}

findAlternativeTpexIndexAPIs().catch(console.error);