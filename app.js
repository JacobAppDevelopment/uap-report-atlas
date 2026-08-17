(function(){
  "use strict";

  // Stop the browser from auto-restoring a previous scroll position on
  // reload/revisit — that's what causes the page to briefly render at the
  // top, then jump down to wherever it was last scrolled.
  if ("scrollRestoration" in history) { history.scrollRestoration = "manual"; }
  window.scrollTo(0, 0);

  var STATUS_LABEL = { unresolved:"Unresolved", explained:"Explained", uncorroborated:"Uncorroborated" };

  document.getElementById("countBadge").textContent = CASES.length + " cases";

  // ---------- Map ----------
  var map = L.map("map", {
    worldCopyJump:true,
    minZoom:2,
    zoomControl:true
  }).setView([25, 10], 2.3);

  // Esri's Dark Gray Canvas basemap is authored in English regardless of
  // viewer locale (unlike OSM-derived tiles, which label places in their
  // local language). Base layer (fills/water/roads) + Reference layer
  // (country/place-name labels) are loaded separately and stacked.
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    attribution:'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom:16
  }).addTo(map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
    maxZoom:16,
    pane:"shadowPane"
  }).addTo(map);

  var markerById = {};
  CASES.forEach(function(c){
    var icon = L.divIcon({
      className:"",
      html:'<div class="pin status-' + c.status + (c.precision==="approx" ? " approx" : "") + '"></div>',
      iconSize:[16,16],
      iconAnchor:[8,8]
    });
    var m = L.marker([c.lat, c.lon], { icon:icon, keyboard:true, alt:c.name }).addTo(map);
    m.bindTooltip(c.name, { direction:"top", offset:[0,-6], opacity:0.95 });
    m.on("click", function(){ openSheet(c.id); });
    markerById[c.id] = m;
  });

  // ---------- Filters ----------
  var filterBar = document.getElementById("filterBar");
  var activeFilter = "all";
  filterBar.addEventListener("click", function(e){
    var btn = e.target.closest(".chip");
    if (!btn) return;
    activeFilter = btn.getAttribute("data-filter");
    Array.prototype.forEach.call(filterBar.querySelectorAll(".chip"), function(c){
      c.setAttribute("aria-pressed", c===btn ? "true" : "false");
    });
    applyFilter();
  });

  function applyFilter(){
    CASES.forEach(function(c){
      var show = activeFilter==="all" || c.status===activeFilter;
      var el = markerById[c.id].getElement();
      if (el) el.style.display = show ? "" : "none";
    });
    buildLog();
  }

  // ---------- Log list ----------
  var logList = document.getElementById("logList");

  // ---------- Whole-list collapse ----------
  var logToggle = document.getElementById("logToggle");
  var logToggleLabel = document.getElementById("logToggleLabel");
  logToggle.addEventListener("click", function(){
    var expanded = logToggle.getAttribute("aria-expanded") === "true";
    logToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
    logList.classList.toggle("hidden", expanded);
    logToggleLabel.textContent = expanded ? "Show case list" : "Hide case list";
  });
  var collapsedGroups = {}; // key -> true if collapsed; persists across re-renders
  function buildLog(){
    logList.innerHTML = "";
    var groups = [
      { key:"unresolved", label:"Unresolved" },
      { key:"explained", label:"Explained" },
      { key:"uncorroborated", label:"Uncorroborated" }
    ];
    groups.forEach(function(g){
      if (activeFilter!=="all" && activeFilter!==g.key) return;
      var items = CASES.filter(function(c){ return c.status===g.key; });
      if (!items.length) return;

      var groupEl = document.createElement("div");
      groupEl.className = "log-group" + (collapsedGroups[g.key] ? " collapsed" : "");

      var title = document.createElement("button");
      title.className = "log-section-title";
      title.setAttribute("aria-expanded", collapsedGroups[g.key] ? "false" : "true");
      title.innerHTML = '<span class="chevron">&#9656;</span><span>' + g.label + " · " + items.length + "</span>";
      title.addEventListener("click", function(){
        collapsedGroups[g.key] = !collapsedGroups[g.key];
        groupEl.classList.toggle("collapsed", !!collapsedGroups[g.key]);
        title.setAttribute("aria-expanded", collapsedGroups[g.key] ? "false" : "true");
      });
      groupEl.appendChild(title);

      var rows = document.createElement("div");
      rows.className = "log-group-rows";
      var rowsInner = document.createElement("div");
      rowsInner.className = "log-group-rows-inner";
      items.forEach(function(c){
        var row = document.createElement("button");
        row.className = "case-row status-" + c.status;
        row.innerHTML = '<span class="dot"></span>' +
          '<span class="meta"><span class="name">'+c.name+'</span>' +
          '<span class="sub">'+c.location+'</span></span>' +
          '<span class="date">'+c.date+'</span>';
        row.addEventListener("click", function(){ openSheet(c.id); });
        rowsInner.appendChild(row);
      });
      rows.appendChild(rowsInner);
      groupEl.appendChild(rows);
      logList.appendChild(groupEl);
    });
  }
  buildLog();

  // ---------- Detail sheet ----------
  var sheet = document.getElementById("sheet");
  var backdrop = document.getElementById("sheetBackdrop");
  var sheetClose = document.getElementById("sheetClose");

  function openSheet(id){
    var c = CASES.filter(function(x){ return x.id===id; })[0];
    if (!c) return;
    document.getElementById("sheetBadgeText").textContent = STATUS_LABEL[c.status];
    document.getElementById("sheetBadge").querySelector(".dot").style.background = "var(--status-" + c.status + ")";
    document.getElementById("sheetTitle").textContent = c.name;
    document.getElementById("sheetLoc").textContent = c.location + (c.precision==="approx" ? " — approximate placement" : "");
    document.getElementById("sheetDate").textContent = c.date;
    document.getElementById("sheetAgency").textContent = c.agency;
    document.getElementById("sheetSummary").textContent = c.summary;
    document.getElementById("sheetSource").textContent = "Source: " + c.source;
    sheet.classList.add("open");
    backdrop.classList.add("open");
    if (window.innerWidth >= 900){
      map.flyTo([c.lat, c.lon], Math.max(map.getZoom(), 4), { duration:0.6 });
    }
  }
  function closeSheet(){
    sheet.classList.remove("open");
    backdrop.classList.remove("open");
  }
  sheetClose.addEventListener("click", closeSheet);
  backdrop.addEventListener("click", closeSheet);
  document.addEventListener("keydown", function(e){ if (e.key==="Escape") closeSheet(); });

  setTimeout(function(){ map.invalidateSize(); }, 80);
  window.addEventListener("resize", function(){ map.invalidateSize(); });
})();
