#!/usr/bin/env python3
"""Publish a sanitized MFZ vessel-monitor snapshot to GitHub Pages."""

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
    credentials = Credentials.from_service_account_file(credentials_path, scopes=scopes)
    return gspread.authorize(credentials).open_by_key(spreadsheet_id)


def _records(spreadsheet: gspread.Spreadsheet, sheet_name: str, attempts: int = 4) -> list[dict[str, Any]]:
    delay = 8
    for attempt in range(attempts):
        try:
            return spreadsheet.worksheet(sheet_name).get_all_records()
        except gspread.exceptions.APIError as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status != 429 or attempt == attempts - 1:
                raise
            logging.warning("Google Sheets quota pause for %s; retrying in %ss", sheet_name, delay)
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
    comparisons = _records(spreadsheet, "Port Comparison")
    estimates = _records(spreadsheet, "Benghazi Historical Estimates")
    calibrations = _records(spreadsheet, "Vessel Calibration")
    identities = _records(spreadsheet, "Vessel Identity Check")
    quality = _records(spreadsheet, "Data Quality")
    run_log = _records(spreadsheet, "Run Log")

    latest = comparisons[-1] if comparisons else {}
    mis_calls = _int(latest.get("Misurata Calls"))
    ben_calls = _int(latest.get("Benghazi Calls"))
    mis_actual_teu = _int(latest.get("Misurata Actual TEU"))
    mis_actual_tons = _int(latest.get("Misurata Actual General Cargo (t)"))
    mis_teu_status = str(latest.get("Misurata TEU Status", "Not available"))
    mis_tons_status = str(latest.get("Misurata General Cargo Status", "Not available"))
    ben_teu = _int(latest.get("Benghazi Estimated TEU"))
    ben_tons = _int(latest.get("Benghazi Estimated General Cargo (t)"))
    estimated_calls = _int(latest.get("Benghazi Estimated Calls"))
    unestimated_calls = _int(latest.get("Benghazi Unestimated Calls"))
    coverage = _number(latest.get("Estimate Coverage (%)"))
    high_medium = _int(latest.get("Historical High/Medium Calls"))
    fallback_low = _int(latest.get("Fallback Low Calls"))
    if ben_calls and not coverage and estimated_calls:
        coverage = round(estimated_calls / ben_calls * 100, 1)

    trusted_vessels = sum(1 for row in calibrations if str(row.get("IMO", "")).strip())
    needs_review_rows = [
        row for row in identities
        if str(row.get("Auto Status", "")).strip() == "Needs Review"
        and str(row.get("Manual Status", "")).strip() not in {"Verified", "Alias"}
    ]

    public_estimates = []
    for row in estimates:
        teu = _number(row.get("Estimated TEU"))
        tons = _number(row.get("Estimated General Cargo Tons"))
        if teu <= 0 and tons <= 0:
            continue
        public_estimates.append({
            "vessel": str(row.get("Vessel", ""))[:80],
            "imo": str(row.get("IMO", ""))[:20],
            "type": str(row.get("Vessel Type", ""))[:50],
            "estimate": f"{teu:,.0f} TEU" if teu > 0 else f"{tons:,.0f} t",
            "confidence": str(row.get("Estimate Confidence", "Unverified"))[:30],
            "method": str(row.get("Estimation Method", ""))[:160],
        })
    public_estimates = public_estimates[-25:]

    public_review = [{
        "historicalName": str(row.get("Historical Vessel Name", ""))[:80],
        "currentName": str(row.get("Master/Current Vessel Name", ""))[:80],
        "imo": str(row.get("IMO", ""))[:20],
        "masterMmsi": str(row.get("Master MMSI", ""))[:20],
        "observedMmsi": str(row.get("Observed MMSI(s)", ""))[:80],
        "status": "Needs Review",
    } for row in needs_review_rows[:25]]

    quality_items = []
    if needs_review_rows:
        quality_items.append({
            "title": "Historical identity review",
            "detail": f"{len(needs_review_rows)} historical identity combinations require review before calibration. Live calls remain counted.",
        })
    if any(
        "EconDB" in str(row.get("Message", "")) and str(row.get("Status", "")).lower() == "failed"
        for row in run_log[-20:]
    ):
        quality_items.append({
            "title": "EconDB benchmark warning",
            "detail": "The latest benchmark retrieval reported a warning or failure.",
        })
    high_quality_count = sum(1 for row in quality if str(row.get("Severity", "")).strip() == "High")
    if high_quality_count:
        quality_items.append({
            "title": "High-priority data-quality checks",
            "detail": f"{high_quality_count} internal high-priority checks are recorded.",
        })

    comparison_public = []
    for row in comparisons[-12:]:
        period_start = str(row.get("Period Start", ""))
        comparison_public.append({
            "period": period_start[:7] if len(period_start) >= 7 else period_start,
            "misurataCalls": _int(row.get("Misurata Calls")),
            "benghaziCalls": _int(row.get("Benghazi Calls")),
            "misurataActualTEU": _int(row.get("Misurata Actual TEU")),
            "misurataActualGeneralCargoTons": _int(row.get("Misurata Actual General Cargo (t)")),
            "misurataTEUStatus": str(row.get("Misurata TEU Status", "Not available")),
            "misurataGeneralCargoStatus": str(row.get("Misurata General Cargo Status", "Not available")),
            "estimatedTEU": _int(row.get("Benghazi Estimated TEU")),
            "estimatedGeneralCargoTons": _int(row.get("Benghazi Estimated General Cargo (t)")),
            "coverage": _number(row.get("Estimate Coverage (%)")),
        })

    now = datetime.now(LIBYA_TZ)
    return {
        "updatedAt": now.strftime("%Y-%m-%d %H:%M:%S"),
        "source": "palette.ly / monitor_v2.py",
        "summary": {
            "misurataCalls": mis_calls,
            "benghaziCalls": ben_calls,
            "misurataActualTEU": mis_actual_teu,
            "misurataActualGeneralCargoTons": mis_actual_tons,
            "misurataTEUStatus": mis_teu_status,
            "misurataGeneralCargoStatus": mis_tons_status,
            "estimatedCalls": estimated_calls,
            "unestimatedCalls": unestimated_calls,
            "coverage": round(coverage, 1),
            "trustedVessels": trusted_vessels,
            "identityReview": len(needs_review_rows),
            "estimatedTEU": ben_teu,
            "estimatedGeneralCargoTons": ben_tons,
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
        raise RuntimeError("GITHUB_DASHBOARD_TOKEN is not configured and .dashboard_github_token was not found")
    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{GITHUB_DATA_PATH}"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MFZ-Vessel-Monitor-Dashboard-Sync/2.0",
    }
    sha = None
    response = requests.get(api_url, headers=headers, params={"ref": GITHUB_BRANCH}, timeout=30)
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
    try:
        snapshot = build_dashboard_snapshot()
        commit_sha = publish_to_github(snapshot)
        logging.info("Dashboard synchronized to GitHub: %s (%s)", snapshot["updatedAt"], commit_sha[:10] if commit_sha else "commit created")
        return True
    except Exception:
        logging.exception("Dashboard synchronization failed")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    raise SystemExit(0 if sync_dashboard() else 1)
