import { Controller, Get, Query } from '@nestjs/common';
import { ApiStatusService, ApiIssue } from './api-status.service';

@Controller('api-status')
export class ApiStatusController {
  constructor(private readonly apiStatusService: ApiStatusService) {}

  /**
   * 獲取API健康狀態摘要
   */
  @Get('health')
  getHealthSummary() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.apiStatusService.getHealthSummary(),
      currentIssues: this.apiStatusService.getCurrentIssues(),
    };
  }

  /**
   * 檢查特定日期和API的狀態
   */
  @Get('check')
  checkApiStatus(@Query('date') date: string, @Query('api') apiName: string) {
    if (!date || !apiName) {
      return {
        error: '請提供 date 和 api 參數',
      };
    }

    const hasIssue = this.apiStatusService.hasKnownIssue(date, apiName);
    const description = this.apiStatusService.getIssueDescription(
      date,
      apiName,
    );

    return {
      date,
      api: apiName,
      hasKnownIssue: hasIssue,
      description,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 獲取所有已知問題列表
   */
  @Get('issues')
  getAllKnownIssues() {
    return {
      issues: this.apiStatusService.getAllKnownIssues(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 獲取API狀態儀表板數據
   */
  @Get('dashboard')
  getDashboard() {
    const health = this.apiStatusService.getHealthSummary();
    const currentIssues = this.apiStatusService.getCurrentIssues();

    return {
      timestamp: new Date().toISOString(),
      overview: {
        totalApis:
          health.healthy.length +
          health.issues.length +
          health.monitoring.length,
        healthyCount: health.healthy.length,
        issuesCount: health.issues.length,
        monitoringCount: health.monitoring.length,
      },
      status: health,
      activeIssues: currentIssues,
      recommendations: this.generateRecommendations(health, currentIssues),
    };
  }

  private generateRecommendations(
    health: { healthy: string[]; issues: string[]; monitoring: string[] },
    currentIssues: ApiIssue[],
  ): string[] {
    const recommendations = [];

    if (health.issues.length > 0) {
      recommendations.push(`檢查 ${health.issues.join(', ')} API的連接狀況`);
    }

    if (health.monitoring.length > 0) {
      recommendations.push(
        `持續監控 ${health.monitoring.join(', ')} API的穩定性`,
      );
    }

    if (currentIssues.length === 0 && health.healthy.length > 0) {
      recommendations.push('所有API運作正常，建議定期檢查資料完整性');
    }

    return recommendations;
  }
}
