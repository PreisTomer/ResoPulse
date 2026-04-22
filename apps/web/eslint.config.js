// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

const AS_UNKNOWN = {
  selector: "TSAsExpression > TSUnknownKeyword.typeAnnotation",
  message: "`as unknown` / `as unknown as X` is forbidden (see .claude/rules/typescript.md). Use the narrowest correct type or a single `as X` cast.",
}

const UNKNOWN_ANNOTATION = {
  selector: "TSTypeAnnotation > TSUnknownKeyword",
  message: "`: unknown` is forbidden (see .claude/rules/typescript.md). Use the narrowest correct type.",
}

const OBJECT_ANNOTATION = {
  selector: "TSTypeAnnotation > TSObjectKeyword",
  message: "`: object` is forbidden (see .claude/rules/typescript.md). Create a named interface or type alias for the shape.",
}

const AS_OBJECT = {
  selector: "TSAsExpression > TSObjectKeyword.typeAnnotation:not([parent.parent.type='TSAsExpression'])",
  message: "`as object` is forbidden as a terminal cast. Only permitted as an intermediate in `as object as TargetType`.",
}

const TEST_SHORTCUTS = [
  { selector: "MemberExpression[object.name=/^(it|test|describe)$/][property.name=/^(only|skip|todo)$/]", message: ".only/.skip/.todo in tests is forbidden (see .claude/rules/tests.md)." },
  { selector: "CallExpression[callee.name=/^(xit|fit|fdescribe|xdescribe)$/]", message: "xit/fit/fdescribe/xdescribe in tests is forbidden (see .claude/rules/tests.md)." },
]

const BASE_RESTRICTED = [AS_UNKNOWN, UNKNOWN_ANNOTATION, OBJECT_ANNOTATION, AS_OBJECT]

export default [
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.config.js', '*.config.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: { 'no-restricted-syntax': ['error', ...BASE_RESTRICTED] },
  },
  {
    files: ['src/**/*.vue'],
    plugins: { vue },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    rules: { 'no-restricted-syntax': ['error', ...BASE_RESTRICTED] },
  },
  {
    files: ['src/**/*.test.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: { 'no-restricted-syntax': ['error', ...BASE_RESTRICTED, ...TEST_SHORTCUTS] },
  },
]
