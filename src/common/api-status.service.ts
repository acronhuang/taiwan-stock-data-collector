import { Injectable, Logger } from '@nestjs/common';

export interface ApiIssue {
  startDate: string;
  endDate?: string;
  apis: string[];
  description: string;
  status: 'ongoing' | 'resolved' | 'monitoring';
}

@Injectable()
export class ApiStatusService {
  private readonly logger = new Logger(ApiStatusService.name);
  
  // 已知的API問題記錄
  private readonly knownIssues: ApiIssue[] = [
    {
      startDate: '2025-10-24',
      endDate: '2025-10-26',
      apis: ['TWSE_MI_INDEX', 'TWSE_BFI82U', 'TWSE_MARKET_TRADES'],
      description: 'TWSE 大盤指數和三大法人API暫時無資料',
      status: 'resolved'
    }
  ];

  /**
   * 檢查特定日期和API是否有已知問題
   */
  hasKnownIssue(date: string, apiName: string): boolean {
    return this.knownIssues.some(issue => {
      const isInDateRange = this.isDateInRange(date, issue.startDate, issue.endDate);
      const isAffectedApi = issue.apis.includes(apiName);
      return isInDateRange && isAffectedApi;
    });
  }

  /**
   * 獲取特定日期和API的問題描述
   */
  getIssueDescription(date: string, apiName: string): string | null {
    const issue = this.knownIssues.find(issue => {
      const isInDateRange = this.isDateInRange(date, issue.startDate, issue.endDate);
      const isAffectedApi = issue.apis.includes(apiName);
      return isInDateRange && isAffectedApi;
    });
    
    return issue ? issue.description : null;
  }

  /**
   * 記錄適當的日誌訊息
   */
  logApiResult(date: string, apiName: string, operation: string, success: boolean): void {
    if (success) {
      Logger.log(`${date} ${operation}: 已更新`, 'ApiStatus');
    } else if (this.hasKnownIssue(date, apiName)) {
      const description = this.getIssueDescription(date, apiName);
      Logger.log(`${date} ${operation}: ${description}`, 'ApiStatus');
    } else {
      Logger.warn(`${date} ${operation}: 尚無資料或非交易日`, 'ApiStatus');
    }
  }

  /**
   * 新增API問題記錄
   */
  addKnownIssue(issue: ApiIssue): void {
    this.knownIssues.push(issue);
    this.logger.log(`新增已知API問題: ${issue.description} (${issue.startDate}${issue.endDate ? ' - ' + issue.endDate : ''})`);
  }

  /**
   * 獲取所有已知問題
   */
  getAllKnownIssues(): ApiIssue[] {
    return [...this.knownIssues];
  }

  /**
   * 檢查日期是否在範圍內
   */
  private isDateInRange(date: string, startDate: string, endDate?: string): boolean {
    if (!endDate) {
      return date === startDate;
    }
    return date >= startDate && date <= endDate;
  }

  /**
   * 檢查當前是否有進行中的API問題
   */
  getCurrentIssues(): ApiIssue[] {
    const today = new Date().toISOString().split('T')[0];
    return this.knownIssues.filter(issue => 
      issue.status === 'ongoing' || 
      (issue.status === 'monitoring' && this.isDateInRange(today, issue.startDate, issue.endDate))
    );
  }

  /**
   * 獲取API健康狀態摘要
   */
  getHealthSummary(): { healthy: string[], issues: string[], monitoring: string[] } {
    const currentIssues = this.getCurrentIssues();
    const allApis = ['TWSE_MI_INDEX', 'TWSE_BFI82U', 'TWSE_MARKET_TRADES', 'TWSE_STOCK_DAY', 'TPEX_QUOTES'];
    
    const issueApis = new Set();
    const monitoringApis = new Set();
    
    currentIssues.forEach(issue => {
      issue.apis.forEach(api => {
        if (issue.status === 'ongoing') {
          issueApis.add(api);
        } else if (issue.status === 'monitoring') {
          monitoringApis.add(api);
        }
      });
    });
    
    const healthy = allApis.filter(api => !issueApis.has(api) && !monitoringApis.has(api));
    
    return {
      healthy,
      issues: Array.from(issueApis) as string[],
      monitoring: Array.from(monitoringApis) as string[]
    };
  }
}