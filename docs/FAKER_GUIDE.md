# Faker - Test Data Generation Guide

PlayQ Core includes **Faker** for generating realistic test data automatically.

---

## 📋 Quick Start

Faker is available globally in your tests as `faker`:

```javascript
// BDD (in step definitions)
const username = faker.person.fullName();

// Programmatic (Node.js)
const { faker } = require('@playq/core/dist/helper/faker/customFaker');
const email = faker.internet.email();

// Playwright
page.fill('input[name="email"]', faker.internet.email());
```

---

## ✅ What You Get

### Standard Faker.js (Built-in)
Use any [faker.js method](https://fakerjs.dev) directly:

```javascript
// Common examples
faker.person.firstName()              // "John"
faker.person.lastName()               // "Smith"
faker.internet.email()                // "john.smith@example.com"
faker.internet.password()             // "aB3$xYzW2k"
faker.phone.number()                  // "+1 (555) 123-4567"
faker.location.address()              // "123 Main St, New York, NY 10001"
faker.company.name()                  // "Acme Corporation"
faker.date.past()                     // Date object from past
faker.datatype.uuid()                 // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
faker.lorem.words(5)                  // "hello world test data string"
```

### PlayQ Custom Modules
Specialized functions for region-specific data:

```javascript
faker.custom.person.fullName()        // Generate full names with options
faker.custom.passport()               // Generate passport numbers
faker.custom.mobile.number()          // Generate mobile numbers
faker.custom.postcode.get()           // Get valid postcodes
faker.custom.nric.generate()          // Singapore/Malaysia NRIC
faker.custom.datetime.generateCurrentDateTime()  // Current datetime formatted
```

---

## 📌 PlayQ Custom Modules - Detailed

### 1. **Person** (Full Names & Birth Dates)

**Generate full name:**
```javascript
// Basic
faker.custom.person.fullName()
// Result: "María García"

// With prefix (Mr., Ms., etc.)
faker.custom.person.fullName({ withPrefix: true })
// Result: "Ms. Jennifer Wong"

// Specific gender
faker.custom.person.fullName({ gender: 'male' })
// Result: "Robert Johnson"

// Limit length (for form fields)
faker.custom.person.fullName({ maxLength: 15 })
// Result: "John Smith"
```

**Generate birth date:**
```javascript
// Default (18-65 years old, DD-MM-YYYY format)
faker.custom.person.birthDate()
// Result: "15-03-1985"

// Specific age range (21-30 years)
faker.custom.person.birthDate({ min: 21, max: 30 })
// Result: "22-07-2003"

// Different format (MM/DD/YYYY)
faker.custom.person.birthDate({ format: 'MM/DD/YYYY' })
// Result: "09/14/1990"

// Specific year
faker.custom.person.birthDate({ year: 2000 })
// Result: "12-31-2000"
```

---

### 2. **Passport**

**Generate passport number:**
```javascript
// Default
faker.custom.passport()
// Result: "A12345678"

// Region-specific
faker.custom.passport({ countryCode: 'US' })
// Result: "C12345678"
```

---

### 3. **Mobile Number**

**Generate phone number:**
```javascript
// Default
faker.custom.mobile.number()
// Result: "+65 9234 5678" (Singapore format)

// Specific country
faker.custom.mobile.number({ countryCode: 'US' })
// Result: "+1 (555) 123-4567"

// With country code prefix
faker.custom.mobile.number({ dialCodePrefix: true })
// Result: "+65 9234 5678"

// Without country code
faker.custom.mobile.number({ dialCodePrefix: false })
// Result: "9234 5678"
```

---

### 4. **Postcode**

**Get valid postcode:**
```javascript
// Default (Singapore)
faker.custom.postcode.get()
// Result: "560001"

// Specific country
faker.custom.postcode.get({ countryCode: 'US' })
// Result: "94105"

// With state code (if applicable)
faker.custom.postcode.get({ countryCode: 'SG', stateCode: 'Central' })
// Result: "010001"
```

---

### 5. **NRIC** (Singapore/Malaysia National ID)

**Generate NRIC:**
```javascript
// Default Singaporean NRIC
faker.custom.nric.generate()
// Result: "S1234567A"

// Foreigner FIN
faker.custom.nric.generate({ prefix: 'F' })
// Result: "F1234567W"

// Specific year of birth
faker.custom.nric.generate({ yearOfBirth: 1995 })
// Result: "S9534567K"

// Available prefixes: 'S', 'T' (Singapore), 'F', 'G' (Foreigner)
```

**Extract year from NRIC:**
```javascript
const nric = "S8512345J";
const year = faker.custom.nric.getYear(nric);
// Result: "1985"
```

---

### 6. **DateTime** (Formatted Dates & Times)

**Generate current datetime:**
```javascript
// Default format (DD/MM/YYYY HH:mm:ss)
faker.custom.datetime.generateCurrentDateTime()
// Result: "14/03/2026 15:30:45"

// Custom format
faker.custom.datetime.generateCurrentDateTime({ format: 'YYYY-MM-DD HH:mm' })
// Result: "2026-03-14 15:30"

// Other formats
faker.custom.datetime.generateCurrentDateTime({ format: 'DD-MM-YY HH.mm.ss' })
// Result: "14-03-26 15.30.45"
```

**Add months to date:**
```javascript
// Add 6 months
faker.custom.datetime.addMonthsToDate('14-03-2026', 6)
// Result: "14-09-2026"

// Add months with format conversions
faker.custom.datetime.addMonthsToDate(
  '2026-03-14',
  3,
  {
    inputFormat: 'YYYY-MM-DD',
    outputFormat: 'DD/MM/YYYY'
  }
)
// Result: "14/06/2026"

// Add months and clamp to last day of month
faker.custom.datetime.addMonthsToDate(
  '31-03-2026',
  1,
  {
    inputFormat: 'DD-MM-YYYY',
    outputFormat: 'DD-MM-YYYY',
    clampToLastDayOfMonth: true
  }
)
// Result: "30-04-2026" (April has 30 days)
```

---

## 🎯 Real-World Examples

### Example 1: User Registration (Step Definition)
```javascript
// tests/steps/registration.steps.js

Given('I open the registration form', async function() {
  await page.goto('https://example.com/register');
});

When('I fill the registration form', async function() {
  const email = faker.internet.email();
  const password = faker.internet.password({ length: 12, memorable: false });
  const dob = faker.custom.person.birthDate({ min: 18, max: 65 });
  
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="dob"]', dob);
});
```

### Example 2: Dynamic Test Data (Programmatic)
```javascript
// scripts/generate-test-users.js

const { faker } = require('@playq/core/dist/helper/faker/customFaker');

function generateTestUser() {
  return {
    name: faker.custom.person.fullName(),
    email: faker.internet.email(),
    phone: faker.custom.mobile.number(),
    dob: faker.custom.person.birthDate(),
    address: faker.location.address(),
    nric: faker.custom.nric.generate(),
    passport: faker.custom.passport()
  };
}

const users = Array(10).fill(null).map(() => generateTestUser());
console.log(users);
```

### Example 3: API Request with Random Data
```javascript
// Using in API tests
const payload = {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email(),
  phone: faker.custom.mobile.number(),
  birthDate: faker.custom.person.birthDate({ format: 'YYYY-MM-DD' }),
  postcode: faker.custom.postcode.get(),
  password: faker.internet.password({ length: 12 })
};

const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

### Example 4: Form with Regional Data
```javascript
// Generate data for specific region
const userSG = {
  name: faker.custom.person.fullName(),
  mobile: faker.custom.mobile.number({ countryCode: 'SG' }),
  postalCode: faker.custom.postcode.get({ countryCode: 'SG' }),
  nric: faker.custom.nric.generate({ prefix: 'S' })
};

const userUS = {
  name: faker.custom.person.fullName(),
  phone: faker.custom.mobile.number({ countryCode: 'US' }),
  zipCode: faker.custom.postcode.get({ countryCode: 'US' }),
  passport: faker.custom.passport({ countryCode: 'US' })
};
```

---

## 📂 Available Date Formats

```javascript
// For person.birthDate() and datetime functions:
'DD-MM-YYYY'  // 14-03-2026
'MM-DD-YYYY'  // 03-14-2026
'YYYY-MM-DD'  // 2026-03-14
'DD/MM/YYYY'  // 14/03/2026
'MM/DD/YYYY'  // 03/14/2026
'YYYY/MM/DD'  // 2026/03/14
'DD-MM-YY'    // 14-03-26
'MM-DD-YY'    // 03-14-26
'YY-MM-DD'    // 26-03-14
'DD/MM/YY'    // 14/03/26
'MM/DD/YY'    // 03/14/26
'YY/MM/DD'    // 26/03/14

// For datetime.generateCurrentDateTime():
'DD/MM/YYYY HH:mm:ss'  // 14/03/2026 15:30:45
'YYYY-MM-DD HH:mm'     // 2026-03-14 15:30
'DD-MM-YY HH.mm.ss'    // 14-03-26 15.30.45
// ... any combination you need
```

---

## 💡 Best Practices

### 1. **Use Meaningful Variable Names**
```javascript
// ✅ GOOD
const validEmail = faker.internet.email();
const registrationDate = faker.custom.person.birthDate();

// ❌ AVOID
const x = faker.internet.email();
const y = faker.custom.person.birthDate();
```

### 2. **Generate Data Close to Where You Use It**
```javascript
// ✅ GOOD - Generate right before use
await page.fill('input[name="email"]', faker.internet.email());

// ⚠️ AVOID - Generate far from usage
const emails = [faker.internet.email(), faker.internet.email()];
// ... 50 lines later ...
await page.fill('input[name="email"]', emails[0]);
```

### 3. **Use Constraints for Valid Data**
```javascript
// ✅ GOOD - Ensures 18-65 age range
faker.custom.person.birthDate({ min: 18, max: 65 })

// ✅ GOOD - Ensures correct country format
faker.custom.mobile.number({ countryCode: 'SG' })

// ❌ AVOID - Random data might not be valid
faker.internet.password({ length: 3 })  // Too short
```

### 4. **Unique Emails in Loops**
```javascript
// ✅ GOOD - New email each iteration
for (let i = 0; i < 5; i++) {
  const email = faker.internet.email();
  // ... use email
}

// ❌ AVOID - Same email each iteration
const email = faker.internet.email();
for (let i = 0; i < 5; i++) {
  // ... reusing same email
}
```

---

## 🔍 Need More Faker Methods?

PlayQ uses **@faker-js/faker** library. For all available methods, see:
- [Faker.js Official Documentation](https://fakerjs.dev)
- [Faker API Reference](https://fakerjs.dev/api)

Access any standard faker method:
```javascript
faker.image.avatar()               // Avatar URL
faker.datatype.boolean()           // Random true/false
faker.database.type()              // Database type
faker.finance.creditCardNumber()   // Credit card
faker.word.verb()                  // Random word
faker.lorem.paragraph()            // Lorem ipsum
```

---

## ✅ That's It!

**3 simple ways to use Faker:**
- **BDD**: `faker.custom.person.fullName()` in step definitions
- **Programmatic**: Import and use in Node.js scripts
- **Playwright**: Use directly in page automation

All custom modules have sensible defaults, but you can customize with options for your specific needs.
