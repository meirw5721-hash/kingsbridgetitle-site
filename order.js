(function () {
  "use strict";
  /* Orders inbox: the one line to change if the domain moves (kingsbridgetitle.com or kbridgetitle.com). */
  var ORDER_EMAIL = "orders@kbridgetitle.com";
  var TO = ORDER_EMAIL;
  function $(id) { return document.getElementById(id); }
  function num(v) { var n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; }
  function money(n) { return n ? "$" + Math.round(n).toLocaleString("en-US") : ""; }
  function params() {
    var out = {}, q = window.location.search.replace(/^\?/, "");
    if (!q) return out;
    q.split("&").forEach(function (kv) {
      var i = kv.indexOf("="), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? "" : kv.slice(i + 1);
      try { out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " ")); } catch (x) {}
    });
    return out;
  }

  /* show the orders inbox wherever a page marks it */
  Array.prototype.forEach.call(document.querySelectorAll("[data-order-email]"), function (el) {
    el.href = "mailto:" + ORDER_EMAIL + (el.getAttribute("data-order-email") || "");
  });
  Array.prototype.forEach.call(document.querySelectorAll(".order-email"), function (el) { el.textContent = ORDER_EMAIL; });

  /* home: hero quick start goes to the order page with the address */
  var quick = $("quickOrder");
  if (quick) quick.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("quickAddress").value.trim();
    window.location.href = "order.html" + (v ? "?address=" + encodeURIComponent(v) : "");
  });

  /* calculator: carry price, loan and transaction type to the order page */
  var fromCalc = $("orderFromCalc");
  if (fromCalc) fromCalc.addEventListener("click", function (e) {
    e.preventDefault();
    var refi = $("tcType").value === "refinance";
    var q = ["from=calculator", "type=" + (refi ? "Refinance" : "Purchase")];
    var p = num($("tcPrice").value), l = num($("tcLoan").value);
    if (!refi && p) q.push("price=" + Math.round(p));
    if (l) q.push("loan=" + Math.round(l));
    window.location.href = "order.html?" + q.join("&");
  });

  /* footer newsletter signup. While the form's action is a mailto (NEWSLETTER_ACTION empty in build.py), this opens
     an email to the orders inbox with subject "Newsletter signup". Once build.py's NEWSLETTER_ACTION holds a Mailchimp
     form URL, the form posts there natively and this handler steps aside. */
  var news = $("newsForm");
  if (news) news.addEventListener("submit", function (e) {
    if ((news.getAttribute("action") || "").indexOf("mailto:") !== 0) return;
    e.preventDefault();
    var em = $("newsEmail").value.trim(), msg = $("newsMsg");
    msg.hidden = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      $("newsEmail").setAttribute("aria-invalid", "true");
      msg.textContent = "Please enter a valid email address."; $("newsEmail").focus(); return;
    }
    $("newsEmail").setAttribute("aria-invalid", "false");
    var href = "mailto:" + ORDER_EMAIL + "?subject=" + encodeURIComponent("Newsletter signup") +
      "&body=" + encodeURIComponent("Please add me to the Kingsbridge weekly.\n\nEmail: " + em + "\nSigned up from: " + window.location.href);
    window.__lastNewsMailto = href;
    msg.textContent = "Thanks! Your email app is opening with the signup ready. Hit send to finish.";
    window.location.href = href;
  });

  var form = $("orderForm");
  if (!form) return;

  function syncType() { $("oPriceWrap").hidden = $("oType").value === "Refinance"; }
  $("oType").addEventListener("change", syncType);

  /* order page: prefill from the hero or the calculator */
  var qp = params();
  if (qp.address) $("oAddress").value = qp.address.slice(0, 200);
  if (qp.type === "Refinance" || qp.type === "Purchase") $("oType").value = qp.type;
  if (qp.price && num(qp.price)) $("oPrice").value = money(num(qp.price));
  if (qp.loan && num(qp.loan)) $("oLoan").value = money(num(qp.loan));
  if (qp.from === "calculator") $("prefillNote").hidden = false;
  if (qp.address || qp.from) {
    var first = qp.address || qp.from ? "oName" : null;
    if (first && window.matchMedia && window.matchMedia("(min-width: 900px)").matches) $(first).focus({ preventScroll: true });
  }

  $("oContract").addEventListener("change", function () { $("attachNote").hidden = !this.checked; });

  function val(id) { return $(id).value.trim(); }
  function role() { var r = form.querySelector('input[name="role"]:checked'); return r ? r.value : ""; }
  function fmtDate(s) {
    if (!s) return "";
    var p = s.split("-"); if (p.length !== 3) return s;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }
  function details() {
    var refi = $("oType").value === "Refinance";
    var lines = [
      "New title order from kingsbridgetitle.sites.tab.bot",
      "",
      "Name: " + val("oName"),
      "Phone: " + val("oPhone"),
      "Email: " + (val("oEmail") || "-"),
      "Role: " + role(),
      "",
      "Property address: " + val("oAddress"),
      "Transaction: " + $("oType").value
    ];
    if (!refi) lines.push("Purchase price: " + (money(num(val("oPrice"))) || "-"));
    lines.push("Loan amount: " + (money(num(val("oLoan"))) || "-"));
    lines.push("Closing date: " + (fmtDate(val("oClosing")) || "-"));
    lines.push("Contract ready: " + ($("oContract").checked ? "Yes, attaching it to this email" : "Not yet"));
    lines.push("", "Notes: " + (val("oNotes") || "-"));
    return lines.join("\n");
  }
  function mailto() {
    var subj = "Title order: " + val("oAddress") + " (" + role() + ")";
    return "mailto:" + TO + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(details());
  }

  function invalid(id, on) { $(id).setAttribute("aria-invalid", on ? "true" : "false"); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var miss = [];
    [["oName", "your name"], ["oPhone", "a phone number"], ["oAddress", "the property address"]].forEach(function (f) {
      var bad = !val(f[0]); invalid(f[0], bad); if (bad) miss.push(f);
    });
    var err = $("orderError");
    if (miss.length) {
      err.textContent = "Please add " + miss.map(function (m) { return m[1]; }).join(", ") + ".";
      err.hidden = false; $(miss[0][0]).focus(); return;
    }
    err.hidden = true;
    var href = mailto();
    $("orderMailAgain").href = href;
    $("orderSent").hidden = false;
    window.__lastOrderMailto = href;
    window.location.href = href;
    setTimeout(function () { $("orderSent").focus({ preventScroll: false }); }, 300);
  });
  ["oName", "oPhone", "oAddress"].forEach(function (id) { $(id).addEventListener("input", function () { if (val(id)) invalid(id, false); }); });

  $("orderCopy").addEventListener("click", function () {
    var text = "To: " + TO + "\n" + details();
    var done = function () { $("orderCopied").textContent = "Copied. Paste it into an email or text to Kingsbridge."; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (x) {} document.body.removeChild(t); }
  });

  syncType();
})();
