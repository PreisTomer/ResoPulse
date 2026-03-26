# Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
"""In-memory service state for the AI FastAPI process."""

from .train import ModelBundle

_model_bundle: ModelBundle | None = None


def get_model_bundle() -> ModelBundle | None:
    """Return the currently loaded in-memory model bundle, if any."""
    return _model_bundle


def set_model_bundle(bundle: ModelBundle | None) -> None:
    """Replace the currently loaded in-memory model bundle."""
    global _model_bundle
    _model_bundle = bundle