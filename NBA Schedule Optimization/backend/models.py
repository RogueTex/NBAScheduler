"""Pydantic request/response models for the FastAPI app."""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class SimulateRequest(BaseModel):
    east_seeds: list[str] = Field(..., min_length=8, max_length=10)
    west_seeds: list[str] = Field(..., min_length=8, max_length=10)
    n_samples: int = Field(default=20_000, ge=1_000, le=50_000)


class NetRatingsUpdateRequest(BaseModel):
    ratings: dict[str, float]


class LockRequest(BaseModel):
    session_id: str
    series_key: str  # e.g. "r1_0", "r2_3"
    winner: str
    length: int = Field(..., ge=4, le=7)


class UnlockRequest(BaseModel):
    session_id: str
    series_key: str


class StressTestConfig(BaseModel):
    r1_start: str         # ISO date string, e.g. "2026-04-19"
    min_rest_days: int = Field(default=1, ge=1, le=3)
    min_round_rest: int = Field(default=2, ge=2, le=4)
    weekend_penalty: float = Field(default=1.0, ge=1.0, le=3.0)   # multiplier on Fri/Sat/Sun conflict
    n_samples: int = Field(default=500, ge=100, le=2000)           # bracket samples to score
    hca: float = Field(default=2.5, ge=0.0, le=5.0)               # home-court advantage pts


class StressTestRequest(BaseModel):
    session_id: str
    config_a: StressTestConfig
    config_b: StressTestConfig


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class SimulateResponse(BaseModel):
    session_id: str
    n_samples: int
    east_seeds: list[str]
    west_seeds: list[str]


class MatchupCount(BaseModel):
    home: str
    away: str
    count: int
    probability: float  # count / n_active_samples


class DateProbability(BaseModel):
    date: str            # "YYYY-MM-DD"
    probability: float   # P(NBA game at this venue on this date)
    round_ceiling: int   # highest round that could land here (1-4), 0 if none
    sample_count: int    # number of samples used (decreases as locks are applied)
    top_matchups: list[MatchupCount] = []


class VenueProbabilities(BaseModel):
    session_id: str
    venue: str
    locked_count: int    # how many series are locked
    sample_count: int
    dates: list[DateProbability]


class SeriesInfo(BaseModel):
    key: str
    round: int
    home: str
    away: str


class LockResponse(BaseModel):
    session_id: str
    series_key: str
    sample_count: int    # samples remaining after filter


class StressTestResult(BaseModel):
    mean_conflict: float
    std_conflict: float
    min_conflict: float
    max_conflict: float


class StressTestResponse(BaseModel):
    session_id: str
    config_a: StressTestResult
    config_b: StressTestResult


class VenueInfo(BaseModel):
    team: str
    venue: str
    lat: float
    lon: float


class DefaultSeedsResponse(BaseModel):
    east_seeds: list[str]
    west_seeds: list[str]
