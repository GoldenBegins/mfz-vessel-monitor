#!/usr/bin/env python3
"""Publish a sanitized vessel-monitor dashboard snapshot to GitHub Pages.

Designed to run on palette.ly after monitor_v2.py finishes.

Required environment already used by monitor_v2.py:
  GOOGLE_SPREADSHEET_ID
  GOOGLE_SERVICE_ACCOUNT_FILE

GitHub authentication (choose one):
  GITHUB_DASHBOARD_TOKEN
or create a local text file beside this script named:
  .dashboard_github_token

The token should be a fine-grained PAT restricted to:
  Repository: GoldenBegins/mfz-vessel-monitor
  Permission: Contents -> Read and write

No Google credentials, raw MFZ history, agent, berth or voyage records are
published. Only dashboard summaries and selected live estimate fields are sent.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import gspread
import requests
from google.oauth2.service_account import Credentials

LIBYA_TZ = ZoneInfo("Africa/Tripoli")
BASE_DIR = Path(__file__).resolve().parent
TOKEN_FILE = BASE_DIR / ".dashboard_github_token"
GITHUB_REPO = os.environ.get(
    "GITHUB_DASHBOARD_REPO", "GoldenBegins/mfz-vessel-monitor"
).strip()
GITHUB_BRANCH = os.environ.get("GITHUB_DASHBOARD_BRANCH", "main").strip()
GITHUB_DATA_PATH = os.environ.get("GITHUB_DASHBOARD_DATA_PATH", "data.json").strip()


def _number(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


def _int(value: Any) -> int:
    return int(round(_number(value)))


def _spreadsheet() -> gspread.Spreadsheet:
    spreadsheet_id = os.environ.get("GOOGLE_SPREADSHEET_ID", "").strip()
    if not spreadsheet_id:
        raise RuntimeError("GOOGLE_SPREADSHEET_ID is not configured")
    credentials_path = os.environ.get(
        "GOOGLE_SERVICE_ACCOUNT_FILE",
        str(BASE_DIR / "credentials" / "service-account.json"),
    )
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    credentials = Credentials.from_service_account_file(
        credentials_path, scopes=scopes
    )
    return gspread.authorize(credentials).open_by_key(spreadsheet_id)


def _records_with_retry(
    spreadsheet: gspread.Spreadsheet,
    sheet_name: str,
    attempts: int = 4,
) -> list[dict[str, Any]]:
    delay = 8
    for attempt in range(attempts):
        try:
            return spreadsheet.worksheet(sheet_name).get_all_records()
        except gspread.exceptions.APIError as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status != 429 or attempt == attempts - 1:
                raise
            logging.warning(
                "Google Sheets quota pause for %s; retrying in %ss",
                sheet_name,
                delay,
            )
            time.sleep(delay)
            delay *= 2
    return []


def _github_token() -> str:
    token = os.environ.get("GITHUB_DASHBOARD_TOKEN", "").strip()
    if token:
        return token
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    return ""


def build_dashboard_snapshot() -> dict[str, Any]:
    spreadsheet = _spreadsheet()

    # Keep API reads intentionally small: six sheet reads total.
    comparisons = _records_with_retry(spreadsheet, "Port Comparison")
    estimates = _records_with_retry(spreadsheet, "Benghazi Historical Estimates")
    calibrations = _records_with_retry(spreadsheet, "Vessel Calibration")
    identities = _records_with_retry(spreadsheet, "Vessel Identity Check")
    quality = _records_with_retry(spreadsheet, "Data Quality")
    run_log = _records_with_retry(spreadsheet, "Run Log")

    latest_comparison = comparisons[-1] if comparisons else {}

    misurata_calls = _int(latest_comparison.get("Misurata Calls"))
    benghazi_calls = _int(latest_comparison.get("Benghazi Calls"))
    estimated_teu = _int(latest_comparison.get("Benghazi Estimated TEU"))
    estimated_tons = _int(
        latest_comparison.get("Benghazi Estimated General Cargo (t)")
    )
    estimated_calls = _int(latest_comparison.get("Benghazi Estimated Calls"))
    unestimated_calls = _int(latest_comparison.get("Benghazi Unestimated Calls"))
    coverage = _number(latest_comparison.get("Estimate Coverage (%)"))
    high_medium = _int(latest_comparison.get("Historical High/Medium Calls"))
    fallback_low = _int(latest_comparison.get("Fallback Low Calls"))

    # Compatibility with the first dashboard schema if older comparison headers exist.
    if not estimated_teu:
        estimated_teu = _int(
            latest_comparison.get("Benghazi Estimated TEU from MFZ History")
        )
    if not estimated_tons:
        estimated_tons = _int(
            latest_comparison.get(
                "Benghazi Estimated General Cargo (t) from MFZ History"
            )
        )
    if benghazi_calls and not coverage and estimated_calls:
        coverage = round(estimated_calls / benghazi_calls * 100, 1)

    trusted_vessels = len([
        row for row in calibrations
        if str(row.get("IMO", "")).strip()
    ])

    needs_review_rows = [
        row for row in identities
        if str(row.get("Auto Status", "")).strip() == "Needs Review"
        and str(row.get("Manual Status", "")).strip() not in {"Verified", "Alias"}
    ]

    public_estimates: list[dict[str, Any]] = []
    for row in estimates:
        est_teu = _number(row.get("Estimated TEU"))
        est_tons = _number(row.get("Estimated General Cargo Tons"))
        if est_teu <= 0 and est_tons <= 0:
            continue
        if est_teu > 0:
            estimate_text = f"{est_teu:,.0f} TEU"
        else:
            estimate_text = f"{est_tons:,.0f} t"
        public_estimates.append({
            "vessel": str(row.get("Vessel", ""))[:80],
            "imo": str(row.get("IMO", ""))[:20],
            "type": str(row.get("Vessel Type", ""))[:50],
            "estimate": estimate_text,
            "confidence": str(row.get("Estimate Confidence", "Unverified"))[:30],
            "method": str(row.get("Estimation Method", ""))[:160],
        })
    public_estimates = public_estimates[-25:]

    # Public review list is deliberately capped and contains identity fields only.
    public_review: list[dict[str, Any]] = []
    for row in needs_review_rows[:25]:
        public_review.append({
            "historicalName": str(row.get("Historical Vessel Name", ""))[:80],
            "currentName": str(row.get("Master/Current Vessel Name", ""))[:80],
            "imo": str(row.get("IMO", ""))[:20],
            "masterMmsi": str(row.get("Master MMSI", ""))[:20],
            "observedMmsi": str(row.get("Observed MMSI(s)", ""))[:80],
            "status": "Needs Review",
        })

    # Only publish aggregate/ generic quality information; never raw historical rows.
    quality_items: list[dict[str, str]] = []
    if needs_review_rows:
        quality_items.append({
            "title": "Historical identity review",
            "detail": (
                f"{len(needs_review_rows)} historical identity combinations require "
                "review before calibration. Live calls remain counted."
            ),
        })

    econdb_failed = any(
        "EconDB" in str(row.get("Message", ""))
        and str(row.get("Status", "")).lower() == "failed"
        for row in run_log[-20:]
    )
    if econdb_failed:
        quality_items.append({
            "title": "EconDB benchmark warning",
            "detail": "The latest benchmark retrieval reported a warning or failure.",
        })

    # Keep public quality message generic even if internal Data Quality has details.
    high_quality_count = sum(
        1 for row in quality if str(row.get("Severity", "")).strip() == "High"
    )
    if high_quality_count:
        quality_items.append({
            "title": "High-priority data-quality checks",
            "detail": f"{high_quality_count} internal high-priority checks are recorded.",
        })

    comparison_public: list[dict[str, Any]] = []
    for row in comparisons[-12:]:
        period_start = str(row.get("Period Start", ""))
        period = period_start[:7] if len(period_start) >= 7 else period_start
        comparison_public.append({
            "period": period,
            "misurataCalls": _int(row.get("Misurata Calls")),
            "benghaziCalls": _int(row.get("Benghazi Calls")),
            "estimatedTEU": _int(
                row.get("Benghazi Estimated TEU")
                or row.get("Benghazi Estimated TEU from MFZ History")
            ),
            "estimatedGeneralCargoTons": _int(
                row.get("Benghazi Estimated General Cargo (t)")
                or row.get("Benghazi Estimated General Cargo (t) from MFZ History")
            ),
            "coverage": _number(row.get("Estimate Coverage (%)")),
        })

    now = datetime.now(LIBYA_TZ)
    return {
        "updatedAt": now.strftime("%Y-%m-%d %H:%M:%S"),
        "source": "palette.ly / monitor_v2.py",
        "summary": {
            "misurataCalls": misurata_calls,
            "benghaziCalls": benghazi_calls,
            "estimatedCalls": estimated_calls,
            "unestimatedCalls": unestimated_calls,
            "coverage": round(coverage, 1),
            "trustedVessels": trusted_vessels,
            "identityReview": len(needs_review_rows),
            "estimatedTEU": estimated_teu,
            "estimatedGeneralCargoTons": estimated_tons,
            "historicalHighMediumCalls": high_medium,
            "fallbackLowCalls": fallback_low,
        },
        "comparison": comparison_public,
        "estimates": public_estimates,
        "review": public_review,
        "quality": quality_items,
    }


def publish_to_github(snapshot: dict[str, Any]) -> str:
    token = _github_token()
    if not token:
        raise RuntimeError(
            "GITHUB_DASHBOARD_TOKEN is not configured and .dashboard_github_token was not found"
        )

    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_DATA_PATH}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MFZ-Vessel-Monitor-Dashboard-Sync/1.0",
    }

    sha = None
    response = requests.get(
        api_url,
        headers=headers,
        params={"ref": GITHUB_BRANCH},
        timeout=30,
    )
    if response.status_code == 200:
        sha = response.json().get("sha")
    elif response.status_code != 404:
        response.raise_for_status()

    content = json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n"
    payload: dict[str, Any] = {
        "message": f"Update dashboard data {snapshot['updatedAt']}",
        "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
        "branch": GITHUB_BRANCH,
    }
    if sha:
        payload["sha"] = sha

    response = requests.put(api_url, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    return response.json().get("commit", {}).get("sha", "")


def sync_dashboard() -> bool:
    """Build and publish one dashboard snapshot. Safe to call from monitor_v2."""
    try:
        snapshot = build_dashboard_snapshot()
        commit_sha = publish_to_github(snapshot)
        logging.info(
            "Dashboard synchronized to GitHub: %s (%s)",
            snapshot["updatedAt"],
            commit_sha[:10] if commit_sha else "commit created",
        )
        return True
    except Exception:
        logging.exception("Dashboard synchronization failed")
        return False


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    raise SystemExit(0 if sync_dashboard() else 1)
