#!/usr/bin/env python3
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

TARGET_URL = "https://www.marinetraffic.com/en/ais/details/ships/shipid:386575/imo:9229697/"
OUT_DIR = Path("artifacts/marinetraffic_probe")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def main():
    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "target_url": TARGET_URL,
        "mode": "read_only",
    }

    observed = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 1200},
            locale="en-US",
        )
        page = context.new_page()

        def capture(req):
            low = req.url.lower()
            if any(t in low for t in ("/api/", "ajax", "vessel", "ship", "position", "portcall", "track")):
                observed.append(req.url)

        page.on("request", capture)

        response = page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        title = page.title()
        html = page.content()
        try:
            visible = clean(page.locator("body").inner_text(timeout=10000))
        except Exception:
            visible = ""

        challenge_patterns = {
            "cloudflare": r"cloudflare|cf-chl",
            "attention_required": r"attention required",
            "verify_human": r"verify you are human|checking your browser",
            "captcha": r"captcha",
            "access_denied": r"access denied",
        }
        challenges = {
            k: bool(re.search(v, html + " " + visible, re.I))
            for k, v in challenge_patterns.items()
        }

        indicators = {
            "imo_9229697": bool(re.search(r"\b9229697\b", html + " " + visible)),
            "yuan_hai": bool(re.search(r"\bYUAN\s+HAI\b", visible, re.I)),
            "mmsi": bool(re.search(r"\bMMSI\b", visible, re.I)),
            "position": bool(re.search(r"\bPosition\b", visible, re.I)),
            "destination": bool(re.search(r"\bDestination\b", visible, re.I)),
            "eta": bool(re.search(r"\bETA\b", visible, re.I)),
            "port_calls": bool(re.search(r"\bPort Calls?\b", visible, re.I)),
            "dwt": bool(re.search(r"\bDWT\b|\bDeadweight\b", visible, re.I)),
        }

        unique_requests = []
        seen = set()
        for url in observed:
            if url not in seen:
                seen.add(url)
                unique_requests.append(url)

        report.update({
            "http_status": response.status if response else None,
            "final_url": page.url,
            "title": title,
            "html_bytes": len(html.encode("utf-8")),
            "visible_chars": len(visible),
            "challenges": challenges,
            "blocked": any(challenges.values()),
            "indicators": indicators,
            "visible_excerpt": visible[:4000],
            "observed_request_candidates": unique_requests[:150],
        })

        page.screenshot(path=str(OUT_DIR / "page.png"), full_page=True)
        (OUT_DIR / "page.html").write_text(html, encoding="utf-8")
        browser.close()

    (OUT_DIR / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
