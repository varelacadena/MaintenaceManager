import { describe, expect, it } from "vitest";
import { getEquipmentAssetTagFields } from "../equipmentQrLabel";
import { getMobileEquipmentAssetTagFields } from "../mobileEquipmentQrLabel";
import { buildAssetTagPrintDocument } from "../printQrLabel";

describe("equipment asset tag fields", () => {
  it("prints the room name and floor on the location row", () => {
    expect(
      getEquipmentAssetTagFields(
        {
          assetTag: "HART-KITC-HVAC-01",
          name: "Air handler 2",
          category: "hvac",
          spaceId: "kitchen",
        },
        [{ id: "kitchen", name: "Kitchen", floor: "2nd Floor" }],
      ),
    ).toEqual({
      id: "HART-KITC-HVAC-01",
      name: "Air handler 2",
      location: "Kitchen · 2nd Floor",
      category: "HVAC",
    });
  });

  it("uses the room name alone when the space has no floor", () => {
    expect(
      getEquipmentAssetTagFields(
        { assetTag: "LIBR-R2-ELEC-01", name: "Panel", category: "electrical", spaceId: "room" },
        [{ id: "room", name: "Room 205", floor: null }],
      ).location,
    ).toBe("Room 205");
  });

  it("keeps a tools location note in full", () => {
    expect(
      getMobileEquipmentAssetTagFields({
        assetTag: "MOWER-04",
        name: "Walk-behind mower",
        category: "mower",
        currentLocationNotes: "Hartland shed, north wall",
      }),
    ).toEqual({
      id: "MOWER-04",
      name: "Walk-behind mower",
      location: "Hartland shed, north wall",
      category: "Mower",
    });
  });
});

describe("asset tag print document", () => {
  it("sizes the page to the 50 by 25 mm sticker", () => {
    const html = buildAssetTagPrintDocument({
      title: "HART-KITC-HVAC-01",
      qrHtml: '<svg width="120" height="120"></svg>',
      fields: {
        id: "HART-KITC-HVAC-01",
        name: "Air <handler>",
        location: "Kitchen · 2nd Floor",
        category: "HVAC",
      },
    });

    expect(html).toContain("size: 50mm 25mm");
    expect(html).toContain("ASSET TAG");
    expect(html).toContain("Kitchen · 2nd Floor");
    expect(html).toContain("Air &lt;handler&gt;");
    expect(html).toContain('width="17mm"');
  });
});
