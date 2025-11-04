import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DateTime } from 'luxon';
import { AppModule } from './app.module';
import { MarketStatsService } from './market-stats/market-stats.service';
import { TickerService } from './ticker/ticker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const marketStatsService = app.get(MarketStatsService);
  const tickerService = app.get(TickerService);

  const startDate = DateTime.fromISO('2025-10-01');
  const endDate = DateTime.fromISO('2025-10-31');
  const totalDays = endDate.diff(startDate, 'days').days + 1;

  Logger.log(
    `🚀 開始抓取完整10月資料 (${startDate.toISODate()} 到 ${endDate.toISODate()})`,
  );
  Logger.log(`📅 總共 ${totalDays} 天需要處理`);

  let processedDays = 0;
  let successDays = 0;
  let errorDays = 0;

  for (let dt = startDate; dt <= endDate; dt = dt.plus({ day: 1 })) {
    processedDays++;
    const dateStr = dt.toISODate();
    const dayOfWeek = dt.toFormat('EEEE');

    Logger.log(
      `\n📈 處理 ${dateStr} (${dayOfWeek}) [${processedDays}/${totalDays}]`,
    );

    try {
      // 抓取市場統計數據
      await marketStatsService.updateMarketStats(dateStr);

      // 抓取個股數據
      await tickerService.updateTickers(dateStr);

      Logger.log(`✅ ${dateStr} 處理完成`);
      successDays++;
    } catch (error) {
      Logger.error(`❌ ${dateStr} 處理失敗: ${error.message}`);
      errorDays++;
    }

    // 進度報告
    if (processedDays % 5 === 0 || processedDays === totalDays) {
      const progress = Math.round((processedDays / totalDays) * 100);
      Logger.log(
        `📊 進度: ${progress}% (成功:${successDays}, 失敗:${errorDays})`,
      );
    }

    // 避免請求過於頻繁
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  Logger.log('\n🎉 資料抓取完成！');
  Logger.log('📈 統計結果:');
  Logger.log(`   - 處理天數: ${processedDays}/${totalDays}`);
  Logger.log(`   - 成功天數: ${successDays}`);
  Logger.log(`   - 失敗天數: ${errorDays}`);
  Logger.log(
    `   - 成功率: ${Math.round((successDays / processedDays) * 100)}%`,
  );

  await app.close();
}

bootstrap().catch((error) => {
  Logger.error('Failed to execute script', error);
  process.exit(1);
});
