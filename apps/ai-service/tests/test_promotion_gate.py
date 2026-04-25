# Copyright (C) 2026 Tomer Preis. All rights reserved.

"""Promotion-gate logic: when does a freshly-trained bundle replace the active one?"""

import math

from resopulse_ai.train import (
    PROMOTION_MIN_REL_IMPROVEMENT,
    PROMOTION_MIN_HOLDOUT_SAMPLES,
    _should_promote,
)


class TestShouldPromote:

    def test_promotes_when_no_previous_bundle(self) -> None:
        assert _should_promote(new_mae=0.20, previous_best=None, holdout_n=1) is True

    def test_rejects_non_finite_mae(self) -> None:
        assert _should_promote(new_mae=math.nan, previous_best=0.10, holdout_n=10) is False
        assert _should_promote(new_mae=math.inf, previous_best=0.10, holdout_n=10) is False

    def test_rejects_when_holdout_below_minimum(self) -> None:
        # New MAE strictly better than previous, but holdout is too small to trust.
        small_holdout = PROMOTION_MIN_HOLDOUT_SAMPLES - 1
        assert _should_promote(new_mae=0.05, previous_best=0.10, holdout_n=small_holdout) is False

    def test_rejects_when_relative_improvement_below_threshold(self) -> None:
        # 0.5% improvement, below the 1% threshold.
        previous_best = 0.10
        new_mae       = previous_best * (1.0 - 0.005)
        assert _should_promote(new_mae=new_mae, previous_best=previous_best, holdout_n=20) is False

    def test_promotes_when_relative_improvement_meets_threshold(self) -> None:
        # 2% improvement, comfortably above the 1% threshold.
        previous_best = 0.10
        new_mae       = previous_best * (1.0 - 0.02)
        assert _should_promote(new_mae=new_mae, previous_best=previous_best, holdout_n=20) is True

    def test_rejects_equal_mae(self) -> None:
        # Identical MAE must not trigger a churn-promotion.
        assert _should_promote(new_mae=0.10, previous_best=0.10, holdout_n=20) is False

    def test_rejects_worse_mae(self) -> None:
        assert _should_promote(new_mae=0.20, previous_best=0.10, holdout_n=20) is False

    def test_minimum_threshold_constants_are_sane(self) -> None:
        # If a future change relaxes these to zero we lose the gate; assert they
        # remain meaningful for ourselves and for downstream readers.
        assert PROMOTION_MIN_REL_IMPROVEMENT > 0.0
        assert PROMOTION_MIN_HOLDOUT_SAMPLES >= 1
