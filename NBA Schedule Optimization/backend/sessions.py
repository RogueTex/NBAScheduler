"""
In-memory session store with TTL.
Each session holds Monte Carlo samples + locked series results.
"""

import time
import uuid
from dataclasses import dataclass, field

from simulator import BracketSample

SESSION_TTL_SECONDS = 7200  # 2 hours


@dataclass
class Session:
    session_id: str
    samples: list[BracketSample]
    locked: dict[str, dict] = field(default_factory=dict)  # {"r1_0": {"winner": ..., "length": ...}}
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    # Pre-computed game dates: game_cache[i] = [(venue, "YYYY-MM-DD", round_num), ...]
    game_cache: list = field(default_factory=list)


_store: dict[str, Session] = {}


def create_session(samples: list[BracketSample]) -> str:
    session_id = str(uuid.uuid4())
    _store[session_id] = Session(session_id=session_id, samples=samples)
    _evict_expired()
    return session_id


def get_session(session_id: str) -> Session | None:
    session = _store.get(session_id)
    if session is None:
        return None
    if time.time() - session.last_accessed > SESSION_TTL_SECONDS:
        del _store[session_id]
        return None
    session.last_accessed = time.time()
    return session


def lock_series(session_id: str, series_key: str, winner: str, length: int) -> bool:
    session = get_session(session_id)
    if session is None:
        return False
    session.locked[series_key] = {"winner": winner, "length": length}
    return True


def unlock_series(session_id: str, series_key: str) -> bool:
    session = get_session(session_id)
    if session is None:
        return False
    session.locked.pop(series_key, None)
    return True


def reset_locks(session_id: str) -> bool:
    session = get_session(session_id)
    if session is None:
        return False
    session.locked = {}
    return True


def set_game_cache(session_id: str, cache: list) -> None:
    s = _store.get(session_id)
    if s:
        s.game_cache = cache


def _evict_expired() -> None:
    now = time.time()
    expired = [sid for sid, s in _store.items()
               if now - s.last_accessed > SESSION_TTL_SECONDS]
    for sid in expired:
        del _store[sid]
