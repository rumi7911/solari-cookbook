#!/usr/bin/env python3
"""Capture privacy-safe BuildOrSkip product frames for the showcase video."""

from pathlib import Path

from playwright.sync_api import sync_playwright


APP_URL = "http://localhost:5173/"
OUTPUT_DIR = Path("/tmp/buildorskip-demo-captures")


def capture(page, filename: str) -> None:
    page.screenshot(path=str(OUTPUT_DIR / filename), full_page=False)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1600, "height": 900},
            device_scale_factor=1,
            color_scheme="light",
        )
        page = context.new_page()
        page.goto(APP_URL, wait_until="networkidle")
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")

        capture(page, "01-intake.png")

        page.get_by_role("button", name="Try the Solari example").click()
        page.get_by_role("button", name="Investigate", exact=True).click()
        page.get_by_role("dialog").wait_for(state="visible")
        capture(page, "02-consent.png")

        page.get_by_role(
            "checkbox", name="I understand this executes third-party code"
        ).check()
        capture(page, "03-consent-approved.png")
        page.get_by_role("button", name="Approve & run").click()

        page.get_by_text("Demo replay", exact=True).wait_for(state="visible")
        page.locator(".verdict-hero").scroll_into_view_if_needed()
        capture(page, "04-verdict.png")

        page.locator("#scores").scroll_into_view_if_needed()
        capture(page, "05-scores.png")

        page.locator("#verification").scroll_into_view_if_needed()
        capture(page, "06-verification.png")

        page.locator("#directions").scroll_into_view_if_needed()
        capture(page, "07-directions.png")

        page.locator("#sources").scroll_into_view_if_needed()
        capture(page, "08-sources.png")

        browser.close()


if __name__ == "__main__":
    main()
