import { describe, it, expect } from "vitest";
import { getMinIncrement, getMinNextBid } from "@/lib/config";
import { computeAntiSnipeExtension, isAuctionOver } from "@/lib/auction-logic";
import {
  canTransitionListing,
  canTransitionTransaction,
  canHandOverItem,
  assertNotSelfBid,
} from "@/lib/state-machine";

describe("minimalne przebicie", () => {
  it("2 zł dla ceny do 49 zł", () => {
    expect(getMinIncrement(10)).toBe(2);
    expect(getMinIncrement(49)).toBe(2);
    expect(getMinNextBid(40)).toBe(42);
  });

  it("5 zł dla ceny 50-199 zł", () => {
    expect(getMinIncrement(50)).toBe(5);
    expect(getMinIncrement(199)).toBe(5);
  });

  it("10 zł dla ceny 200-499 zł", () => {
    expect(getMinIncrement(200)).toBe(10);
    expect(getMinIncrement(499)).toBe(10);
  });

  it("20 zł dla ceny od 500 zł", () => {
    expect(getMinIncrement(500)).toBe(20);
    expect(getMinIncrement(10000)).toBe(20);
  });
});

describe("blokada licytowania własnej aukcji", () => {
  it("rzuca błąd gdy wystawiający = licytujący", () => {
    expect(() => assertNotSelfBid("user-1", "user-1")).toThrow("SELF_BID_FORBIDDEN");
  });
  it("przechodzi gdy to różne osoby", () => {
    expect(() => assertNotSelfBid("user-1", "user-2")).not.toThrow();
  });
});

describe("mechanizm antysnipingowy", () => {
  it("przedłuża aukcję, gdy oferta wpływa w ostatnich 2 minutach", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    const endAt = new Date("2025-01-01T12:01:30Z"); // 90s do końca
    const result = computeAntiSnipeExtension({ now, currentEndAt: endAt, totalExtensionSecondsSoFar: 0 });
    expect(result.extended).toBe(true);
    expect(result.appliedSeconds).toBe(120);
    expect(result.newEndAt.getTime()).toBe(endAt.getTime() + 120000);
  });

  it("nie przedłuża, gdy oferta wpływa wcześniej niż 2 minuty przed końcem", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    const endAt = new Date("2025-01-01T12:10:00Z");
    const result = computeAntiSnipeExtension({ now, currentEndAt: endAt, totalExtensionSecondsSoFar: 0 });
    expect(result.extended).toBe(false);
  });

  it("nie przekracza maksymalnego łącznego przedłużenia (20 minut)", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    const endAt = new Date("2025-01-01T12:01:00Z");
    const result = computeAntiSnipeExtension({
      now,
      currentEndAt: endAt,
      totalExtensionSecondsSoFar: 1150,
      maxExtensionSeconds: 1200,
    });
    expect(result.appliedSeconds).toBe(50);
    expect(result.newTotalExtensionSeconds).toBe(1200);
  });

  it("kolejne oferty po wyczerpaniu limitu już nie przedłużają", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    const endAt = new Date("2025-01-01T12:01:00Z");
    const result = computeAntiSnipeExtension({
      now,
      currentEndAt: endAt,
      totalExtensionSecondsSoFar: 1200,
      maxExtensionSeconds: 1200,
    });
    expect(result.extended).toBe(false);
    expect(result.newEndAt.getTime()).toBe(endAt.getTime());
  });
});

describe("zakończenie aukcji", () => {
  it("uznaje aukcję za zakończoną gdy czas serwera minął endAt", () => {
    expect(isAuctionOver(new Date("2025-01-01T00:00:00Z"), new Date("2025-01-01T00:00:01Z"))).toBe(true);
    expect(isAuctionOver(new Date("2025-01-01T00:00:00Z"), new Date("2024-12-31T23:59:59Z"))).toBe(false);
  });
});

describe("przejścia statusów aukcji", () => {
  it("dozwolone przejście SZKIC -> OCZEKUJE_NA_MODERACJE", () => {
    expect(canTransitionListing("SZKIC", "OCZEKUJE_NA_MODERACJE")).toBe(true);
  });
  it("niedozwolone przejście SZKIC -> AKTYWNA (pominięcie moderacji)", () => {
    expect(canTransitionListing("SZKIC", "AKTYWNA")).toBe(false);
  });
  it("niedozwolone cofnięcie ZAKONCZONA -> AKTYWNA", () => {
    expect(canTransitionListing("ZAKONCZONA", "AKTYWNA")).toBe(false);
  });
});

describe("przejścia statusów transakcji", () => {
  it("wpłata musi być zweryfikowana przed przekazaniem przedmiotu", () => {
    expect(canHandOverItem("OCZEKIWANIE_NA_BLIK")).toBe(false);
    expect(canHandOverItem("WPLATA_ZATWIERDZONA_PRZEZ_KUPUJACEGO")).toBe(false);
    expect(canHandOverItem("WPLATA_POTWIERDZONA_PRZEZ_SPRZEDAJACEGO")).toBe(false);
    expect(canHandOverItem("WPLATA_POTWIERDZONA_OBUSTRONNIE")).toBe(true);
  });
  it("dozwolone przejście do sporu z niezgodności opisu", () => {
    expect(canTransitionTransaction("PRZEDMIOT_NIEZGODNY_Z_OPISEM", "SPOR")).toBe(true);
  });
  it("niedozwolone przejście wprost z oczekiwania na potwierdzenie do zakończenia", () => {
    expect(canTransitionTransaction("OCZEKUJE_NA_POTWIERDZENIE_ZWYCIEZCY", "ZAKONCZONA_POMYSLNIE")).toBe(false);
  });
});
