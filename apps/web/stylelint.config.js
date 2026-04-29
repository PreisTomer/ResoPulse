// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
export default {
  overrides: [
    { files: ['**/*.scss'], customSyntax: 'postcss-scss' },
    { files: ['**/*.vue'], customSyntax: 'postcss-html' },
  ],
  rules: {
    'color-no-hex': [true, { message: 'Use var(--color-*) or color-mix(in srgb, var(--color-X) Y%, transparent) — see .claude/rules/css.md' }],
    'function-disallowed-list': [['rgba', 'rgb', 'hsl', 'hsla'], { message: 'Use color-mix(in srgb, var(--color-X) Y%, transparent) instead — see .claude/rules/css.md' }],
  },
  ignoreFiles: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    'src/theme/colors.ts',
    'src/styles/_tokens.scss',
    'src/styles/_keyframes.scss',
    'src/style.css',
  ],
}
