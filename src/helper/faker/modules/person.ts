import { faker } from '@faker-js/faker';

interface PersonNameOptions {
  gender?: 'male' | 'female';
  withPrefix?: boolean;
  maxLength?: number;
}

export function generatePersonFullName(options: PersonNameOptions = {}): string {
  const { gender, withPrefix = false, maxLength } = options;

  let firstName = faker.person.firstName(gender);
  let lastName = faker.person.lastName(gender);
  let fullName = withPrefix
    ? `${faker.person.prefix(gender)} ${firstName} ${lastName}`
    : `${firstName} ${lastName}`;

  if (maxLength && fullName.length > maxLength) {
    // Try trimming last name first, then first name
    lastName = lastName.slice(0, Math.max(1, Math.floor((maxLength - firstName.length - 1))));
    fullName = withPrefix
      ? `${faker.person.prefix(gender)} ${firstName} ${lastName}`
      : `${firstName} ${lastName}`;

    if (fullName.length > maxLength) {
      firstName = firstName.slice(0, Math.max(1, maxLength - lastName.length - 1));
      fullName = withPrefix
        ? `${faker.person.prefix(gender)} ${firstName} ${lastName}`
        : `${firstName} ${lastName}`;
    }
  }

  return fullName.replace(/-/g, ' ');
}

interface BirthDateOptions {
  min?: number;
  max?: number;
  year?: number;
  format?:
    | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
    | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD'
    | 'DD-MM-YY'   | 'MM-DD-YY'   | 'YY-MM-DD'
    | 'DD/MM/YY'   | 'MM/DD/YY'   | 'YY/MM/DD';
}

export function generateBirthDate(options: BirthDateOptions = {}): string {
  const { min = 18, max = 65, year, format = 'DD-MM-YYYY' } = options;
  let date: Date;
  // const date = faker.date.birthdate({ min, max, mode: 'age' });
  if (year) {
    // Generate a random date in the given year
    const month = faker.number.int({ min: 0, max: 11 });
    const day = faker.number.int({ min: 1, max: 28 }); // Safe for all months
    date = new Date(year, month, day);
  } else {
    date = faker.date.birthdate({ min, max, mode: 'age' });
  }

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const yy = String(yyyy).slice(-2);

  switch (format) {
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'YYYY/MM/DD':
      return `${yyyy}/${mm}/${dd}`;
    case 'MM-DD-YYYY':
      return `${mm}-${dd}-${yyyy}`;
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${yyyy}`;
    case 'DD-MM-YY':
      return `${dd}-${mm}-${yy}`;
    case 'MM-DD-YY':
      return `${mm}-${dd}-${yy}`;
    case 'YY-MM-DD':
      return `${yy}-${mm}-${dd}`;
    case 'DD/MM/YY':
      return `${dd}/${mm}/${yy}`;
    case 'MM/DD/YY':
      return `${mm}/${dd}/${yy}`;
    case 'YY/MM/DD':
      return `${yy}/${mm}/${dd}`;
    default:
      return `${dd}-${mm}-${yyyy}`;
  }
}
