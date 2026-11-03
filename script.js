(function () {
  "use strict";
  var C = window.KBCalc;
  function $(id) { return document.getElementById(id); }
  function num(v) { var n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; }
  function money(n, cents) {
    var hasCents = cents || Math.round(n * 100) % 100 !== 0;
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: hasCents ? 2 : 0 });
  }
  function fmtInput(el) { var n = num(el.value); el.value = n ? "$" + Math.round(n).toLocaleString("en-US") : ""; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  Array.prototype.forEach.call(document.querySelectorAll("input.money"), function (el) {
    el.addEventListener("blur", function () { fmtInput(el); });
    el.addEventListener("focus", function () { if (!num(el.value)) el.value = ""; });
  });

  /* tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { var n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); e.preventDefault(); }
    });
  });

  /* title fees */
  function rows(list) {
    return list.map(function (x) {
      var tag = x.src === "placeholder" ? '<span class="tag tag-est" title="Typical third-party cost">est.</span>' : "";
      return "<tr><th scope=\"row\">" + esc(x.label) + tag + "</th><td>" + money(x.amount) + "</td></tr>";
    }).join("");
  }
  function runTitle() {
    var type = $("tcType").value;
    $("wrapPrice").hidden = type === "refinance";
    $("wrapExisting").hidden = type !== "refinance";
    if ($("wrapExempt")) $("wrapExempt").hidden = type === "refinance";
    $("lblLoan").textContent = type === "refinance" ? "New loan amount" : "Mortgage amount";
    var e = C.estimate({ type: type, property: $("tcProperty").value, price: num($("tcPrice").value), loan: num($("tcLoan").value), existing: num($("tcExisting").value), agent: $("tcAgent").checked, exemption: $("tcExempt") ? $("tcExempt").value : "none" });
    $("buyerTotal").textContent = money(e.buyerTotal);
    $("buyerTotal2").textContent = money(e.buyerTotal);
    $("buyerTable").innerHTML = rows(e.buyer);
    $("sellerWrap").hidden = !e.seller.length;
    $("sellerTable").innerHTML = rows(e.seller);
    $("sellerTotal").textContent = money(e.sellerTotal);
    $("notes").innerHTML = e.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
    var bits = [$("tcProperty").selectedOptions[0].text, type === "refinance" ? "refinance" : "purchase"];
    if (type === "purchase") bits.push(money(num($("tcPrice").value)) + " price");
    bits.push(num($("tcLoan").value) ? money(num($("tcLoan").value)) + " loan" : "no loan");
    $("resSummary").textContent = bits.join(" · ");
  }
  $("titleForm").addEventListener("submit", function (ev) {
    ev.preventDefault(); Array.prototype.forEach.call(this.querySelectorAll("input.money"), fmtInput); runTitle();
    if (window.matchMedia("(max-width: 899px)").matches) $("titleResults").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("titleForm").addEventListener("input", runTitle);
  $("titleForm").addEventListener("change", runTitle);

  /* transfer tax */
  function runTT() {
    var a = num($("ttAmount").value), ex = $("ttExempt").value;
    var rtf = C.transferFee(a, ex), gp = $("ttGpf").checked ? C.graduatedFee(a) : 0;
    $("ttRtf").textContent = money(rtf); $("ttGp").textContent = money(gp);
    $("ttTotal").textContent = money(rtf + gp); $("ttTotal2").textContent = money(rtf + gp);
  }
  $("ttForm").addEventListener("submit", function (ev) { ev.preventDefault(); fmtInput($("ttAmount")); runTT(); });
  $("ttForm").addEventListener("input", runTT); $("ttForm").addEventListener("change", runTT);

  /* mortgage */
  function runMG() {
    var m = C.mortgage(num($("mgAmount").value), parseFloat($("mgRate").value) || 0, +$("mgYears").value, parseInt($("mgYear").value, 10) || new Date().getFullYear());
    $("mgPay").textContent = money(m.payment, true); $("mgInt").textContent = money(Math.round(m.interest));
    $("mgTable").innerHTML = m.years.map(function (y) { return "<tr><td>" + y.year + "</td><td>" + money(Math.round(y.interest)) + "</td><td>" + money(Math.round(y.principal)) + "</td><td>" + money(Math.round(y.balance)) + "</td></tr>"; }).join("");
  }
  $("mgForm").addEventListener("submit", function (ev) { ev.preventDefault(); fmtInput($("mgAmount")); runMG(); });
  $("mgForm").addEventListener("input", runMG); $("mgForm").addEventListener("change", runMG);

  runTitle(); runTT(); runMG();
})();
