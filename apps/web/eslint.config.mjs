import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'bs', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'bs', style: 'kebab-case' },
      ],
      // Project conventions (CLAUDE.md)
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-signals': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/forms',
              importNames: ['FormsModule', 'NgModel'],
              message: 'No ngModel: use signal-based state/forms.',
            },
            {
              name: '@angular/core',
              importNames: ['NgModule'],
              message: 'Standalone components only.',
            },
          ],
        },
      ],
    },
  },
  {
    // All HTTP goes through ApiService.
    files: ['**/*.ts'],
    ignores: ['**/src/app/core/api.service.ts', '**/src/app/app.config.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              message: 'Use ApiService (src/app/core/api.service.ts) instead of HttpClient.',
            },
            {
              name: '@angular/forms',
              importNames: ['FormsModule', 'NgModel'],
              message: 'No ngModel: use signal-based state/forms.',
            },
            {
              name: '@angular/core',
              importNames: ['NgModule'],
              message: 'Standalone components only.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
    },
  },
];
