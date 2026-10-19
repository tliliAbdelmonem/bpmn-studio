// bpmn-moddle and its dependencies are ESM-only, so they are transformed to CommonJS for Jest.
const esmPackages = ['bpmn-moddle', 'moddle', 'moddle-xml', 'saxen', 'min-dash'].join('|');

module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [`node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?(${esmPackages})/)`],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
};
