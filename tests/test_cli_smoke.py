import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_scripts_compile():
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "py_compile",
            "run_api.py",
            "run_scrapers.py",
            "clean_events.py",
            "validate.py",
        ],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
    )
    assert result.returncode == 0, result.stderr


def test_expected_cli_flags_present():
    script_flags = {
        "run_api.py": ["--start-date", "--end-date", "--refresh-all", "--refresh-team"],
        "run_scrapers.py": ["--start-date", "--end-date", "--output"],
        "clean_events.py": ["--cache-dir", "--output"],
        "validate.py": ["--api-csv", "--scraper-csv", "--report-out"],
    }

    for script_name, flags in script_flags.items():
        text = (REPO_ROOT / script_name).read_text(encoding="utf-8")
        for flag in flags:
            assert flag in text, f"Missing {flag} in {script_name}"
