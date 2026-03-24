"""
Pydantic models that mirror the TypeScript interfaces in backend/src/types/socket.ts.

The field names, types, and validation bounds are kept in sync with the server-side
validateHardwareImpedancePacket() function in backend/src/socket.ts so that packets
are rejected here (with a clear Python error) before they ever reach the network,
rather than being silently dropped by the server.
"""

import time
from pydantic import BaseModel, Field


class ImpedanceReading(BaseModel):
    """
    Mirrors HardwareImpedancePacket in backend/src/types/socket.ts.

    Validation bounds match the server's IMP_BOUNDS constants exactly:
      Z_MIN = 0.01 Ω,  Z_MAX = 1 MΩ
      FREQ_MIN = 1 Hz, FREQ_MAX = 1 GHz
    """

    zReal: float = Field(
        ge=0.01,
        le=1_000_000,
        description="Real part of measured impedance [Ω]",
    )
    zImag: float = Field(
        ge=-1_000_000,
        le=1_000_000,
        description="Imaginary part of measured impedance [Ω] — negative = capacitive",
    )
    freqHz: float = Field(
        ge=1.0,
        le=1_000_000_000,
        description="Frequency at which the measurement was taken [Hz]",
    )
    conductivity: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Medium conductivity [S/m] — only provided when the instrument measures it directly",
    )
    timestamp: int = Field(
        description="Unix timestamp [ms] when the reading was captured by the instrument",
    )

    @classmethod
    def build(
        cls,
        z_real: float,
        z_imag: float,
        freq_hz: float,
        conductivity: float | None = None,
    ) -> "ImpedanceReading":
        """
        Construct a reading with the current wall-clock timestamp.

        The timestamp is set at construction time (i.e. when the instrument
        returns the value) rather than at emit time, matching the field's
        documented intent.
        """
        return cls(
            zReal=z_real,
            zImag=z_imag,
            freqHz=freq_hz,
            conductivity=conductivity,
            timestamp=int(time.time() * 1000),
        )

    def to_socket_payload(self) -> dict:
        """
        Serialise to a plain dict suitable for direct socket.emit().
        None-valued conductivity is excluded so the server's optional-field
        handling works correctly.
        """
        return self.model_dump(exclude_none=True)
