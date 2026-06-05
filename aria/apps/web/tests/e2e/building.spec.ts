import { test, expect } from "@playwright/test";

const THE_DOCK = "e5a3fddc-e22c-431c-a5d3-ee29ef8604d1";

test.describe("Building page", () => {
  test("tabs · agent run · actions · fullscreen · walkthrough polish", async ({
    page,
  }) => {
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[console.error]", msg.text());
    });

    await page.goto(`/building/${THE_DOCK}`);

    // ─── Tabs ─────────────────────────────────────────────────────────────
    const scanTab = page.getByRole("button", { name: /3D SCAN/ });
    const walkTab = page.getByRole("button", { name: /WALKTHROUGH/ });
    await expect(scanTab).toBeVisible();
    await expect(walkTab).toBeVisible();
    await expect(scanTab).toHaveAttribute("aria-pressed", "true");
    await expect(walkTab).toHaveAttribute("aria-pressed", "false");

    // 3D scan loads a canvas (Three.js renders the USDZ — up to ~60s)
    await expect(page.locator("canvas").first()).toBeVisible({
      timeout: 90_000,
    });

    // Switch to WALKTHROUGH; verify viewer renders + scenario strip present
    await walkTab.click();
    await expect(walkTab).toHaveAttribute("aria-pressed", "true");
    await expect(scanTab).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("SCENARIO", { exact: true })).toBeVisible();
    await expect(page.getByText("STORM SURGE")).toBeVisible();
    await expect(page.getByText("HURRICANE WIND")).toBeVisible();

    // Switch back to 3D scan
    await scanTab.click();
    await expect(scanTab).toHaveAttribute("aria-pressed", "true");

    // Evac paths mode — calibrated to walkthrough graph
    await page.getByRole("button", { name: "EVAC", exact: true }).click();
    await expect(page.getByText(/\d+\/\d+ EXITS OPEN/)).toBeVisible();
    await expect(page.getByText(/EVAC · \d+\/\d+ OPEN/)).toBeVisible();

    // Surge to 1FT — grade exits block, count drops
    const surgeSlider = page.locator('input[type="range"]').first();
    await surgeSlider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(el, "1");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByText(/SURGE.*1 FT · WATER ACTIVE/)).toBeVisible({
      timeout: 10_000,
    });

    // ─── Agent run ────────────────────────────────────────────────────────
    const runBtn = page.getByRole("button", { name: "RUN PRE-PLAN AGENT" });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Wait until the agent completes — IMMEDIATE ACTIONS + AGENT COMPLETE both appear
    await expect(page.getByText("IMMEDIATE ACTIONS")).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByText(/AGENT COMPLETE/)).toBeVisible();
    await expect(
      page.locator("aside").getByText("COMPLETE", { exact: true }),
    ).toBeVisible();

    // Hazard pins index onto the 3D scan after the agent completes
    await scanTab.click();
    await page.getByRole("button", { name: "HAZARDS", exact: true }).click();
    await expect(page.getByText(/\d+ HAZARD PIN/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("group", { name: "Filter hazard pins" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^WIND\b/ }),
    ).toBeVisible();
    await expect(page.getByText(/\d+\/\d+ INDEXED/)).toBeVisible({
      timeout: 30_000,
    });

    // ─── Actions panel ────────────────────────────────────────────────────
    const actionsSection = page
      .locator("section")
      .filter({ has: page.getByText("IMMEDIATE ACTIONS", { exact: true }) });
    const actionCards = actionsSection.getByRole("button");
    const count = await actionCards.count();
    expect(count, "at least 5 action cards generated").toBeGreaterThanOrEqual(5);
    expect(count, "no more than 7 action cards").toBeLessThanOrEqual(7);

    // Click first action → ✓ DISPATCHED · HH:MM:SS swaps in
    const first = actionCards.first();
    await first.scrollIntoViewIfNeeded();
    const labelBefore = (await first.textContent())?.trim() ?? "";
    await first.click();
    await expect(first).toContainText("✓ DISPATCHED");
    await expect(first).toContainText(/\d{2}:\d{2}:\d{2}/);
    // The label itself should still be there (label + new dispatched line)
    const firstLabel = labelBefore.split("\n")[0]?.trim() ?? "";
    if (firstLabel) await expect(first).toContainText(firstLabel);

    // ─── Fullscreen modal ─────────────────────────────────────────────────
    await page.getByRole("button", { name: "Open fullscreen report" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("ARIA · PRE-INCIDENT PLAN")).toBeVisible();
    await expect(modal.getByText("HEADLINE RISK")).toBeVisible();
    await expect(modal.getByText("HAZARD ANALYSIS")).toBeVisible();
    // Dispatch state survives into the fullscreen view
    await expect(modal.getByText("✓ DISPATCHED").first()).toBeVisible();

    // ESC closes
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);

    // ─── Walkthrough polish ──────────────────────────────────────────────
    await walkTab.click();

    // After the agent runs, walkthrough annotations come from agent output.
    // Each annotation pill carries `title={a.label}` and a max-width truncate.
    const annotationPills = page.locator("span[title]").filter({
      hasText: /\w/,
    });
    const annotationCount = await annotationPills.count();
    expect(annotationCount, "at least one annotation pill on viewpoint 1")
      .toBeGreaterThanOrEqual(1);

    // Scenario strip: orange hairline + scenario label
    await expect(page.getByText(/BASELINE.*CLEAR/)).toBeVisible();
    await expect(page.getByText(/CURRENT:\s*DRY/i)).toBeVisible();

    // Drag the surge slider to index 3 (6FT) and confirm the label updates
    await surgeSlider.evaluate((el: HTMLInputElement) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(el, "3");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.getByText(/CURRENT:\s*6FT/i)).toBeVisible();
    await expect(page.getByText(/MAJOR SURGE/i)).toBeVisible();
  });
});
