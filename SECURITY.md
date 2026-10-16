# Security reporting

Please report suspected vulnerabilities privately to [contact@bantera.app](mailto:contact@bantera.app), the contact listed on [Bantera Support](https://bantera.app/support). Include the affected repository and version, impact, and a minimal reproduction. Do not include real user data, access tokens, credentials, or production recordings.

Do not publish exploitable details in a public issue before the maintainer has had an opportunity to investigate. Coordinate disclosure and any testing that could affect users with the maintainer. Security reports are reviewed by the repository owner; no response-time or bounty commitment is implied.

## Scope

Development follows `main`; there is no separate long-term-support branch. Fixes should preserve compatibility with published clients wherever possible. A fix reaching `main` is not proof that it has been deployed or released in a mobile store.

Dependency updates are proposed through Dependabot. CI uses read-only repository permissions and does not receive production credentials. Never use production databases or accounts in automated tests.
