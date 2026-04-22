# Privacy Policy Maintenance — Non-Negotiable

`views/PrivacyView.vue` and `views/TermsView.vue` are legal documents and must reflect the live app state.

Any of the following requires updating `PrivacyView.vue` **before** the task is done:

| Change | What to update |
|---|---|
| New third-party SaaS npm package (analytics, payments, email, CDN, monitoring) | Section 6 (Third-Party Providers) with what data it processes |
| Removing/replacing a third-party SaaS | Update or remove its Section 6 entry |
| New/removed `localStorage` or `sessionStorage` key | Section 9 (Cookies and Local Storage) |
| New cookie or auth/session provider change | Section 9 |
| New server-side data (Prisma field, socket payload stored to DB, log field) | Section 2 (What Data We Collect) |
| DB provider change (Render → Neon, Postgres → Firebase) | Section 6 sub-processor; Section 7 (Retention) if location/policy differs |
| Auth provider change (Clerk replaced) | Section 6 (Clerk entry); Section 9 (session cookies) |
| New AI/ML service receiving user data | Section 4 (Use of Data); Section 6 |
| Retention period or deletion behaviour change | Section 7 |

Contact email in `PrivacyView.vue` is **preis.tomer@gmail.com** — never change.
