import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 設置視圖引擎
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  
  await app.listen(3000);
  console.log('🚀 應用程式已啟動於 http://localhost:3000');
  console.log('📊 管理面板: http://localhost:3000/admin/fetch-data');
}
bootstrap();
