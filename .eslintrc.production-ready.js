module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'security'
  ],
  extends: [
    'plugin:@typescript-eslint/recommended'
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    '.eslintrc.js', 
    '.eslintrc.*.js',
    'dist/', 
    'node_modules/', 
    '**/*.spec.ts', 
    '**/*.test.ts'
  ],
  rules: {
    // 只檢查關鍵的 TypeScript 問題
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-explicit-any': 'off', // 放寬 any 類型限制
    '@typescript-eslint/no-empty-function': 'off',
    
    // 只檢查高風險安全問題
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-object-injection': 'off', // 放寬物件注入檢查
    'security/detect-child-process': 'off',
    'security/detect-non-literal-fs-filename': 'off',
    'security/detect-possible-timing-attacks': 'off',
    
    // 放寬複雜度限制
    'complexity': 'off',
    'max-depth': 'off',
    'max-lines': 'off',
    'max-lines-per-function': 'off',
    'max-params': 'off',
    
    // 只檢查基本語法問題
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unreachable': 'error',
    'eqeqeq': ['error', 'always'],
    
    // 關閉格式檢查
    'prettier/prettier': 'off',
  },
};