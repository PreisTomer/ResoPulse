#!/usr/bin/env node
// ResoPulse CLAUDE.md rule enforcer. PreToolUse hook on Edit/Write/MultiEdit.
// Reconstructs the post-edit file from the payload, runs mechanical checks,
// and blocks the write (exit 2) when the edit introduces net-new violations.
// Pre-existing violations are reported but not blocked — they don't belong
// to the current edit, so the user isn't forced into scope creep.

import { readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'

const COPYRIGHT = 'Copyright © 2026 Tomer Preis. Licensed under the MIT License.'

// ── payload parsing ───────────────────────────────────────────────────────

function readStdin() {
  try { return readFileSync(0, 'utf8') } catch { return '' }
}

function parsePayload(raw) {
  try { return JSON.parse(raw) } catch { return null }
}

function toPosix(p) { return p.split(sep).join('/') }

function fileExt(posixPath) {
  const m = posixPath.match(/\.([a-z]+)$/i)
  return m ? m[1].toLowerCase() : ''
}

function readFileSafe(filePath) {
  try { return readFileSync(filePath, 'utf8') } catch { return '' }
}

function applyEdit(original, edit) {
  const { old_string: oldStr, new_string: newStr, replace_all: replaceAll } = edit
  if (replaceAll) return original.split(oldStr).join(newStr)
  const idx = original.indexOf(oldStr)
  if (idx === -1) return original
  return original.slice(0, idx) + newStr + original.slice(idx + oldStr.length)
}

function getPostEditContent(payload, currentContent) {
  const { tool_name: toolName, tool_input: input } = payload
  if (toolName === 'Write') return input.content ?? ''
  if (toolName === 'Edit') return applyEdit(currentContent, input)
  if (toolName === 'MultiEdit') {
    let result = currentContent
    for (const edit of (input.edits ?? [])) result = applyEdit(result, edit)
    return result
  }
  return null
}

// ── scope helpers ─────────────────────────────────────────────────────────

function isSourceTreeFile(posixPath) {
  return /\/(apps\/web\/src|apps\/api\/src|packages\/[^/]+\/src)\//.test(posixPath)
}

function isLocaleFile(posixPath) {
  return /\/apps\/web\/src\/locales\/[^/]+\.en\.json$/.test(posixPath)
}

function isTestFile(posixPath) {
  return /\.test\.(ts|tsx|js|mjs)$/.test(posixPath)
}

function currentComponentFolder(posixPath) {
  const m = posixPath.match(/\/components\/([^/]+)\//)
  return m ? m[1] : null
}

// ── text extraction ───────────────────────────────────────────────────────

function stripKeyframeBlocks(text) {
  let out = '', i = 0
  while (i < text.length) {
    const kfIdx = text.indexOf('@keyframes', i)
    if (kfIdx === -1) { out += text.slice(i); break }
    out += text.slice(i, kfIdx)
    const braceStart = text.indexOf('{', kfIdx)
    if (braceStart === -1) { out += text.slice(kfIdx); break }
    let depth = 1, j = braceStart + 1
    for (; j < text.length && depth > 0; j++) {
      if (text[j] === '{') depth++
      else if (text[j] === '}') depth--
    }
    const padLineCount = text.slice(kfIdx, j).split('\n').length - 1
    out += '\n'.repeat(padLineCount)
    i = j
  }
  return out
}

function extractVueStyleBlock(text) {
  const m = text.match(/<style\b[^>]*>([\s\S]*?)<\/style>/)
  if (!m) return null
  const leadingLines = text.slice(0, m.index + m[0].indexOf(m[1])).split('\n').length - 1
  return { body: m[1], lineOffset: leadingLines }
}

function extractVueTemplateBlock(text) {
  const m = text.match(/<template\b[^>]*>([\s\S]*?)<\/template>/)
  if (!m) return null
  const leadingLines = text.slice(0, m.index + m[0].indexOf(m[1])).split('\n').length - 1
  return { body: m[1], lineOffset: leadingLines }
}

// ── violation helpers ─────────────────────────────────────────────────────

function v(kind, line, snippet, message) {
  const normalized = snippet.trim().toLowerCase()
  return { kind, line, signature: `${kind}::${normalized}`, message: `L${line}: ${message}` }
}

// ── checks ────────────────────────────────────────────────────────────────

function checkCopyright(text, ext, posixPath) {
  if (!isSourceTreeFile(posixPath)) return []
  if (!['vue', 'ts', 'tsx', 'js'].includes(ext)) return []
  const first = (text.split('\n')[0] ?? '').trim()
  const expected = ext === 'vue' ? `<!-- ${COPYRIGHT} -->` : `// ${COPYRIGHT}`
  if (first === expected) return []
  return [v('copyright', 1, 'missing', `missing copyright header (expected exactly: ${expected})`)]
}

function checkRgba(text, ext) {
  if (!(ext === 'vue' || ext === 'scss')) return []
  const targets = ext === 'vue'
    ? (extractVueStyleBlock(text) ? [extractVueStyleBlock(text)] : []).map(b => ({ body: b.body, lineOffset: b.lineOffset }))
    : [{ body: text, lineOffset: 0 }]
  const violations = []
  for (const { body, lineOffset } of targets) {
    const lines = stripKeyframeBlocks(body).split('\n')
    lines.forEach((line, idx) => {
      if (/\brgba\s*\(/.test(line)) {
        violations.push(v('rgba', lineOffset + idx + 1, line,
          'raw rgba() — use color-mix(in srgb, var(--color-X) Y%, transparent) or a named tint token'))
      }
    })
  }
  return violations
}

function checkHex(text, ext) {
  if (!(ext === 'vue' || ext === 'scss')) return []
  const targets = ext === 'vue'
    ? (extractVueStyleBlock(text) ? [extractVueStyleBlock(text)] : []).map(b => ({ body: b.body, lineOffset: b.lineOffset }))
    : [{ body: text, lineOffset: 0 }]
  const violations = []
  for (const { body, lineOffset } of targets) {
    const lines = stripKeyframeBlocks(body).split('\n')
    lines.forEach((line, idx) => {
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return
      if (/url\s*\([^)]*#/.test(line)) return
      const code = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '')
      const hexRe = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b/
      if (hexRe.test(code)) {
        violations.push(v('hex', lineOffset + idx + 1, line,
          'raw hex color — use var(--color-X), color-mix(), or a named semantic token'))
      }
    })
  }
  return violations
}

function checkScriptSetup(text, ext) {
  if (ext !== 'vue') return []
  const m = text.match(/<script\b[^>]*\bsetup\b[^>]*>/)
  if (!m) return []
  const line = text.slice(0, m.index).split('\n').length
  return [v('scriptSetup', line, m[0],
    '<script setup> is forbidden — use Options API (export default defineComponent({...}))')]
}

function checkStyleBlock(text, ext) {
  if (ext !== 'vue') return []
  const violations = []
  const re = /<style\b([^>]*)>/g
  let m
  while ((m = re.exec(text)) !== null) {
    const attrs = m[1]
    const hasScss = /\blang\s*=\s*"scss"/.test(attrs)
    const hasScoped = /\bscoped\b/.test(attrs)
    if (!hasScss || !hasScoped) {
      const line = text.slice(0, m.index).split('\n').length
      violations.push(v('styleBlock', line, m[0], '<style> must be <style lang="scss" scoped>'))
    }
  }
  return violations
}

function checkInlineConditionals(text, ext) {
  if (ext !== 'vue') return []
  const block = extractVueTemplateBlock(text)
  if (!block) return []
  const { body, lineOffset } = block
  const violations = []
  const lines = body.split('\n')
  lines.forEach((line, idx) => {
    const re = /v-(if|else-if|show)="([^"]+)"/g
    let m
    while ((m = re.exec(line)) !== null) {
      const [, dir, expr] = m
      const stripped = expr.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '')
      if (/&&|\|\|/.test(stripped)) {
        violations.push(v('inlineCondition', lineOffset + idx + 1, expr,
          `v-${dir}="${expr}" has multiple conditions — extract to a named computed`))
      }
    }
  })
  return violations
}

function checkPrivateImport(text, ext, posixPath) {
  if (!['vue', 'ts', 'tsx'].includes(ext)) return []
  const folder = currentComponentFolder(posixPath)
  const violations = []
  const lines = text.split('\n')
  const re = /from\s+['"]@\/components\/([^/'"]+)\/([^'"/]+?)\.vue['"]/g
  lines.forEach((line, idx) => {
    const matcher = new RegExp(re.source, 'g')
    let m
    while ((m = matcher.exec(line)) !== null) {
      const [, importedFolder, importedFile] = m
      if (importedFile === 'index') continue
      if (folder === importedFolder) continue
      violations.push(v('privateImport', idx + 1, m[0],
        `private sub-component import @/components/${importedFolder}/${importedFile}.vue — import through the folder's index.vue`))
    }
  })
  return violations
}

function checkUnknownType(text, ext) {
  if (!['ts', 'tsx', 'vue'].includes(ext)) return []
  const violations = []
  text.split('\n').forEach((line, idx) => {
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '')
    if (/\bas\s+unknown\b/.test(code) || /:\s*unknown\b/.test(code)) {
      violations.push(v('unknown', idx + 1, line,
        '`unknown` is forbidden — use the narrowest correct type or a single `as X` cast'))
    }
  })
  return violations
}

function checkTestShortcuts(text, posixPath) {
  if (!isTestFile(posixPath)) return []
  const patterns = [
    [/\b(it|describe|test)\.only\s*\(/, '.only()'],
    [/\b(it|describe|test)\.skip\s*\(/, '.skip()'],
    [/\b(it|describe|test)\.todo\s*\(/, '.todo()'],
    [/\bxit\s*\(/, 'xit()'],
    [/\bfit\s*\(/, 'fit()'],
    [/\bfdescribe\s*\(/, 'fdescribe()'],
    [/\bxdescribe\s*\(/, 'xdescribe()'],
  ]
  const violations = []
  text.split('\n').forEach((line, idx) => {
    if (line.trim().startsWith('//')) return
    for (const [pat, label] of patterns) {
      if (pat.test(line)) {
        violations.push(v('testShortcut', idx + 1, `${label}:${line.trim()}`,
          `${label} is forbidden — either fix the test or delete it with a commit-message justification`))
      }
    }
  })
  return violations
}

function walkJsonStrings(node, path, visit) {
  if (typeof node === 'string') { visit(node, path); return }
  if (Array.isArray(node)) { node.forEach((val, i) => walkJsonStrings(val, path.concat(String(i)), visit)); return }
  if (node && typeof node === 'object') for (const k of Object.keys(node)) walkJsonStrings(node[k], path.concat(k), visit)
}

function checkLocaleDashes(text, posixPath) {
  if (!isLocaleFile(posixPath)) return []
  let data
  try { data = JSON.parse(text) } catch { return [] }
  const violations = []
  walkJsonStrings(data, [], (value, path) => {
    const trimmed = value.trim()
    if (trimmed === '—' || trimmed === '–') return
    if (!/[—–]/.test(value)) return
    const pathStr = path.join('.')
    violations.push({
      kind: 'localeDash',
      line: 0,
      signature: `localeDash::${pathStr}::${value}`,
      message: `${pathStr}: em/en dash in value "${value.slice(0, 80)}" — use commas, colons, parentheses, or rephrase`,
    })
  })
  return violations
}

function checkVerboseComments(text, ext, posixPath) {
  if (!isSourceTreeFile(posixPath)) return []
  if (!['vue', 'ts', 'tsx', 'js', 'mjs', 'scss'].includes(ext)) return []
  const violations = []

  const blockRe = /\/\*(?!\*)[\s\S]*?\*\//g
  let m
  while ((m = blockRe.exec(text)) !== null) {
    if (!m[0].includes('\n')) continue
    const line = text.slice(0, m.index).split('\n').length
    violations.push(v('multiLineBlockComment', line, m[0].slice(0, 60),
      'multi-line /* */ comment — condense to one short line or delete'))
  }

  const lines = text.split('\n')
  let run = 0, runStart = -1
  const isDivider = (s) => /^\/\/\s*[─=\-]{3,}/.test(s)
  const isCopyright = (s, idx) => idx === 0 && s.includes('Copyright ©')
  for (let idx = 0; idx <= lines.length; idx++) {
    const line = lines[idx] ?? ''
    const trimmed = line.trim()
    const isComment = trimmed.startsWith('//') && !trimmed.startsWith('////') && !isDivider(trimmed) && !isCopyright(trimmed, idx)
    if (isComment) {
      if (run === 0) runStart = idx
      run++
    } else {
      if (run >= 3) {
        const sig = lines.slice(runStart, runStart + run).map(l => l.trim()).join('|')
        violations.push(v('verboseLineComment', runStart + 1, sig,
          `${run} consecutive // comment lines starting here — condense to one line, or replace with clearer code`))
      }
      run = 0
    }
  }

  return violations
}

// ── orchestration ─────────────────────────────────────────────────────────

function runAllChecks(text, ext, posixPath) {
  return [
    ...checkCopyright(text, ext, posixPath),
    ...checkRgba(text, ext),
    ...checkHex(text, ext),
    ...checkScriptSetup(text, ext),
    ...checkStyleBlock(text, ext),
    ...checkInlineConditionals(text, ext),
    ...checkPrivateImport(text, ext, posixPath),
    ...checkUnknownType(text, ext),
    ...checkTestShortcuts(text, posixPath),
    ...checkLocaleDashes(text, posixPath),
    ...checkVerboseComments(text, ext, posixPath),
  ]
}

function main() {
  const payload = parsePayload(readStdin())
  if (!payload?.tool_input) process.exit(0)
  const toolName = payload.tool_name
  if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) process.exit(0)

  const filePath = payload.tool_input.file_path
  if (!filePath) process.exit(0)

  const posixPath = toPosix(filePath)
  const ext = fileExt(posixPath)

  const currentContent = readFileSafe(filePath)
  const newContent = getPostEditContent(payload, currentContent)
  if (newContent === null) process.exit(0)

  const oldViolations = runAllChecks(currentContent, ext, posixPath)
  const newViolations = runAllChecks(newContent, ext, posixPath)
  const oldSignatures = new Set(oldViolations.map(o => o.signature))
  const netNew = newViolations.filter(n => !oldSignatures.has(n.signature))

  if (netNew.length === 0) process.exit(0)

  const rel = relative(process.cwd(), filePath) || filePath
  process.stderr.write(
    `CLAUDE.md rule violations introduced by this ${toolName} in ${toPosix(rel)}:\n` +
    netNew.map(nv => `  - ${nv.message}`).join('\n') +
    `\n\nFix the edit before re-submitting. See .claude/rules/ for the full rule text.\n`,
  )
  process.exit(2)
}

main()
