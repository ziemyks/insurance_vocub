# Starter content: points to confirm

The 212 starter concepts in [content/seed](../content/seed) were drafted to bootstrap the glossary and load as **Candidates**. Before the data owners certify them in the app, the stewards should confirm the points below: modelling conventions first, because they change numbers, then terminology.

## Modelling conventions (Finance / Actuarial / Controlling)

| # | Concept(s) | Convention in the draft | Confirm with |
|---|---|---|---|
| 1 | `gross-written-premium`, `net-*`, `gross-earned-premium` | Accounting basis MANAGEMENT; notes require reconciliation to the statutory (Latvijas Banka) and PZU Group figures | Finance |
| 2 | `gross-claims-incurred` | Paid − recoveries received + change in outstanding (case + IBNR). Calendar year by default. ALAE included, **ULAE excluded** (management view; notes say statutory/IFRS 17 include ULAE) | Actuarial, Finance |
| 3 | `expense-ratio`, `acquisition-cost-ratio` | Denominator = **net** earned premium; claims-handling costs excluded (they sit in claims incurred) | Controlling |
| 4 | Reinsurance commissions | Not deducted from acquisition expenses, so the net expense ratio is slightly conservative. If Controlling nets them, add a separate metric | Controlling, Reinsurance |
| 5 | `ifrs17-combined-ratio` | (Insurance service expense − net result of reinsurance held) / gross insurance revenue | Finance (check against the PZU Group convention) |
| 6 | `insurance-service-result` | Defined **gross**; the after-reinsurance version should be named "net" | Finance |
| 7 | `reinsurance-result` vs `reinsurance-held-result` | Sign conventions differ (management vs IFRS 17); align them | Reinsurance, Finance |
| 8 | `claim-frequency`, `average-claim-severity`, `burning-cost`, `pure-premium` | Accident year; catastrophe losses excluded; nil claims included | Actuarial / Pricing |
| 9 | `retention-rate` | Counted by expiry date; insurer-declined renewals stay in the denominator; single-trip travel and mid-term cancellations excluded | Sales |
| 10 | `lapse-rate` | Lapse = termination for non-payment only; non-renewal is measured by retention | Sales, Underwriting |
| 11 | `fraud-detection-rate` | Confirmed fraud only (not suspicions) / settled claims | Claims |
| 12 | `investment-income` | IFRS 9 basis incl. FVTPL changes, excl. OCI and insurance finance expenses | Investments |
| 13 | `customer-lifetime-value` | Gross, earned, at reporting date; built from average premium, loss ratio, expense ratio and retention | Sales, Finance |
| 14 | Large-loss threshold (EUR 100,000) and the 72-hour storm clause in examples | Illustrations only, **not** company policy | Actuarial, Reinsurance |

## Latvian terminology

| English | Draft LV term | Question |
|---|---|---|
| Line of business | Apdrošināšanas veids | May clash with the statutory "apdrošināšanas veidi" classes |
| New business | Jaunais bizness | A calque; check internal usage |
| Lapse / lapse rate | Polises spēka zaudēšana / … līmenis | |
| Retention rate | Noturēšanas līmenis | or "Atjaunošanas līmenis" |
| Loss event | Zaudējumu notikums | vs "apdrošināšanas gadījums" (the covered event) |
| Case reserve / RBNS | Pieteikto zaudējumu rezerve / Pieteiktie, bet neizmaksātie zaudējumi | |
| IBNER | Radušies, bet nepietiekami novērtētie zaudējumi | |
| Claims incurred | Radušies zaudējumi | alt "Piekritušās atlīdzības" (annual-report wording?) |
| Salvage | Atlieku realizācija | |
| Reinsurance treaty | Obligātās pārapdrošināšanas līgums | market may say "obligatorā" |
| Pure premium | Riska prēmija | avoids "neto prēmija" (clashes with net of reinsurance) |
| Ratios | "… rādītājs" (alt "koeficients") | One convention is used throughout; confirm house style |
| PAA, onerous contract, loss component | Prēmiju sadalījuma pieeja, apgrūtinošs līgums, zaudējumu komponents | Check against the official LV text of IFRS 17 |
| Underwriting result | Apdrošināšanas tehniskais rezultāts | |
| Risk margin (SII) | Riska rezerve | alt "riska norma" |
| Own funds (SII) | Pašu līdzekļi | Some texts say "pašu kapitāls", which clashes with equity |
| SCR abbreviation | (none given) | Is "MKP" in use? |
| UPR abbreviation | (none given) | Is an LV abbreviation in use? |

## Facts to verify

- **AML/KYC scope.** The draft says the Latvian AML law applies mainly to life and investment-linked insurance; sanctions rules apply in full. *Compliance to confirm.*
- **IDD transposition law.** The draft names it "Apdrošināšanas un pārapdrošināšanas izplatīšanas likums".
- **LTAB role.** Described as the Green Card bureau, compensation body, operator of the OCTA information system and manager of the guarantee fund.
- **CSRD.** Scope and timelines changed by the 2025 Omnibus package; no dates are given.
- **Citations.** IFRS 17 and Solvency II paragraph and article numbers are cited on several concepts and should be checked once by Finance and Risk.
