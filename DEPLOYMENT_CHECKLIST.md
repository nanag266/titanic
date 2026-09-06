# Titanic City Ventures launch checklist

- [ ] Add official GHS menu prices in `/admin`.
- [ ] Confirm all variant prices (medium/large, grilled/fried/stew choices).
- [ ] Add restaurant phone, WhatsApp and physical address.
- [ ] Add exact restaurant latitude and longitude.
- [ ] Set delivery base fee, per-km rate, minimum fee and max route distance.
- [ ] Confirm Accra delivery boundaries.
- [ ] Add Google Maps browser/server keys in Render.
- [ ] Add Paystack **test** secret key in Render.
- [ ] Configure Paystack webhook `/api/paystack/webhook`.
- [ ] Test customer location search and out-of-area rejection.
- [ ] Test cart totals and delivery totals.
- [ ] Complete a Paystack test payment and confirm order changes to PAID.
- [ ] Test Admin status flow through DELIVERED.
- [ ] Confirm the PocketBase server has production backups and persistent storage.
- [ ] Restrict API keys to required domains/APIs.
- [ ] Switch Paystack to live key only after all test checks pass.

- [ ] Confirm Google Maps APIs are enabled for Places + Routes; the delivery origin is preconfigured to Titanic City Ventures at Titanic Beach.
- [ ] Review the starting Bolt-style delivery coefficients in Admin > Settings against live operational costs before accepting paid orders.
- [ ] Keep Demand / weather multiplier at 1.00x normally; raise it only when operations intentionally apply surge pricing.
