// src/helper/faker/customFaker.ts
import { faker as baseFaker } from '@faker-js/faker';
import { generatePassportNumber } from './modules/passport';
import { generateMobileNumber } from './modules/mobile';
import { getValidPostCode } from './modules/postcode';
import { generatePersonFullName, generateBirthDate } from './modules/person';
import { generateNRIC,getYearFromNRIC } from './modules/nric';
import { generateCurrentDateTime, addMonthsToDate } from './modules/dateTime'; 

(baseFaker as any).custom = {
  passport: generatePassportNumber,
  mobile: {
    number: generateMobileNumber
  },
  postcode: {
    get: getValidPostCode
  },
  person: {
    fullName: generatePersonFullName,
    birthDate: generateBirthDate
  },
  nric: {
    generate: generateNRIC,
    getYear: getYearFromNRIC
  },
  datetime: {
    generateCurrentDateTime : generateCurrentDateTime,
    addMonthsToDate: addMonthsToDate
  }
};

export const faker = baseFaker as typeof baseFaker & {
  custom: {
    
    passport: (options?: {countryCode?: string}) => string;

    mobile: {
      number: (options?: {countryCode?: string, dialCodePrefix?: boolean}) => string;
    } 
    postcode: {
      get: (options?: {countryCode?: string,stateCode?: string}) => string;
    };
    person: {
      fullName: (options?: {  gender?: 'male' | 'female';  withPrefix?: boolean;  maxLength?: number;}) => string;
      birthDate: (options?: {min?: number; max?: number; year?: number; format?: | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD' | 'DD-MM-YY' | 'MM-DD-YY' | 'YY-MM-DD' | 'DD/MM/YY' | 'MM/DD/YY' | 'YY/MM/DD';}) => string;
    };
     nric: {
      generate: (options?: {prefix?: 'S' | 'T' | 'F' | 'G', yearOfBirth?: number}) => string;
      getYear: (nric: string) => string;
    };
    datetime: {
      /**
       * 
       * @param options Eg: {'format': 'DD/MM/YYYY HH:mm:ss'}, {'format': 'YY-MM-DD HH.mm'}
       * @returns 
       */
      generateCurrentDateTime : (options?: { format?: string }) => string;
      addMonthsToDate: (
        dateStr: string,
        months: number | string,
        options?: {
          inputFormat?:
            | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
            | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD'
            | 'DD-MM-YY'   | 'MM-DD-YY'   | 'YY-MM-DD'
            | 'DD/MM/YY'   | 'MM/DD/YY'   | 'YY/MM/DD';
          outputFormat?:
            | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
            | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD'
            | 'DD-MM-YY'   | 'MM-DD-YY'   | 'YY-MM-DD'
            | 'DD/MM/YY'   | 'MM/DD/YY'   | 'YY/MM/DD';
          clampToLastDayOfMonth?: boolean;
        }
      ) => string;
    };  


        
    
  };
  // mobile: {
  //   number: (countryCode?: string, withCountryCode?: boolean) => string;
  // };

  // postcode: {
  //   valid: {
  //     get: (countryCode?: string,stateCode?: string) => string;
  //   };
  // };
};


// // src/helper/faker/customFaker.ts
// import { faker as baseFaker } from '@faker-js/faker';
// import { generatePassportNumber } from './modules/passport';
// import { generateMobileNumber } from './modules/mobile';


// (baseFaker as any).passport = {
//   number: generatePassportNumber
// };

// export const faker = baseFaker as typeof baseFaker & {
//   passport: {
//     number: (countryCode?: string) => string;
//   };
// };