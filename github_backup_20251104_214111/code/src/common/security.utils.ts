import { BadRequestException } from '@nestjs/common';

/**
 * 驗證 MongoDB 查詢條件，防止物件注入攻擊
 */
export function validateQueryConditions(
  conditions: unknown,
): Record<string, unknown> {
  if (
    !conditions ||
    typeof conditions !== 'object' ||
    Array.isArray(conditions)
  ) {
    throw new BadRequestException('Invalid query conditions');
  }

  const validConditions = conditions as Record<string, unknown>;

  // 檢查是否包含潛在危險的操作符
  const dangerousOperators = ['$where', '$eval', '$function'];
  for (const key of Object.keys(validConditions)) {
    if (dangerousOperators.includes(key)) {
      throw new BadRequestException(`Dangerous operator not allowed: ${key}`);
    }
  }

  return validConditions;
}

/**
 * 驗證 MongoDB 更新資料，防止物件注入攻擊
 */
export function validateUpdateData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException('Invalid update data');
  }

  const validData = data as Record<string, unknown>;

  // 檢查是否包含潛在危險的操作符
  const dangerousOperators = ['$where', '$eval', '$function'];
  for (const key of Object.keys(validData)) {
    if (dangerousOperators.includes(key)) {
      throw new BadRequestException(`Dangerous operator not allowed: ${key}`);
    }
  }

  return validData;
}

/**
 * 安全地訪問物件屬性
 */
export function safeGet<T = unknown>(obj: unknown, key: string): T | undefined;
export function safeGet<T>(obj: unknown, key: string, defaultValue: T): T;
export function safeGet<T = unknown>(
  obj: unknown,
  key: string,
  defaultValue?: T,
): T | undefined {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return defaultValue;
  }

  const safeObj = obj as Record<string, unknown>;
  // 使用 Object.prototype.hasOwnProperty 避免原型鏈攻擊
  if (!Object.prototype.hasOwnProperty.call(safeObj, key)) {
    return defaultValue;
  }
  const value = safeObj[key] as T;
  return value !== undefined ? value : defaultValue;
}
