# Request: Entra ID sign-in for the Business Vocabulary application

**To:** Entra ID / Microsoft 365 administrator
**Purpose:** Let employees sign in with their company account to the internal Business Vocabulary web application. The app holds insurance business terms and KPI definitions and runs as a proof of concept on Vercel. Roles in the app (admin, data owner, data steward, contributor) are controlled through security group membership.

The app uses standard OpenID Connect sign-in (Auth.js). It reads only the signed-in user's basic profile and group IDs. It does not access mail, files or any other data.

## 1. Two app registrations

Please create two single-tenant app registrations (**Entra ID → App registrations → New registration**):

| | TEST | PROD |
|---|---|---|
| Name | Business Vocabulary (TEST) | Business Vocabulary (PROD) |
| Supported account types | Accounts in this organizational directory only | same |
| Redirect URI (platform **Web**) | `https://<TEST URL>/api/auth/callback/microsoft-entra-id` and `http://localhost:3000/api/auth/callback/microsoft-entra-id` | `https://<PROD URL>/api/auth/callback/microsoft-entra-id` |

*(The requester fills in the TEST and PROD URLs before sending.)*

For **each** registration:

1. **Certificates & secrets → New client secret.** Use 12 months validity and note the expiry date.
2. **Token configuration → Add groups claim.** Choose *Security groups*, or *Groups assigned to the application* if Entra ID P1 is available. Under ID token, choose **Group ID**.
3. **API permissions:** keep Microsoft Graph → delegated **User.Read** (present by default). If user consent is disabled in the tenant, click **Grant admin consent**.
4. **Enterprise applications → (the app) → Properties:** set **Assignment required = Yes**.
5. **Enterprise applications → (the app) → Users and groups:** assign the security groups below. For TEST, the testers' group or named testers is enough.

## 2. Security groups

Please create these security groups (names are suggestions), and add members as the business tells you:

| Group | Purpose |
|---|---|
| `SG-Vocab-Admins` | Glossary administrators |
| `SG-Vocab-Contributors` | May propose new terms and changes |
| `SG-Vocab-<Domain>-Owners` | Data owners of a business domain (e.g. Claims, Finance, Premium) |
| `SG-Vocab-<Domain>-Stewards` | Data stewards of a business domain |
| `SG-Vocab-Testers` (TEST only) | Anyone who should access the test environment |

Only the domains being piloted need owner and steward groups now; more can be added later.

## 3. Please send back

| Value | TEST | PROD |
|---|---|---|
| Directory (tenant) ID | | |
| Application (client) ID | | |
| Client secret value | via a secure channel, not email | via a secure channel, not email |
| Client secret expiry date | | |
| Object ID of each security group | | |

These values go into the application's hosting configuration (Vercel environment variables) and are not stored in source code.
