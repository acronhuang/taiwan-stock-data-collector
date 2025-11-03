import { Controller, Get } from '@nestjs/common';

@Controller('technical-analysis')
export class TechnicalAnalysisController {
  @Get('test')
  async test() {
    return { message: 'Technical analysis module is working' };
  }
}