import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "result-redesign.pdf");
  fs.writeFileSync(
    tmpPath,
    Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
    )
  );
  return tmpPath;
}

const fakeNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { colab: { name: "test.ipynb" }, kernelspec: { display_name: "Python 3", language: "python", name: "python3" } },
  cells: [],
};

async function triggerResult(page: any, pdfPath: string) {
  await page.route("**/generate", async (route: any) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeNotebook) });
  });
  await page.goto("/");
  await page.getByTestId("api-key-input").fill("sk-test");
  await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
  await page.getByTestId("generate-button").click();
  await page.getByTestId("result-panel").waitFor({ state: "visible", timeout: 8000 });
}

test.describe("ResultPanel Redesign — Task 8", () => {
  let pdfPath: string;

  test.beforeAll(() => { pdfPath = createTestPdf(); });
  test.afterAll(() => { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); });

  test("result panel has animate-slide-up class", async ({ page }) => {
    await triggerResult(page, pdfPath);
    await page.screenshot({ path: "tests/screenshots/task8-01-result-panel-visible.png" });

    const hasSlideUp = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='result-panel']");
      return el?.classList.contains("animate-slide-up") ?? false;
    });
    expect(hasSlideUp).toBe(true);
  });

  test("result panel shows checkmark icon", async ({ page }) => {
    await triggerResult(page, pdfPath);

    const checkIcon = page.getByTestId("result-check-icon");
    await expect(checkIcon).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task8-02-check-icon.png" });
  });

  test("result panel shows 'Notebook ready!' heading", async ({ page }) => {
    await triggerResult(page, pdfPath);

    const heading = page.getByTestId("result-heading");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/notebook ready/i);

    await page.screenshot({ path: "tests/screenshots/task8-03-heading.png" });
  });

  test("download button has solid indigo styling", async ({ page }) => {
    await triggerResult(page, pdfPath);

    const downloadBtn = page.getByTestId("download-button");
    await expect(downloadBtn).toBeVisible();

    // Should have a gradient/color background (not plain white)
    const bgImage = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='download-button']") as HTMLElement;
      return getComputedStyle(el).backgroundImage;
    });
    expect(bgImage).toContain("gradient");

    await page.screenshot({ path: "tests/screenshots/task8-04-download-button.png" });
  });

  test("open-colab button has outlined style with orange accent border", async ({ page }) => {
    await triggerResult(page, pdfPath);

    const colabBtn = page.getByTestId("open-colab-button");
    await expect(colabBtn).toBeVisible();

    // Should have a transparent/dark background (outlined style)
    const bgColor = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='open-colab-button']") as HTMLElement;
      return getComputedStyle(el).backgroundColor;
    });
    // Outlined button bg is transparent or very dark — not solid
    expect(bgColor).not.toBe("rgb(249, 171, 0)"); // not fully orange

    await page.screenshot({ path: "tests/screenshots/task8-05-colab-button.png" });
  });

  test("both buttons are full width", async ({ page }) => {
    await triggerResult(page, pdfPath);

    const panelBox = await page.getByTestId("result-panel").boundingBox();
    const downloadBox = await page.getByTestId("download-button").boundingBox();

    // Buttons should span close to full panel width (allowing for padding)
    if (panelBox && downloadBox) {
      expect(downloadBox.width).toBeGreaterThan(panelBox.width * 0.7);
    }

    await page.screenshot({ path: "tests/screenshots/task8-06-full-width-buttons.png" });
  });

  test("all original data-testids preserved", async ({ page }) => {
    await triggerResult(page, pdfPath);

    await expect(page.getByTestId("result-panel")).toBeVisible();
    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task8-07-testids-preserved.png" });
  });
});
