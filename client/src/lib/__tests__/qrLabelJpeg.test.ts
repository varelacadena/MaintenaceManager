import { describe, expect, it } from "vitest";
import {
  QR_LABEL_DPI,
  assetTagLayout,
  labelPixelSize,
  mmToPx,
  qrJpegFileName,
  readJpegDpi,
  stampJpegDpi,
  textQrLayout,
} from "../qrLabelJpeg";
import { QR_LABEL_HEIGHT_MM, QR_LABEL_WIDTH_MM } from "../printQrLabel";

function rectInside(rect: { x: number; y: number; width: number; height: number }, width: number, height: number) {
  expect(rect.width).toBeGreaterThan(0);
  expect(rect.height).toBeGreaterThan(0);
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(width);
  expect(rect.y + rect.height).toBeLessThanOrEqual(height);
}

describe("label jpeg size", () => {
  it("matches a 50 by 25 mm sticker at 300 dpi", () => {
    const { width, height } = labelPixelSize();
    expect((width / QR_LABEL_DPI) * 25.4).toBeCloseTo(QR_LABEL_WIDTH_MM, 1);
    expect((height / QR_LABEL_DPI) * 25.4).toBeCloseTo(QR_LABEL_HEIGHT_MM, 1);
    expect(width / height).toBeCloseTo(2, 1);
  });

  it("keeps the asset-tag QR inside the sticker", () => {
    const layout = assetTagLayout();
    rectInside(layout.qrBox, layout.width, layout.height);
    expect(layout.qrBox.width).toBe(layout.qrBox.height);
    expect(layout.qrBox.width).toBe(mmToPx(17));
    for (const row of layout.rows) {
      rectInside(row.label, layout.width, layout.height);
      rectInside(row.value, layout.width, layout.height);
      expect(row.value.x + row.value.width).toBeLessThanOrEqual(layout.qrColumn.x);
    }
  });

  it("keeps a plain QR label inside the same sticker", () => {
    const layout = textQrLayout();
    rectInside(layout.qrBox, layout.width, layout.height);
    rectInside(layout.textBox, layout.width, layout.height);
    expect(layout.qrBox.width).toBe(layout.qrBox.height);
    expect(layout.textBox.x + layout.textBox.width).toBeLessThanOrEqual(layout.qrColumn.x);
  });

  it("stores the label dpi in the jpeg header", () => {
    const original = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
      0x4a, 0x46, 0x49, 0x46, 0x00,
      0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
      0xff, 0xd9,
    ]);
    const stamped = stampJpegDpi(original, 300);
    expect(readJpegDpi(stamped)).toBe(300);
    expect(stamped[0]).toBe(0xff);
    expect(stamped[1]).toBe(0xd8);
  });

  it("names the download as a jpg", () => {
    expect(qrJpegFileName("HART-KITC-HVAC-01")).toBe("HART-KITC-HVAC-01.jpg");
    expect(qrJpegFileName("a/b:c")).toBe("a-b-c.jpg");
  });
});
