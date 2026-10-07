(function () {
  "use strict";
  var data = window.PORTFOLIO_DATA;
  if (!data || !document.getElementById("portfolio")) return;
  function ordered(items) { return (items || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }); }
  var sites = ordered(data.sites), identities = ordered(data.identities);
  var videos = ordered(data.videos), social = ordered(data.social);
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function placeholder() { return el("div", "portfolio-placeholder", "Em breve"); }
  function image(src, alt, onError) {
    if (!src) return placeholder();
    var img = el("img");
    img.src = src; img.alt = alt; img.loading = "lazy"; img.decoding = "async"; img.draggable = false;
    img.addEventListener("error", function () { img.replaceWith(placeholder()); if (onError) onError(); }, { once: true });
    return img;
  }
  function link(target, url, label) {
    target.replaceChildren();
    if (!url) return;
    var node = el("a", "portfolio-link", label + " ↗");
    node.href = url; node.target = "_blank"; node.rel = "noopener noreferrer";
    target.appendChild(node);
  }
  function limits(prev, next, position, total, size) {
    prev.disabled = position <= 0;
    next.disabled = position + size >= total;
  }
  function open(panel, detail) {
    var modal = document.getElementById("deviceModal");
    modal.dispatchEvent(new CustomEvent("portfolio:open", { detail: Object.assign({ panel: panel, trigger: document.activeElement }, detail) }));
  }

  // Site: somente o projeto selecionado carrega, em loop e sem áudio por padrão.
  var siteFrame = document.getElementById("portfolioSiteFrame");
  var siteTabs = document.getElementById("portfolioSiteTabs");
  var siteVideo = null, siteInView = false;
  function syncSite() {
    if (!siteVideo) return;
    var allowed = siteInView && !document.hidden && !document.getElementById("deviceModal").classList.contains("is-open");
    if (allowed) {
      if (!siteVideo.getAttribute("src")) siteVideo.src = siteVideo.dataset.src;
      siteVideo.muted = true;
      siteVideo.play().catch(function () {});
    } else { siteVideo.pause(); }
  }
  function selectSite(index) {
    if (siteVideo) siteVideo.pause();
    siteVideo = null;
    var project = sites[index] || { title: "Projeto de site" };
    siteFrame.replaceChildren();
    siteFrame.style.aspectRatio = "16 / 9";
    if (project.video) {
      var media = el("video", "portfolio-site-video");
      media.dataset.src = project.video; media.muted = true; media.loop = true; media.autoplay = true; media.playsInline = true; media.preload = "none";
      media.setAttribute("aria-label", "Prévia de " + project.title);
      media.setAttribute("controlslist", "nodownload noremoteplayback");
      media.disableRemotePlayback = true;
      if (project.cover) media.poster = project.cover;
      media.addEventListener("loadedmetadata", function () {
        if (siteVideo === media && media.videoWidth && media.videoHeight) siteFrame.style.aspectRatio = media.videoWidth + " / " + media.videoHeight;
      });
      media.addEventListener("error", function () {
        media.pause();
        if (siteVideo === media) { siteFrame.replaceChildren(placeholder()); siteVideo = null; }
      }, { once: true });
      siteFrame.append(media); siteVideo = media;
    } else { siteFrame.appendChild(placeholder()); }
    Array.from(siteTabs.children).forEach(function (button, i) { button.setAttribute("aria-pressed", String(i === index)); });
    link(document.getElementById("portfolioSiteLink"), project.link, "Visitar site");
    syncSite();
  }
  sites.forEach(function (project, index) {
    var button = el("button", "", project.title);
    button.type = "button"; button.addEventListener("click", function () { selectSite(index); });
    siteTabs.appendChild(button);
  });
  selectSite(0);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { siteInView = entries[0].isIntersecting; syncSite(); }, { threshold: 0.1 }).observe(siteFrame);
  } else { siteInView = true; syncSite(); }
  document.addEventListener("visibilitychange", syncSite);
  new MutationObserver(syncSite).observe(document.getElementById("deviceModal"), { attributes: true, attributeFilter: ["class"] });

  // O range nativo funciona com mouse, toque, setas, Home e End.
  var identityIndex = 0, identityRender = 0;
  var range = document.getElementById("identityRange"), compare = document.getElementById("portfolioCompare");
  function comparePosition() {
    compare.style.setProperty("--compare", range.value + "%");
    range.setAttribute("aria-valuetext", range.value + "% depois, " + (100 - Number(range.value)) + "% antes");
  }
  range.addEventListener("input", comparePosition);
  function renderIdentity() {
    var project = identities[identityIndex] || { title: "Identidade Visual" };
    var renderId = ++identityRender;
    function unavailable() {
      if (renderId !== identityRender) return;
      range.disabled = true;
      compare.classList.add("is-pending");
      document.getElementById("identityBefore").replaceChildren(placeholder());
      document.getElementById("identityAfter").replaceChildren();
      document.getElementById("identityHelp").textContent = "Antes / depois · Em breve";
    }
    document.getElementById("identityBefore").replaceChildren(image(project.before, project.title + " — antes", unavailable));
    document.getElementById("identityAfter").replaceChildren(image(project.after, project.title + " — depois", unavailable));
    document.getElementById("identityProjectTitle").textContent = project.title;
    range.disabled = !project.before || !project.after;
    compare.classList.toggle("is-pending", range.disabled);
    document.getElementById("identityHelp").textContent = range.disabled ? "Antes / depois · Em breve" : "↔ Arraste para a direita para revelar o novo logo";
    if (range.disabled) unavailable();
    range.value = 50; comparePosition();
    link(document.getElementById("identityLink"), project.link, "Ver projeto");
    limits(document.getElementById("identityPrev"), document.getElementById("identityNext"), identityIndex, identities.length, 1);
  }
  document.getElementById("identityPrev").addEventListener("click", function () { if (identityIndex > 0) { identityIndex--; renderIdentity(); } });
  document.getElementById("identityNext").addEventListener("click", function () { if (identityIndex < identities.length - 1) { identityIndex++; renderIdentity(); } });
  renderIdentity();

  var galleryProject, postIndex = 0;
  function renderPost() {
    var posts = galleryProject.posts || [];
    document.getElementById("portfolioGalleryTitle").textContent = galleryProject.title;
    var postImage = image(posts[postIndex], galleryProject.title + " — post " + (postIndex + 1));
    if (postImage.tagName === "IMG") postImage.loading = "eager";
    document.getElementById("portfolioGalleryPost").replaceChildren(postImage);
    document.getElementById("portfolioGalleryCount").textContent = (postIndex + 1) + " / " + posts.length;
    limits(document.getElementById("postPrev"), document.getElementById("postNext"), postIndex, posts.length, 1);
  }
  function openGallery(project) {
    if (!(project.posts || []).length) return;
    galleryProject = project; postIndex = 0; renderPost();
    open("carousel");
    document.getElementById("portfolioGalleryTitle").focus();
  }
  function changePost(step) {
    if (!galleryProject) return;
    var next = postIndex + step;
    if (next >= 0 && next < galleryProject.posts.length) { postIndex = next; renderPost(); }
  }
  document.getElementById("postPrev").addEventListener("click", function () { changePost(-1); });
  document.getElementById("postNext").addEventListener("click", function () { changePost(1); });
  document.getElementById("deviceModal").addEventListener("keydown", function (event) {
    if (!this.classList.contains("is-open") || document.getElementById("panelCarousel").hidden) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); changePost(event.key === "ArrowLeft" ? -1 : 1); }
  });

  var previewObserver = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.src = entry.target.dataset.src;
      previewObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1 }) : null;
  function preview(project, type) {
    var item = el("div", "portfolio-preview");
    var available = type === "videos" ? !!project.video : !!(project.posts || []).length;
    var media = el(available ? "button" : "div", "portfolio-preview__media");
    if (available) {
      media.type = "button";
      media.setAttribute("aria-label", (type === "videos" ? "Reproduzir " : "Ver posts de ") + project.title);
      media.addEventListener("click", function () {
        if (type === "social") openGallery(project);
        else open("phone", { videoId: project.id });
      });
    }
    if (!available) media.appendChild(placeholder());
    else if (project.cover || (type === "social" && project.posts[0])) media.appendChild(image(project.cover || project.posts[0], project.title));
    else if (type === "videos" && project.video) {
      var video = el("video"); video.dataset.src = project.video; video.preload = "metadata"; video.muted = true; video.playsInline = true;
      video.setAttribute("aria-hidden", "true"); video.tabIndex = -1;
      video.addEventListener("error", function () { video.replaceWith(placeholder()); media.disabled = true; }, { once: true });
      media.appendChild(video);
      if (previewObserver) previewObserver.observe(video);
      else video.src = project.video;
    } else media.appendChild(placeholder());
    if (type === "videos" && available) media.appendChild(el("span", "portfolio-preview__play", "▶"));
    var footer = el("div", "portfolio-preview__footer");
    footer.appendChild(el("h4", "", project.title));
    if (type === "social" && available) {
      var postsButton = el("button", "portfolio-link", "Ver posts ↗");
      postsButton.type = "button"; postsButton.setAttribute("aria-label", "Ver posts de " + project.title);
      postsButton.addEventListener("click", function () { openGallery(project); });
      footer.appendChild(postsButton);
    }
    item.append(media, footer); return item;
  }
  var wide = window.matchMedia("(min-width:1100px)"), tablet = window.matchMedia("(min-width:641px)");
  function pageSize() { return wide.matches ? 3 : tablet.matches ? 2 : 1; }
  function shelf(type, list) {
    var position = 0, size = pageSize();
    var host = document.getElementById(type === "videos" ? "portfolioVideoShelf" : "portfolioSocialShelf");
    var prev = document.getElementById(type + "Prev"), next = document.getElementById(type + "Next");
    function render() {
      host.style.setProperty("--shelf-count", size);
      if (previewObserver) host.querySelectorAll("video").forEach(function (video) { previewObserver.unobserve(video); });
      host.replaceChildren();
      list.slice(position, position + size).forEach(function (project) { host.appendChild(preview(project, type)); });
      if (!list.length) host.appendChild(placeholder());
      limits(prev, next, position, list.length, size);
      document.getElementById(type + "Status").textContent = list.length ? "Projetos " + (position + 1) + " a " + Math.min(position + size, list.length) + " de " + list.length : "Em breve";
    }
    prev.addEventListener("click", function () { position = Math.max(0, position - size); render(); });
    next.addEventListener("click", function () { if (position + size < list.length) { position += size; render(); } });
    function resize() {
      var nextSize = pageSize();
      if (size !== nextSize) { size = nextSize; position = Math.floor(position / size) * size; render(); }
    }
    wide.addEventListener("change", resize); tablet.addEventListener("change", resize);
    render();
  }
  shelf("videos", videos); shelf("social", social);

  // Dificulta salvar/copiar pelas ações comuns do navegador; não é proteção DRM.
  [document.getElementById("portfolio"), document.getElementById("deviceModal")].forEach(function (root) {
    root.addEventListener("contextmenu", function (event) {
      if (event.target.closest("img, video, .portfolio-preview__media, .portfolio-compare, .portfolio-instagram__body, .portfolio-player__media")) event.preventDefault();
    });
    root.addEventListener("dragstart", function (event) {
      if (event.target.matches("img, video")) event.preventDefault();
    });
    root.addEventListener("copy", function (event) {
      if (event.target.closest(".portfolio-instagram__body, .portfolio-player__media, .portfolio-compare, .portfolio-preview__media")) event.preventDefault();
    });
  });
})();
