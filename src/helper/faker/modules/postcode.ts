// src/helper/faker/modules/passport.ts
import { faker } from "@faker-js/faker";
import validSGPostcodes from "./data/postcodes_valid_sg.json";

interface PostCodeOptions {
  countryCode?: string;
  stateCode?: string;
}


export function getValidPostCode(options: PostCodeOptions = {}): string {
  // export function getValidPostCode(countryCode: string = "AU", stateCode?: string): string {
  const { countryCode = "AU", stateCode = "" } = options;


  switch (countryCode.toUpperCase()) {
    case "SG": {
      return faker.helpers.arrayElement(validSGPostcodes);
    }
    
    case "AU":
      const AU_STATE_RANGES: Record<string, [number, number]> = {
        "NSW": [2000, 2999],
        "ACT": [2600, 2639],
        "VIC": [3000, 3999],
        "QLD": [4000, 4999],
        "SA": [5000, 5799],
        "WA": [6000, 6797],
        "TAS": [7000, 7799],
        "NT": [800, 899]
      };
      if (stateCode) {
        const range = AU_STATE_RANGES[stateCode.toUpperCase()];
        if (!range) {
          throw new Error(`Unsupported state code: ${stateCode}`);
        }
        const [min, max] = range;
        const postcodeLength = max.toString().length;
        const postcode = faker.number.int({ min, max }).toString().padStart(postcodeLength, '0');
        return postcode;
      }
      // If no state is specified, choose a random state and generate a postcode
      const randomState = faker.helpers.arrayElement(Object.keys(AU_STATE_RANGES));
      const [min, max] = AU_STATE_RANGES[randomState];
      const postcodeLength = max.toString().length;
      const postcode = faker.number.int({ min, max }).toString().padStart(postcodeLength, '0');
      return postcode;


    default:
      throw new Error(`Unsupported country code: ${countryCode}`);
  }


 
}

