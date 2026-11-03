/* Kingsbridge Title Agency: New Jersey closing-cost estimator.
   Every number lives in RATES. Each one names its source:
   "manual" = New Jersey Land Title Insurance Rating Bureau, Manual of Rates and Charges, effective November 1, 2023 (section given);
   "nj-tax" = NJ Division of Taxation, Realty Transfer Fee schedule (nj.gov/treasury/taxation/realty.shtml);
   Pass-through costs (county searches, recording fees, notice of settlement, wires, delivery) are NOT set by either
   source, so they are not estimated here: the page lists them as "not included" and they come with the title commitment.
   Verified Nov 3, 2026 against: NJLTIRB manual eff. 11/1/2023 (still the filed manual) and
   https://www.nj.gov/treasury/taxation/realty.shtml (last updated 09/28/26). */
(function (root) {
  "use strict";
  var RATES = {
    manual: { name: "New Jersey Land Title Insurance Rating Bureau, Manual of Rates and Charges", effective: "November 1, 2023" },
    minimum: 200,                                                          // manual §4.1
    standard: [[100000, 5.25], [500000, 4.25], [2000000, 2.75], [Infinity, 2.00]],  // manual §4.2, per $1,000 or fraction
    refinance: [[100000, 2.75], [500000, 2.50], [2000000, 2.25], [Infinity, 1.75]], // manual §4.6.1
    simultaneous: 25,              // manual §3.4
    examination: 100,              // manual §5.1
    settlement: 300,               // manual §6.1 (settlement with disbursements, up to 60 min, at our office)
    cpl: 75,                       // manual §6.6 closing service (protection) letter
    satisfaction: 75,              // manual §7.1(b) each mortgage satisfied
    download: 50,                  // manual §7.2.2 ($25 + $25, max $50)
    survey: 25,                    // manual §10.5 NJ survey endorsement
    alta81: 25,                    // manual §10.6 ALTA 8.1 (residential)
    alta82: 100,                   // manual §10.98 ALTA 8.2-06 (commercial)
    alta9res: 25,                  // manual §10.10 ALTA 9.10-06, 1-4 family
    alta9comPct: 0.10, alta9comMin: 100, // manual §10.10, otherwise 10% of loan underwriting charge, min $100
    // NJ Realty Transfer Fee (seller), per $500 of consideration; nj-tax
    rtf: {
      none:    { upTo350: [[150000, 2.00], [200000, 3.35], [Infinity, 3.90]],
                 over350: [[150000, 2.90], [200000, 4.25], [550000, 4.80], [850000, 5.30], [1000000, 5.80], [Infinity, 6.05]] },
      partial: { upTo350: [[150000, 0.50], [Infinity, 1.25]],
                 over350: [[150000, 1.40], [550000, 2.15], [850000, 2.65], [1000000, 3.15], [Infinity, 3.40]] }
    },
    // NJ Graduated Percent Fee (seller), transfers over $1,000,000; rate applies to total consideration; nj-tax
    gpf: [[1000000, 0], [2000000, 0.01], [2500000, 0.02], [3000000, 0.025], [3500000, 0.03], [Infinity, 0.035]]
  };

  function bracketSum(amount, brackets, unit) {
    if (!(amount > 0)) return 0;
    var units = Math.ceil(amount / unit), total = 0, prev = 0;
    for (var i = 0; i < brackets.length; i++) {
      var cap = brackets[i][0] === Infinity ? Infinity : brackets[i][0] / unit;
      var n = Math.min(units, cap) - prev;
      if (n <= 0) break;
      total += n * brackets[i][1]; prev += n;
    }
    return Math.round(total * 100) / 100;
  }
  function std(a) { return bracketSum(a, RATES.standard, 1000); }
  function refi(a) { return bracketSum(a, RATES.refinance, 1000); }
  function dollars(x) { return Math.round(x); }   // premiums shown to the whole dollar
  function money0(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  function transferFee(amount, exemption) {
    amount = +amount || 0;
    var t = RATES.rtf[exemption === "partial" ? "partial" : "none"];
    var rtf = amount <= 350000 ? bracketSum(amount, t.upTo350, 500) : bracketSum(amount, t.over350, 500);
    return rtf;
  }
  function graduatedFee(amount) {
    amount = +amount || 0;
    if (amount <= 1000000) return 0;
    for (var i = 0; i < RATES.gpf.length; i++) if (amount <= RATES.gpf[i][0]) return Math.round(amount * RATES.gpf[i][1] * 100) / 100;
    return 0;
  }

  /* o: { type: "purchase"|"refinance", property: "residential"|"commercial", price, loan, existing, agent:boolean, gpf:boolean } */
  function estimate(o) {
    var type = o.type === "refinance" ? "refinance" : "purchase";
    var com = o.property === "commercial";
    var price = type === "purchase" ? Math.max(0, +o.price || 0) : 0;
    var loan = Math.max(0, +o.loan || 0);
    var existing = Math.max(0, +o.existing || 0);
    var agent = !!o.agent;
    var buyer = [], seller = [], notes = [];
    function add(list, label, amount, src) { list.push({ label: label, amount: Math.round(amount * 100) / 100, src: src }); }

    var policyCharge = 0;
    if (type === "purchase") {
      var hi = Math.max(price, loan);
      var prem = dollars(Math.max(RATES.minimum, std(hi)));
      policyCharge = std(hi);
      if (loan > price) {
        if (price > 0) add(buyer, "Owner's policy premium", RATES.simultaneous, "manual");
        add(buyer, "Loan policy premium", prem, "manual");
      } else {
        add(buyer, "Owner's policy premium", prem, "manual");
        if (loan > 0) add(buyer, "Loan policy premium", RATES.simultaneous, "manual");
      }
    } else {
      var face = existing > 0 ? Math.min(existing, loan) : 0;
      var lp = refi(face) + (loan > face ? std(loan) - std(face) : 0);
      policyCharge = lp;
      add(buyer, "Loan policy premium", dollars(Math.max(RATES.minimum, lp)), "manual");
    }

    var hasLoan = loan > 0;
    if (hasLoan) {
      if (com) add(buyer, "ALTA 8.2-06 endorsement (commercial environmental)", RATES.alta82, "manual");
      else add(buyer, "ALTA 8.1 endorsement (environmental)", RATES.alta81, "manual");
      if (com) add(buyer, "ALTA 9.10-06 endorsement", Math.max(RATES.alta9comMin, Math.round(RATES.alta9comPct * policyCharge * 100) / 100), "manual");
      else add(buyer, "ALTA 9.10-06 endorsement", RATES.alta9res, "manual");
      add(buyer, "Closing service letter", RATES.cpl, "manual");
    }
    add(buyer, "Title examination charge", RATES.examination, "manual");
    if (agent) {
      add(buyer, "Settlement fee**", RATES.settlement, "manual");
      add(buyer, "Download closing package", RATES.download, "manual");
      if (type === "refinance" && existing > 0) add(buyer, "Mortgage satisfaction", RATES.satisfaction, "manual");
    }
    add(buyer, "Survey endorsement", RATES.survey, "manual");

    if (type === "purchase" && price > 0) {
      var ex = o.exemption === "partial" ? "partial" : "none";
      add(seller, "NJ realty transfer fee" + (ex === "partial" ? " (partial exemption)" : ""), transferFee(price, ex), "nj-tax");
      if (o.gpf !== false && price > 1000000) add(seller, "NJ graduated percent fee (over $1M)", graduatedFee(price), "nj-tax");
    }

    notes.push("Not included: searches (county, tax, tideland, court), county recording fees, notice of settlement, wires and delivery. These are pass-through costs not set by the rate manual; they come with your title commitment.");
    if (agent) notes.push("**Covers a settlement of up to 60 minutes at our office. Under the rate manual, a closing outside our office adds $25, outside business hours adds $50, and each extra hour adds $100.");
    if (seller.length) notes.push("The NJ realty transfer fee and the graduated percent fee (over $1M) are paid by the seller under NJ law. " + (o.exemption === "partial" ? "Partial exemption applied (senior citizen, blind or disabled seller, or low/moderate income housing; claimed on Form RTF-1)." : "Assumes no exemption. Exemptions can lower them."));
    if (type === "purchase" && !com) notes.push("Premiums use the standard rate. An enhanced-coverage (homeowner's) policy costs 120% of the standard rate under the manual, section 4.8.");

    function sum(l) { return Math.round(l.reduce(function (s, x) { return s + x.amount; }, 0) * 100) / 100; }
    return { type: type, buyer: buyer, seller: seller, buyerTotal: sum(buyer), sellerTotal: sum(seller), notes: notes };
  }

  function mortgage(amount, ratePct, years, startYear) {
    amount = +amount || 0; var n = Math.round((+years || 0) * 12), r = (+ratePct || 0) / 1200;
    if (!(amount > 0) || !(n > 0)) return { payment: 0, interest: 0, years: [] };
    var pay = r === 0 ? amount / n : amount * r / (1 - Math.pow(1 + r, -n));
    var bal = amount, rows = [], yi = 0, yp = 0, totalI = 0;
    for (var k = 1; k <= n; k++) {
      var i = bal * r, p = pay - i; bal = Math.max(0, bal - p); yi += i; yp += p; totalI += i;
      if (k % 12 === 0 || k === n) { rows.push({ year: (+startYear || 1) + Math.ceil(k / 12) - 1, interest: yi, principal: yp, balance: bal }); yi = 0; yp = 0; }
    }
    return { payment: Math.round(pay * 100) / 100, interest: Math.round(totalI * 100) / 100, years: rows };
  }

  var api = { RATES: RATES, bracketSum: bracketSum, std: std, refi: refi, transferFee: transferFee, graduatedFee: graduatedFee, estimate: estimate, mortgage: mortgage };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KBCalc = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
