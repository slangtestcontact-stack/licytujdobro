import { describe, expect, it } from "vitest";
import { getMinIncrement, getMinNextBid, getRequiredBid } from "@/lib/config";
import { canHandOverItem, canTransitionListing, canTransitionTransaction } from "@/lib/state-machine";
import { polishPlural } from "@/lib/auction-logic";

describe("reguły licytacji", () => {
  it("pierwsza oferta może być równa cenie początkowej", () => {
    expect(getRequiredBid(10, 10, 0)).toBe(10);
  });
  it("kolejna oferta uwzględnia minimalne przebicie", () => {
    expect(getRequiredBid(10, 10, 1)).toBe(12);
    expect(getMinNextBid(49)).toBe(51);
    expect(getMinNextBid(50)).toBe(55);
    expect(getMinNextBid(199)).toBe(204);
    expect(getMinNextBid(200)).toBe(210);
    expect(getMinNextBid(499)).toBe(509);
    expect(getMinNextBid(500)).toBe(520);
    expect(getMinNextBid(120, 10)).toBe(130);
    expect(getRequiredBid(50, 120, 2, 10)).toBe(130);
  });
  it("progi przebicia są prawidłowe", () => {
    expect(getMinIncrement(49)).toBe(2);
    expect(getMinIncrement(50)).toBe(5);
    expect(getMinIncrement(200)).toBe(10);
    expect(getMinIncrement(500)).toBe(20);
  });
});

describe("maszyny stanów", () => {
  it("nie pozwala uruchomić szkicu bez moderacji", () => {
    expect(canTransitionListing("SZKIC", "AKTYWNA")).toBe(false);
    expect(canTransitionListing("SZKIC", "OCZEKUJE_NA_MODERACJE")).toBe(true);
  });
  it("przekazanie jest dostępne dopiero po weryfikacji wpłaty", () => {
    expect(canHandOverItem("OCZEKIWANIE_NA_BLIK")).toBe(false);
    expect(canHandOverItem("WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO")).toBe(false);
    expect(canHandOverItem("WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO")).toBe(false);
    expect(canHandOverItem("WPLATA_POTWIERDZONA_OBUSTRONNIE")).toBe(true);
    expect(canTransitionTransaction("WPLATA_POTWIERDZONA_OBUSTRONNIE", "PRZEDMIOT_PRZEKAZANY")).toBe(true);
    expect(canTransitionTransaction("OCZEKIWANIE_NA_BLIK", "WPLATA_POTWIERDZONA_OBUSTRONNIE")).toBe(true);
  });
});

describe("polskie liczby mnogie", () => {
  it("odmienia słowo oferta", () => {
    expect(polishPlural(1, "oferta", "oferty", "ofert")).toBe("oferta");
    expect(polishPlural(2, "oferta", "oferty", "ofert")).toBe("oferty");
    expect(polishPlural(12, "oferta", "oferty", "ofert")).toBe("ofert");
    expect(polishPlural(22, "oferta", "oferty", "ofert")).toBe("oferty");
  });
});
