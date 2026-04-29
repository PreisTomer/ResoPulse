// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
// Terminal commands shown in code blocks — not user-visible strings, intentionally hardcoded.
export const CMD = {
  CHECK_PYTHON:   'py --version',
  INSTALL_CORE:   'cd apps/instrument-bridge\nuv sync --extra serial',
  SMOKE_TEST:     'uv run python smoke_test.py',
  START_BACKEND:  'npm run backend',
  RUN_DEMO:       'uv run instrument-bridge run --driver demo',
  PROBE:          'uv run instrument-bridge probe',
  INSTALL_SERIAL: 'uv sync --extra serial',
  INSTALL_VISA:   'uv sync --extra visa',
  RUN_BTX:        'uv run instrument-bridge run --driver btx --port COM4',
  RUN_VISA:       'uv run instrument-bridge run --driver visa_lcr --visa-resource "GPIB0::17::INSTR"',
  RUN_SERIAL:     'uv run instrument-bridge run --driver ascii_serial --port COM3',
} as const
