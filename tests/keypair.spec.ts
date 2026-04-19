import { test, expect } from "@playwright/test";

test.describe("Keypair tool", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/keypair");
  });

  test("loads with correct heading and instructions", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Keypair Tool/i })).toBeVisible();
    await expect(page.getByText(/Use this tool to sign a payload with a Ed25519 keypair/i)).toBeVisible();
  });

  test("shows Generate and Use Existing buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Generate New/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Use Existing/i })).toBeVisible();
  });

  test("About section expands and collapses source links", async ({ page }) => {
    const about = page.getByRole("button", { name: /About/i });

    await expect(page.getByRole("link", { name: /keypair tool code/i })).not.toBeVisible();
    await about.click();
    await expect(page.getByRole("link", { name: /keypair tool code/i })).toHaveAttribute(
      "href",
      "https://github.com/zcashme/zcashnames/blob/main/app/%28site%29/keypair/page.tsx",
    );
    await expect(page.getByRole("link", { name: /test coverage/i })).toHaveAttribute(
      "href",
      "https://github.com/zcashme/zcashnames/blob/main/tests/keypair.spec.ts",
    );
    await about.click();
    await expect(page.getByRole("link", { name: /keypair tool code/i })).not.toBeVisible();
  });

  test("private key import field is visible", async ({ page }) => {
    await expect(page.getByRole("textbox", { name: /Private key/i })).toBeVisible();
  });

  test("Generate New reveals sign section", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    await expect(page.getByRole("heading", { name: /Sign a payload/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Payload/i })).toBeVisible();
  });

  test("Generate New keeps public key hidden until signing", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();

    await expect(page.getByText("Private Key (base64)")).toBeVisible();
    await expect(page.getByText("Public Key (base64)")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Copy Public Key/i })).not.toBeVisible();
  });

  test("Use Existing validates private key without revealing public key", async ({ page }) => {
    await page.getByRole("textbox", { name: /Private key/i }).fill("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

    await expect(page.getByText("Valid Ed25519 key.")).toBeVisible();
    await expect(page.getByText("Public Key (derived)")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Copy Public Key/i })).not.toBeVisible();
  });

  test("Generate New shows Regenerate button and no Start over button", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    await expect(page.getByRole("button", { name: /Regenerate/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start over/i })).not.toBeVisible();
  });

  test("signing a payload produces a result", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    // Wait for sign section to render before interacting
    await expect(page.getByRole("heading", { name: /Sign a payload/i })).toBeVisible();
    const payloadInput = page.getByRole("textbox", { name: /sovereign payload/i });
    await payloadInput.fill("test-payload");
    await page.getByRole("button", { name: /Sign Payload/i }).click();
    // Should show the signed payload output section
    await expect(page.getByText("Signature (base64)")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Public key (base64)")).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy Public Key/i })).toBeVisible();
  });

  test("generated keypair shows storage warning and signed payload disables signing", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    const payloadInput = page.getByRole("textbox", { name: /sovereign payload/i });
    await payloadInput.fill("test-payload");
    await page.getByRole("button", { name: /Sign Payload/i }).click();

    await expect(page.getByRole("button", { name: "(Signed)" })).toBeDisabled();
    await expect(page.getByText(/Securely store your private key/i)).toBeVisible();
  });

  test("changing payload hides signed payload and re-enables signing", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    const payloadInput = page.getByRole("textbox", { name: /sovereign payload/i });
    await payloadInput.fill("test-payload");
    await page.getByRole("button", { name: /Sign Payload/i }).click();
    await expect(page.getByText("Signature (base64)")).toBeVisible({ timeout: 10000 });

    await payloadInput.fill("changed-payload");

    await expect(page.getByText("Signature (base64)")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Payload/i })).toBeEnabled();
  });

  test("changing key source hides signed payload and re-enables signing", async ({ page }) => {
    await page.getByRole("textbox", { name: /Private key/i }).fill("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    const payloadInput = page.getByRole("textbox", { name: /sovereign payload/i });
    await payloadInput.fill("test-payload");
    await page.getByRole("button", { name: /Sign Payload/i }).click();
    await expect(page.getByText("Signature (base64)")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Generate New/i }).click();

    await expect(page.getByText("Signature (base64)")).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Payload/i })).toBeEnabled();
  });

  test("switching to empty existing keypair clears generated key access", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    await expect(page.getByRole("heading", { name: /Sign a payload/i })).toBeVisible();

    await page.getByRole("button", { name: /Use Existing/i }).click();

    await expect(page.getByRole("textbox", { name: /Private key/i })).toHaveValue("");
    await expect(page.getByRole("heading", { name: /Sign a payload/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Payload/i })).not.toBeVisible();
  });

  test("clearing imported private key removes signing access and signed output", async ({ page }) => {
    const privateKeyInput = page.getByRole("textbox", { name: /Private key/i });
    await privateKeyInput.fill("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    const payloadInput = page.getByRole("textbox", { name: /sovereign payload/i });
    await payloadInput.fill("test-payload");
    await page.getByRole("button", { name: /Sign Payload/i }).click();
    await expect(page.getByText("Signature (base64)")).toBeVisible({ timeout: 10000 });

    await privateKeyInput.fill("");

    await expect(page.getByText("Signature (base64)")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /Sign a payload/i })).not.toBeVisible();
  });

  test("Regenerate keeps generated mode and clears signed output", async ({ page }) => {
    await page.getByRole("button", { name: /Generate New/i }).click();
    const payloadInput = page.getByRole("textbox", { name: /sovereign payload/i });
    await payloadInput.fill("test-payload");
    await page.getByRole("button", { name: /Sign Payload/i }).click();
    await expect(page.getByText("Signature (base64)")).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Regenerate/i }).click();

    await expect(page.getByText("Signature (base64)")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: /Sign a payload/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign Payload/i })).toBeEnabled();
  });
});
