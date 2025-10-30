// src/helper/faker/modules/passport.ts
import { faker } from "@faker-js/faker";

export function generatePassportNumber(options?: {countryCode?: string}): string {
  const {countryCode = 'AU'} = options;
  switch (countryCode.toUpperCase()) {
    case "IN":
      return `${faker.string.alpha({
        length: 1,
        casing: "upper",
      })}${faker.string.numeric(7)}`;
    case "UK":
      return `${faker.string.alpha({
        length: 2,
        casing: "upper",
      })}${faker.string.numeric(7)}`;
    case "US":
      return faker.string.numeric(9);
    case "AU": {
      const allowedPrefixes = ["PA","PB","PC","PD","PE","PF","PU","PW","PX","PZ"];
      const prefix = faker.helpers.arrayElement(allowedPrefixes);
      const digits = faker.string.numeric(7);
      return `${prefix}${digits}`;
    }
    case "SG": {
      const allowedPrefixes = ["E", "K", "S"];
      const prefix = faker.helpers.arrayElement(allowedPrefixes);
      const digits = faker.string.numeric(7);
      return `${prefix}${digits}`;
    }
    default:
      throw new Error(`Unsupported country code: ${countryCode}`);
  }
}
