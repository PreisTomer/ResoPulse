# ResoPulse — Instrument Bridge Setup Guide

This guide is for the person in the lab who will connect a physical impedance
instrument to the ResoPulse software.  No programming knowledge is required.

---

## What this does

The bridge is a small program that runs on the lab computer.  It reads the
cuvette impedance from your instrument and sends the data to the ResoPulse
software in real time.  You will see live values update in the **Instrument**
page of the app: Z_real, Z_imag, the derived medium conductivity, and
corrections to the delivered field as cells lyse and change the load.

---

## Step 1 — One-time software setup

### 1a. Check that Python is installed

Open a terminal (Command Prompt or PowerShell on Windows) and run:

```
py --version
```

You should see `Python 3.12.x` or similar.  If not, download Python from
python.org (3.12 or later) and install it, accepting the default options
including "Add to PATH".

### 1b. Install the bridge dependencies

Navigate to the `instrument-bridge` folder (inside the ResoPulse project) and run:

```
cd path\to\BioResonance\instrument-bridge

# Core dependencies only (demo + serial instruments)
uv sync --extra serial

# If you are using a VISA instrument (Keysight, Hioki, Agilent via GPIB/USB/LAN)
uv sync --extra visa
```

`uv` is installed automatically alongside Python 3.12.  If it is not found,
run `py -m pip install uv` first.

### 1c. Run the smoke test (verify everything is wired up correctly)

```
uv run python smoke_test.py
```

You should see `36/36 assertions passed` at the end.  This test uses no
hardware and no running backend — it just confirms the Python code is intact.

---

## Step 2 — Configure your instrument

Copy `.env.example` to `.env` and open `.env` in any text editor (Notepad is fine):

```
copy .env.example .env
notepad .env
```

Change the settings for your instrument.  The key fields are:

| Setting | What to set |
|---|---|
| `BRIDGE_DRIVER` | `btx`, `visa_lcr`, or `ascii_serial` (see below) |
| `BRIDGE_BACKEND_URL` | Leave as `http://localhost:3001` for local use |
| `BRIDGE_SERIAL_PORT` | `COM3`, `COM4`, etc. (run `probe` command to find it) |
| `BRIDGE_VISA_RESOURCE` | e.g. `GPIB0::17::INSTR` (run `probe` to find it) |
| `BRIDGE_POLL_INTERVAL_S` | How often to read the instrument in seconds (default: 1.0) |
| `BRIDGE_MEAS_FREQ_HZ` | The AC test frequency your LCR is set to, in Hz |

### Which driver to use?

**`btx`** — BTX ECM 830 or ECM 2001 electroporator connected via the RS-232
serial port on the back of the instrument.  Reads the post-pulse cuvette
resistance.  Requires a USB-to-serial adapter if your computer has no DB9 port.
Set `BRIDGE_BAUD_RATE=9600`.

**`visa_lcr`** — Any SCPI-compatible LCR meter connected via GPIB, USB, or
network.  Tested with:
- Keysight E4980A / E4980AL (most common in academic labs)
- Hioki IM3533 / IM3536
- Agilent 4284A / 4285A

For GPIB you also need a VISA backend installed:
- NI-VISA: download from ni.com/visa (free, requires registration)
- Keysight IO Libraries: from keysight.com (free)
- pyvisa-py: already included, works for USB and LAN instruments without
  installing NI-VISA, but may not support GPIB on all computers

**`ascii_serial`** — Any LCR meter that outputs ASCII numbers over a serial
port without needing commands sent (e.g. DER EE DE-5000, Peak LCR45, BK
Precision 889B).  Set `BRIDGE_BAUD_RATE` to match your instrument (DE-5000
uses 2400 baud; most others use 9600).  Set `BRIDGE_MEAS_FREQ_HZ` to whatever
frequency is shown on the instrument's front panel — the bridge cannot read
this from the instrument itself.

### Finding your serial port or VISA address

Run the probe command to list everything the computer can see:

```
uv run instrument-bridge probe
```

This will print a table of serial ports (e.g. COM3, COM4) and VISA resource
strings (e.g. GPIB0::17::INSTR).  Copy the correct value into your `.env` file.

---

## Step 3 — Start the bridge

### Verify with demo mode first (no instrument needed)

Start the ResoPulse backend (if it is not already running):
```
cd ../..
npm run backend
```

Then, in a new terminal, start the bridge in demo mode:
```
cd apps/instrument-bridge
uv run instrument-bridge run --driver demo
```

Open the ResoPulse app in your browser, go to the **Instrument** page, and
look at the **Hardware Input** section.  Click **Live** to enable hardware
mode.  You should see the status dot turn green and impedance values updating
every second.

If the values appear, the end-to-end pipeline works.  Stop the demo bridge
with `Ctrl-C` and proceed to connect your real instrument.

### Start with your real instrument

```
uv run instrument-bridge run
```

This reads from whichever driver you set in `.env`.  You can also override
settings on the command line without editing `.env`:

```
# BTX on COM4
uv run instrument-bridge run --driver btx --port COM4

# Keysight via GPIB at address 17
uv run instrument-bridge run --driver visa_lcr --visa-resource "GPIB0::17::INSTR"

# Connecting to a remote backend (e.g. during a shared ngrok session)
uv run instrument-bridge run --backend-url https://abc123.ngrok.io
```

Press `Ctrl-C` at any time to stop the bridge cleanly.

---

## Step 4 — During the experiment

1. Start the backend and the bridge before opening the ResoPulse UI.
2. In the app, go to **Instrument** page, click **Live** in the Hardware Input section.
3. Confirm the status dot is green and the age label shows "0.X s ago".
4. Set the cuvette geometry in the **Cuvette Setup** card to match your physical
   cuvette (gap and electrode area).  This affects all derived calculations.
5. Run your electroporation or RF protocol as usual.  Watch:
   - **Impedance Meter**: live Z and derived conductivity
   - **Load Monitor**: impedance drift % and corrected field recommendation
   - **Field Corrector**: the generator voltage you should set to deliver the
     target field despite load changes
   - **Bode Plot**: |Z(f)| spectrum to check Maxwell relaxation frequency

---

## Troubleshooting

**"Cannot open serial port COM3"**
The instrument is not connected, or another program (e.g. PuTTY, the instrument
manufacturer's software) already has the port open.  Close other programs and
try again.  Run `uv run instrument-bridge probe` to see available ports.

**"No VISA resources found"**
NI-VISA or Keysight IO Libraries may not be installed.  For USB instruments,
try `pyvisa-py` which is already included.  For GPIB, you need a NI-VISA or
Keysight IO installation.

**Status shows "Waiting for instrument" and stays there (BTX driver)**
The BTX ECM 830 only sends a resistance readback after a pulse has been
triggered.  If no pulse has occurred since the instrument was powered on, the
driver will not receive data.  Trigger at least one pulse and the value should
appear.

**Readings arrive but are very high or very low compared to expected**
Verify the cuvette geometry in the Cuvette Setup card matches your physical
cuvette.  The conductivity derivation depends on the correct gap and electrode
area.

**"Backend connection failed" at startup**
The ResoPulse backend is not running.  Start it from the repo root with `npm run backend`.
The bridge will automatically retry every few seconds once the backend is up.

**App shows stale data (yellow status) after instrument was unplugged**
The bridge detects the disconnection and attempts to reconnect automatically.
Once the instrument is plugged back in the status will return to green within
a few seconds.

---

## What the bridge does NOT do

- It does not send commands to the pulse generator or set voltage/frequency.
  Those parameters are still set manually on the instrument.  The bridge is
  read-only: it only reads impedance from a monitoring instrument.
- It does not replace the instrument's own safety interlocks.
- For BTX instruments, it reads the cuvette resistance after the fact (post-pulse),
  not during the pulse.  Real-time in-pulse monitoring requires a separate
  acquisition board.

---

## All command options

```
uv run instrument-bridge --help
uv run instrument-bridge run --help
uv run instrument-bridge probe --help
```
