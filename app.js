(function(){
  "use strict";

  // Stop the browser from auto-restoring a previous scroll position on
  // reload/revisit.
  if ("scrollRestoration" in history) { history.scrollRestoration = "manual"; }

  // If the URL still has a leftover #about (or any) fragment from earlier
  // navigation, the browser will auto-scroll to that element on every load —
  // that's what causes the page to open at top then jump down. Strip it.
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);

  var STATUS_LABEL = { unresolved:"Unresolved", explained:"Explained", uncorroborated:"Uncorroborated" };

  // Image-type labels are deliberately explicit: a viewer should never mistake
  // an artist's rendering or a representative stock photo for evidence.
  var MEDIA_LABEL = {
    "photo": "Photograph",
    "video-still": "Video still — frame from released footage",
    "illustration": "Illustration — not a photograph"
  };

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

  // ---------- Search ----------
  var searchInput = document.getElementById("caseSearch");
  var searchClear = document.getElementById("searchClear");
  var searchQuery = "";

  function matchesSearch(c){
    if (!searchQuery) return true;
    var hay = (c.name + " " + c.location + " " + c.agency + " " +
               c.date + " " + c.summary + " " + c.status).toLowerCase();
    // Every whitespace-separated term must appear, so multi-word queries narrow.
    return searchQuery.split(/\s+/).every(function(term){
      return hay.indexOf(term) !== -1;
    });
  }

  function isVisible(c){
    return (activeFilter==="all" || c.status===activeFilter) && matchesSearch(c);
  }

  searchInput.addEventListener("input", function(){
    searchQuery = searchInput.value.trim().toLowerCase();
    searchClear.hidden = searchQuery === "";
    applyFilter();
  });
  searchInput.addEventListener("keydown", function(e){
    if (e.key === "Escape" && searchInput.value){
      e.stopPropagation();
      clearSearch();
    }
  });
  function clearSearch(){
    searchInput.value = "";
    searchQuery = "";
    searchClear.hidden = true;
    applyFilter();
  }
  searchClear.addEventListener("click", function(){
    clearSearch();
    searchInput.focus();
  });

  function applyFilter(){
    var shown = 0;
    CASES.forEach(function(c){
      var show = isVisible(c);
      if (show) shown++;
      var el = markerById[c.id].getElement();
      if (el) el.style.display = show ? "" : "none";
    });
    document.getElementById("countBadge").textContent =
      shown === CASES.length ? CASES.length + " cases"
                             : shown + " of " + CASES.length;
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
    var anyShown = false;
    groups.forEach(function(g){
      if (activeFilter!=="all" && activeFilter!==g.key) return;
      var items = CASES.filter(function(c){ return c.status===g.key && matchesSearch(c); });
      if (!items.length) return;
      anyShown = true;

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

    if (!anyShown){
      var empty = document.createElement("div");
      empty.className = "log-empty";
      empty.textContent = searchQuery
        ? "No cases match “" + searchInput.value.trim() + "”."
        : "No cases in this category.";
      logList.appendChild(empty);
    }
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

    var media = document.getElementById("sheetMedia");
    if (c.image){
      var img = document.getElementById("sheetImage");
      img.src = c.image;
      img.alt = c.imageCaption || c.name;
      var tag = document.getElementById("sheetMediaTag");
      tag.textContent = MEDIA_LABEL[c.imageType] || "";
      tag.className = "media-tag type-" + c.imageType;
      document.getElementById("sheetMediaCaption").textContent = c.imageCaption || "";
      document.getElementById("sheetMediaCredit").textContent = c.imageCredit || "";
      media.hidden = false;
    } else {
      media.hidden = true;
    }
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

  // ---------- Image collage ----------
  // Tiles load small pre-generated thumbnails (~0.9MB total) rather than the
  // full-size originals (~43MB), falling back to the original if a thumb is
  // missing. Selecting a tile returns to the top and opens that case file.
  var galleryGrid = document.getElementById("galleryGrid");
  var MEDIA_SHORT = { "photo":"Photo", "video-still":"Still", "illustration":"Illustration" };

  // Held out of the collage: images that show a location, a representative
  // aircraft type, or an example of the phenomenon rather than the reported
  // object itself. Each still appears in its own case file, where the caption
  // supplies the context a bare thumbnail can't.
  var GALLERY_EXCLUDE = {
    malmstrom:1, rendlesham:1, socorro:1, mantell:1, rb47:1, minot1968:1,
    loring:1, tehran1976:1, belgium:1, aawsap:1, icbmclaims:1,
    canaveralstarlink:1, satflare:1, radarmalfunction:1
  };

  CASES.filter(function(c){ return c.image && !GALLERY_EXCLUDE[c.id]; }).forEach(function(c){
    var tile = document.createElement("button");
    tile.className = "gallery-tile type-" + c.imageType;
    tile.setAttribute("aria-label", c.name + " — " + (MEDIA_LABEL[c.imageType] || ""));

    var img = document.createElement("img");
    img.src = "images/thumbs/" + c.id + ".jpg";
    img.alt = c.imageCaption || c.name;
    img.loading = "lazy";
    img.addEventListener("error", function handleErr(){
      img.removeEventListener("error", handleErr);
      img.src = c.image;
    });
    tile.appendChild(img);

    var meta = document.createElement("span");
    meta.className = "gallery-meta";
    var tag = document.createElement("span");
    tag.className = "gallery-type";
    tag.textContent = MEDIA_SHORT[c.imageType] || "";
    var nm = document.createElement("span");
    nm.className = "gallery-name";
    nm.textContent = c.name;
    meta.appendChild(tag);
    meta.appendChild(nm);
    tile.appendChild(meta);

    tile.addEventListener("click", function(){
      var top = document.getElementById("top");
      if (top) top.scrollIntoView({ behavior:"smooth", block:"start" });
      openSheet(c.id);
    });

    galleryGrid.appendChild(tile);
  });

  // ---------- In-page anchor links ----------
  // Scroll via JS instead of a real #hash, so the URL never ends up
  // containing a fragment that would make the browser auto-scroll here
  // again on the next reload.
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function(link){
    link.addEventListener("click", function(e){
      var targetId = link.getAttribute("href").slice(1);
      var target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();
