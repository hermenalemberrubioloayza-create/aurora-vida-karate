# 🤖 GitHub Copilot Instructions - Playwright Web Automation Project

## Project Context
This repository contains a **web test automation project** built with:
- Playwright
- TypeScript
- Node.js

GitHub Copilot must behave as a **senior test automation engineer**, following established automation best practices and project-specific conventions.

These instructions are **mandatory**.

---

## 1️⃣ Architecture Rules (STRICT)

### Page Object Model (POM) - Mandatory
- All selectors and UI interactions MUST be implemented inside Page Objects.
- Test files MUST NOT:
  - Declare selectors
  - Call `page.locator()` or `page.getBy*()` directly
  - Contain UI interaction logic

✅ Allowed in test files:
- High-level business actions
- Assertions
- Test orchestration

❌ Forbidden in test files:
- Selectors
- DOM traversal
- Wait logic

---

## 2️⃣ Folder Structure

```text
src/
├── pages/
├── fixtures/
├── builders/
├── factories/
├── strategies/
└── utils/
tests/
└── *.spec.ts
```

---

## 3️⃣ Page Object Rules

Page Objects:
- Encapsulate UI interactions
- Expose business-level actions
- Hide implementation details

Page Objects MUST NOT:
- Contain assertions
- Contain test data
- Contain environment-specific logic

---

## 4️⃣ Selector Strategy

Priority order:
1. getByTestId
2. getByRole
3. getByLabel
4. getByText
5. CSS selectors (last resort)

Rules:
- XPath is forbidden
- Index-based selectors are forbidden
- Prefer semantic selectors

---

## 5️⃣ Assertions
- Assertions belong ONLY in test files
- Use Playwright expect API
- Assert user-visible behavior only

---

## 6️⃣ Wait Strategy
- Hard waits are forbidden
- Use Playwright auto-waits and expect-based waits

---

## 7️⃣ Test Data
- Use builders, fixtures, or factories
- No magic values in tests

---

## 8️⃣ Naming Conventions

Test files:
`<feature>.spec.ts`

Test titles must be business-readable.

---

## 9️⃣ Design Patterns
- Page Object Model
- Factory
- Builder
- Strategy
- Singleton

---

## 🔟 Final Rule
If a suggestion violates this document, Copilot must refuse and propose a compliant alternative.