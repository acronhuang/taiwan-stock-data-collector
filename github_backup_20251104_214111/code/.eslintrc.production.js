module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'security',
    'import',
    'sonarjs'
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:sonarjs/recommended'
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  settings: {
    'import/resolver': {
      typescript: {}
    }
  },
  rules: {
    // TypeScript 規則
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-inferrable-types': 'off',
    
    // 安全性規則 (手動配置)
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',
    
    // 代碼品質規則
    'sonarjs/cognitive-complexity': ['error', 25],
    'sonarjs/max-switch-cases': ['error', 30],
    'sonarjs/no-all-duplicated-branches': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/no-collection-size-mischeck': 'error',
    'sonarjs/no-duplicate-string': ['error', 6],
    'sonarjs/no-duplicated-branches': 'error',
    'sonarjs/no-identical-conditions': 'error',
    'sonarjs/no-identical-expressions': 'error',
    'sonarjs/no-inverted-boolean-check': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-redundant-jump': 'error',
    'sonarjs/no-same-line-conditional': 'error',
    'sonarjs/no-small-switch': 'error',
    'sonarjs/no-unused-collection': 'error',
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/no-useless-catch': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/prefer-object-literal': 'error',
    'sonarjs/prefer-single-boolean-return': 'error',
    'sonarjs/prefer-while': 'error',
    
    // Import 規則
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'never',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'warn',
    
    // 一般規則
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-expressions': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
  },
};