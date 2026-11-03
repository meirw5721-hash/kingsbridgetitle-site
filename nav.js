(function () {
  "use strict";
  var btn = document.querySelector(".menu-btn"), nav = document.getElementById("siteNav"), bar = document.querySelector(".topbar");
  if (btn && nav) {
    var setOpen = function (on) {
      document.body.classList.toggle("menu-open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "Close menu" : "Open menu");
    };
    btn.addEventListener("click", function () { setOpen(btn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setOpen(false); btn.focus(); } });
    document.addEventListener("click", function (e) { if (document.body.classList.contains("menu-open") && !bar.contains(e.target)) setOpen(false); });
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 900) setOpen(false); });
  }

  /* sticky phone bar: on the home page it appears after the hero; on the order page it hides over the form */
  var dock = document.querySelector(".dock");
  if (!dock) return;
  var hero = document.querySelector(".hero"), orderSec = document.getElementById("order");
  if (!("IntersectionObserver" in window)) { dock.classList.add("on"); return; }
  var heroVis = !!hero, orderVis = false;
  var upd = function () { dock.classList.toggle("on", !heroVis && !orderVis); };
  if (hero) new IntersectionObserver(function (en) { heroVis = en[0].isIntersecting; upd(); }).observe(hero);
  if (orderSec) new IntersectionObserver(function (en) { orderVis = en[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(orderSec);
  upd();
})();
