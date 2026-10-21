# Commission Portal Video Walkthrough

## Purpose

A screen-recording guide for introducing the partner commission program and showing viewers where to find its terms, referral results, and payout information.

**Suggested length:** 4–6 minutes  
**Audience:** Existing or prospective affiliate/agent partners  
**Portal starting point:** Sign in with an agent account and open the Agent Portal.

## Reusable local demo account

The repository includes an optional local-only partner portal demo. It runs sample data in this browser; it does not create an account or send signup, login, payout, or claim information to the live service. Demo mode uses Vite’s separate `demo` mode so production builds do not include the mock API.

1. From the repository root, run `npm run demo`.
2. Open `http://localhost:5173/#/affiliate-register`.
3. Create the local sample profile using `demo@marthington.com`. The demo does not store or check a password; any password entered is discarded. Do not enter real banking details.
4. The browser stores the sample account and figures locally so you can sign out, return, and sign back in. Do not use this as a real affiliate account.
5. Stop the local site with `Ctrl+C`. Next time, run `npm run demo` and sign in at `http://localhost:5173/#/login`.

The portal is a mock: sample referrals, earnings, commission claims, and payout history are illustrative only. Real commission, customer, referral, claim, and payout APIs are disabled in this mode. To return to the production frontend behavior, run the normal `npm run dev` or `npm run build-client` command instead of `npm run demo`.

## Before recording

- Use a demo account and sample data that are approved for recording.
- Check the current commission rate and published bonus/CPA/milestone terms on the Commission page. These are configurable; do not quote a rate or amount from an old recording.
- Prefer a demo account with at least one attributed business and a conversion, if available. If the account has no activity, explain that the screen is empty rather than implying a missing feature.
- Hide personal information, bank details, email addresses, and any browser notifications you do not want in the video.
- In the real portal, do not submit a payout request or commission claim while recording; those actions create real requests for review. In the explicitly labelled local demo, the controls only modify sample data in this browser.

## Run of show

| Time | Screen / navigation | What to show | Narration |
|---|---|---|---|
| 0:00–0:25 | Start on the Agent Portal | Show the portal name and sidebar. | “In this video, I’ll show how the partner commission program works and where to check your current terms, referred-business activity, and payout status.” |
| 0:25–1:15 | **Dashboard** (`/partners/dashboard`) | Point to the current rate and the available balance, confirmed earnings, pending payouts, referrals, clicks, and conversion rate. Show the referral link without exposing any private account data. | “The dashboard is the overview. It brings together your current rate, referral activity, earnings, and payout figures. Your referral link is how new businesses are attributed to your account. The figures here depend on this account’s activity.” |
| 1:15–2:40 | Sidebar → **Commission Tiers & Structure** (`/partners/commission`) | Pause on **Subscription commission** and read the current percentage shown on screen. Scroll to **Flat CPA fees**, **Direct referral bonus**, **Submit a CPA claim** (if active), **Supplemental commission claims**, and **Payout milestones**. | “This is the source of truth for the commission terms currently published to this account. The subscription percentage applies to qualifying subscription payments. Each credited earning keeps the rate used at the time, so older earnings may show a different applied rate. If enabled, the page also lists flat-fee CPA actions, a direct-referral bonus, and payout milestones. CPA and other supplemental claims require evidence where applicable and administrator review before they are credited.” |
| 2:40–3:40 | Sidebar → **Live Conversions** (`/partners/conversions`) | Show the business list and the conversion filter. Point to plan, registered/converted status, commission amount, and join date. Avoid exposing owners’ personal details. | “Live Conversions is where you follow businesses attributed to your link. You can filter converted and not-yet-converted referrals and check the plan, status, and commission outcome recorded for each business. A registration by itself is not the same as a qualifying paid subscription commission.” |
| 3:40–4:35 | Sidebar → **Withdrawals & Payouts** (`/partners/withdrawals`) | Point out available balance, pending requests, paid-out total, pending requests, and settlement history. Do not submit a request. | “When you are ready to request a payout, this page shows your available balance and previous payout activity. Requests are paid to the bank account saved in your profile and their status can be followed here. I’m not submitting a request in this walkthrough.” |
| 4:35–5:00 | Return to **Dashboard** | Recap the route in the sidebar. | “To recap: start at Dashboard, check the exact current rules under Commission Tiers & Structure, review attributed activity in Live Conversions, and follow payout requests in Withdrawals & Payouts.” |

## Navigation map

```text
Agent Portal
├── Dashboard                         /partners/dashboard
├── Agent activity
│   ├── Live Conversions              /partners/conversions
│   ├── Withdrawals & Payouts         /partners/withdrawals
│   └── Link History                  /partners/link-history
├── Resources
│   ├── Guides & Tutorials            /partners/guides
│   └── Commission Tiers & Structure  /partners/commission
└── Account
    └── Profile & Settings            /partners/profile
```

The older `/partners/referrals` path redirects to **Live Conversions**.

## Accuracy notes for the presenter

- Refer to the percentage and monetary amounts visible during recording; do not assume they are permanent or the same for every recording.
- Describe percentage commission as applying to qualifying subscription payments, not simply every registration or click.
- A published direct-referral bonus is shown as available once per referred business after its first paid subscription, subject to administrator approval.
- Supplemental CPA and milestone rewards are not automatic cash payouts: claims/rewards remain subject to administrator approval before they are added to the available balance.
- Local demo figures and sample customer records are fictional illustrations; never describe them as real partner results or current published terms.
- The portal displays amounts in Nigerian naira (NGN).
- If a section says no bonus, CPA action, milestone, referral, or payout history is configured yet, say so plainly and continue. Do not imply that an empty section is populated.
- The `Live Conversions` page presents commission amounts and conversion details. Do not promise a separate applied-rate column unless it is visible in the version being recorded.

## Optional extra shot

If the video needs to explain attribution activity, open **Link History** after the Dashboard and briefly show the available click/referral history. Keep the main sequence above intact so viewers still see the actual terms, conversion outcomes, and payout status.
