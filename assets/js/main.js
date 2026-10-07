/* ============================================================
   MA GROWTH — main.js
   Grid cinético + typing + reveals + navegação
   Sem dependências externas.
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none)").matches;

  /* Mostra a hero imediatamente, sem vídeo de abertura. */
  function revealHero() {
    var items = document.querySelectorAll("#top [data-reveal]");
    for (var i = 0; i < items.length; i++) items[i].classList.add("is-visible");
  }

  /* 0 a 1: o quanto o visitante já rolou dentro da hero. Usado pelo grid
     (module 1) pra "acender" a malha conforme a pessoa rola, criando a
     animação de scroll pedida — e volta a 0 assim que a hero sai da tela,
     pra não ficar queimado nas seções de baixo (module 5 escreve aqui). */
  var heroScrollProgress = 0;

  revealHero();

  /* ==========================================================
     1. KINETIC GRID — canvas de fundo
     Adaptado do componente KineticGrid, com intensidade
     bem reduzida: as linhas quase somem e só acendem perto
     do cursor. Objetivo: tecnológico, não poluído.
     ========================================================== */

  (function kineticGrid() {
    var canvas = document.getElementById("gridCanvas");
    if (!canvas) return;

    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    /* --- Ajustes de intensidade (o "volume" do efeito) ---
       Reduzido depois do vídeo de abertura: logo após um momento de
       alta atenção (o vídeo), menos estímulo simultâneo compete com
       o headline e o CTA (heurística de carga cognitiva / hierarquia
       visual, Nielsen Norman Group). */
    var CELL          = 74;    // espaçamento da malha: maior = mais limpo
    var INFLUENCE     = 200;   // raio de alcance do cursor
    var MAX_WARP      = 12;    // o quanto a malha deforma
    var LERP          = 0.085; // suavidade do cursor
    var DOT_SPACING   = 34;

    var LINE_BASE   = { r: 242, g: 242, b: 244, a: 0.026 }; // quase invisível
    var LINE_ACTIVE = { r: 255, g: 108, b: 116, a: 0.20  }; // acende suave
    var NODE_BASE   = { r: 242, g: 242, b: 244, a: 0.055 };
    var NODE_ACTIVE = { r: 255, g: 120, b: 128, a: 0.40  };
    var GLOW_RGB    = "227,6,19";

    var NODE_R_BASE   = 1.0;
    var NODE_R_ACTIVE = 2.0;

    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var W = 0, H = 0;

    var mouse  = { x: -9999, y: -9999 };
    var target = { x: -9999, y: -9999 };
    var ripples = [];
    var raf = 0;
    var running = false;
    var heroInView = true;
    var idleFrames = 0;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      idleFrames = 0;
    }

    function lerpN(a, b, t) { return a + (b - a) * t; }

    function lerpColor(base, active, t) {
      var r = Math.round(lerpN(base.r, active.r, t));
      var g = Math.round(lerpN(base.g, active.g, t));
      var b = Math.round(lerpN(base.b, active.b, t));
      var a = lerpN(base.a, active.a, t);
      return "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")";
    }

    // Deforma um ponto da malha conforme cursor e ondas de clique.
    function warp(gx, gy, col, row, cols, rows) {
      // "prende" as bordas para a malha não descolar da tela
      var margin = 1.5;
      var colPin = Math.min(col / margin, (cols - 1 - col) / margin, 1);
      var rowPin = Math.min(row / margin, (rows - 1 - row) / margin, 1);
      var pin = colPin * colPin * rowPin * rowPin;

      var dx = gx - mouse.x;
      var dy = gy - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var proximity = Math.max(0, 1 - dist / INFLUENCE) * pin;

      var rx = 0, ry = 0;
      for (var i = 0; i < ripples.length; i++) {
        var rp = ripples[i];
        var rdx = gx - rp.x, rdy = gy - rp.y;
        var rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        var band = 60;
        var diff = rdist - rp.radius;
        if (Math.abs(diff) < band) {
          var strength = (1 - Math.abs(diff) / band) * rp.opacity * 11 * pin;
          var ang = Math.atan2(rdy, rdx);
          var sign = diff < 0 ? -1 : 1;
          rx += Math.cos(ang) * strength * sign * -1;
          ry += Math.sin(ang) * strength * sign * -1;
        }
      }

      if (dist < INFLUENCE && dist > 0 && pin > 0) {
        var t = dist / INFLUENCE;
        var eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        var amt = eased * MAX_WARP * pin;
        var a = Math.atan2(dy, dx);
        return {
          x: gx - Math.cos(a) * amt + rx,
          y: gy - Math.sin(a) * amt + ry,
          p: proximity
        };
      }
      return { x: gx + rx, y: gy + ry, p: proximity };
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);

      // a malha "acende" sozinha conforme a pessoa rola a hero, além de
      // reagir ao cursor — é a animação de scroll pedida, usando o que já
      // existe em vez de mais um elemento novo pra pesar na página
      var scrollBoost = heroScrollProgress * 0.55;

      // textura de pontos estática — dá "profundidade" sem pesar
      ctx.fillStyle = "rgba(242,242,244,0.016)";
      for (var dx = DOT_SPACING / 2; dx < W; dx += DOT_SPACING) {
        for (var dy = DOT_SPACING / 2; dy < H; dy += DOT_SPACING) {
          ctx.fillRect(dx, dy, 1, 1);
        }
      }

      // atualiza ondas de clique
      for (var i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i];
        var age = (now - rp.born) / 1000;
        rp.radius  = Math.max(0, age * 380);
        rp.opacity = Math.max(0, 1 - age * 1.35);
        if (rp.opacity <= 0) ripples.splice(i, 1);
      }

      var cols = Math.max(2, Math.ceil(W / CELL)) + 1;
      var rows = Math.max(2, Math.ceil(H / CELL)) + 1;
      var cw = W / (cols - 1);
      var ch = H / (rows - 1);

      var pts = [];
      for (var row = 0; row < rows; row++) {
        pts[row] = [];
        for (var col = 0; col < cols; col++) {
          pts[row][col] = warp(col * cw, row * ch, col, row, cols, rows);
        }
      }

      function segment(p1, p2) {
        var avg = (p1.p + p2.p) / 2;
        var t = Math.max(avg * avg * (3 - 2 * avg), scrollBoost); // smoothstep + boost de scroll
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = lerpColor(LINE_BASE, LINE_ACTIVE, t);
        ctx.lineWidth = lerpN(0.7, 1.15, t);
        ctx.stroke();
      }

      for (var r1 = 0; r1 < rows; r1++)
        for (var c1 = 0; c1 < cols - 1; c1++)
          segment(pts[r1][c1], pts[r1][c1 + 1]);

      for (var c2 = 0; c2 < cols; c2++)
        for (var r2 = 0; r2 < rows - 1; r2++)
          segment(pts[r2][c2], pts[r2 + 1][c2]);

      // nós das interseções
      for (var r3 = 0; r3 < rows; r3++) {
        for (var c3 = 0; c3 < cols; c3++) {
          var p = pts[r3][c3];
          var t3 = Math.max(p.p * p.p * (3 - 2 * p.p), scrollBoost);
          var rad = lerpN(NODE_R_BASE, NODE_R_ACTIVE, t3);

          if (t3 > 0.35) {
            var gr = rad + lerpN(0, 7, (t3 - 0.35) / 0.65);
            var grd = ctx.createRadialGradient(p.x, p.y, rad * 0.5, p.x, p.y, gr);
            grd.addColorStop(0, "rgba(" + GLOW_RGB + "," + (t3 * 0.10).toFixed(3) + ")");
            grd.addColorStop(1, "rgba(" + GLOW_RGB + ",0)");
            ctx.beginPath();
            ctx.arc(p.x, p.y, gr, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fillStyle = lerpColor(NODE_BASE, NODE_ACTIVE, t3);
          ctx.fill();
        }
      }

      // anel das ondas de clique
      for (var k = 0; k < ripples.length; k++) {
        var rr = ripples[k];
        ctx.beginPath();
        ctx.arc(rr.x, rr.y, Math.max(0, rr.radius), 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + GLOW_RGB + "," + (rr.opacity * 0.16).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function frame(now) {
      var moved = Math.abs(target.x - mouse.x) + Math.abs(target.y - mouse.y);

      mouse.x = lerpN(mouse.x, target.x, LERP);
      mouse.y = lerpN(mouse.y, target.y, LERP);

      // Se nada está acontecendo, para de desenhar (economiza bateria).
      // Enquanto a hero está sendo rolada, o boost de scroll conta como
      // "acontecendo" pra malha continuar redesenhando e acompanhar o scroll.
      if (moved < 0.3 && ripples.length === 0 && heroScrollProgress === 0) {
        idleFrames++;
      } else {
        idleFrames = 0;
      }

      if (idleFrames < 3) draw(now);

      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion || document.hidden || !heroInView || document.getElementById("deviceModal").classList.contains("is-open")) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    window.addEventListener("resize", function () {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      resize();
    });

    if (!isTouch) {
      window.addEventListener("mousemove", function (e) {
        target.x = e.clientX;
        target.y = e.clientY;
      }, { passive: true });

      window.addEventListener("mouseleave", function () {
        target.x = -9999; target.y = -9999;
      });
    }

    // Onda somente enquanto a hero estiver visível.
    window.addEventListener("click", function (e) {
      if (!heroInView || document.getElementById("deviceModal").classList.contains("is-open")) return;
      ripples.push({
        x: e.clientX, y: e.clientY,
        radius: 0, opacity: 1,
        born: performance.now()
      });
      idleFrames = 0;
    }, { passive: true });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    // desenha um primeiro quadro e revela o canvas
    draw(performance.now());
    canvas.classList.add("is-ready");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroInView = entries[0].isIntersecting;
        if (heroInView) start(); else { stop(); ripples = []; }
      }).observe(document.getElementById("top"));
    }
    new MutationObserver(function () {
      if (document.getElementById("deviceModal").classList.contains("is-open")) stop(); else start();
    }).observe(document.getElementById("deviceModal"), { attributes: true, attributeFilter: ["class"] });
    start();
  })();

  /* ==========================================================
     2. TYPING — headline que digita as três frases
     ========================================================== */

  /* Roda uma vez e assenta na última frase, sem ficar girando pra sempre.
     Um carrossel/texto que troca sozinho sem parar tira do visitante a
     chance de ler no próprio ritmo e prejudica a retenção da mensagem
     (Nielsen Norman Group, "Auto-Forwarding Carousels... Reduce
     Visibility"). Terminar parado em "ser escolhido." também aproveita
     o efeito de recência: a última coisa vista é a que mais fica. */
  (function typing() {
    var el = document.getElementById("heroTyped");
    if (!el) return;

    var phrases = ["ser visto.", "ser lembrado.", "ser escolhido."];

    if (reduceMotion) {
      el.textContent = phrases[phrases.length - 1];
      return;
    }

    var TYPE = 55;    // ms por caractere ao escrever
    var ERASE = 28;   // ms por caractere ao apagar
    var HOLD = 1700;  // pausa com a frase completa
    var GAP = 320;    // pausa antes de escrever a próxima

    var idx = 0, char = 0, erasing = false;

    function tick() {
      var full = phrases[idx];

      if (!erasing) {
        char++;
        el.textContent = full.slice(0, char);
        if (char === full.length) {
          erasing = true;
          return setTimeout(tick, HOLD);
        }
        return setTimeout(tick, TYPE);
      }

      char--;
      el.textContent = full.slice(0, char);
      if (char === 0) {
        erasing = false;
        idx = (idx + 1) % phrases.length;
        return setTimeout(tick, GAP);
      }
      return setTimeout(tick, ERASE);
    }

    setTimeout(tick, 700);
  })();

  /* ==========================================================
     3. NAV — fundo ao rolar, link ativo, menu mobile
     ========================================================== */

  var nav = document.getElementById("nav");
  var burger = document.getElementById("navBurger");
  var menu = document.getElementById("mobileMenu");

  function onScrollNav() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 30);
  }
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  if (burger && menu) {
    var openMenu = function () {
      menu.hidden = false;
      // força reflow para a transição de opacidade rodar
      void menu.offsetWidth;
      menu.classList.add("is-open");
      burger.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Fechar menu");
      document.body.style.overflow = "hidden";
    };

    var closeMenu = function () {
      menu.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Abrir menu");
      document.body.style.overflow = "";
      setTimeout(function () {
        if (!menu.classList.contains("is-open")) menu.hidden = true;
      }, 350);
    };

    burger.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu(); else openMenu();
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) closeMenu();
    });
  }

  /* link ativo conforme a seção visível */
  (function activeLink() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
    if (!links.length || !("IntersectionObserver" in window)) return;

    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute("href")); })
      .filter(Boolean);

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-current", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (s) { obs.observe(s); });
  })();

  /* ==========================================================
     4. REVEAL — entrada dos elementos ao rolar
     ========================================================== */

  (function reveal() {
    /* A hero já está visível; os demais elementos aparecem ao rolar. */
    var items = Array.prototype.filter.call(
      document.querySelectorAll("[data-reveal]"),
      function (el) { return !el.closest("#top"); }
    );
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) { obs.observe(el); });
  })();

  /* ==========================================================
     5. HERO — legendas e parallax durante o scroll
     ========================================================== */

  (function heroScroll() {
    var wrap = document.getElementById("heroWrap");
    var content = document.querySelector(".hero__content");
    var captions = document.querySelectorAll("#heroCaptions li");
    var cue = document.getElementById("heroScrollCue");
    if (!wrap) return;

    var ticking = false;

    function update() {
      var rect = wrap.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;

      // acende o grid cinético conforme rola a hero; some assim que ela
      // sai de vista, pra não ficar queimado no resto da página
      heroScrollProgress = rect.bottom > 0 ? progress : 0;

      // o conteúdo sobe e some rápido — uma rolagem já basta pra sensação
      // de "saída", em vez de ir sumindo aos poucos por várias telas
      if (content && !reduceMotion) {
        var fade = Math.max(0, 1 - progress * 2.1);
        content.style.opacity = fade.toFixed(3);
        content.style.transform = "translateY(" + (-progress * 60).toFixed(1) + "px) scale(" +
                                  (1 - progress * 0.07).toFixed(4) + ")";
      }

      if (captions.length) {
        var slot = 1 / captions.length;
        var active = Math.min(captions.length - 1, Math.floor(progress / slot));
        for (var i = 0; i < captions.length; i++) {
          captions[i].classList.toggle(
            "is-active",
            i === active && progress > 0.04 && progress < 0.94
          );
        }
      }

      if (cue) cue.classList.toggle("is-hidden", progress > 0.04);

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  })();

  /* ==========================================================
     6. CARDS — brilho que acompanha o cursor
     ========================================================== */

  if (!isTouch) {
    document.querySelectorAll(".card").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      }, { passive: true });
    });
  }

  /* ==========================================================
     7. SERVIÇOS — lista com prévia flutuante no hover
     ========================================================== */

  (function hoverShowcase() {
    var list = document.getElementById("hoverList");
    var ghost = document.getElementById("hoverGhost");
    if (!list || !ghost || isTouch) return;

    // move o ghost pra fora do container animado: um ancestral com
    // transform (mesmo a caminho de "none", em transição) vira o novo
    // containing block de todo position:fixed dentro dele, e o preview
    // acaba grudado no lugar errado da tela em vez de seguir o cursor
    document.body.appendChild(ghost);

    var items = list.querySelectorAll(".hoverlist__item");
    var mocks = ghost.querySelectorAll(".mock");

    items.forEach(function (item) {
      var key = item.getAttribute("data-mock");

      item.addEventListener("mouseenter", function () {
        mocks.forEach(function (m) {
          m.classList.toggle("is-active", m.classList.contains("mock--" + key));
        });
        ghost.classList.add("is-visible");
      });
    });

    list.addEventListener("mousemove", function (e) {
      ghost.style.left = e.clientX + "px";
      ghost.style.top = e.clientY + "px";
    }, { passive: true });

    list.addEventListener("mouseleave", function () {
      ghost.classList.remove("is-visible");
    });
  })();

  /* ==========================================================
     8. PRÉVIA EM TELA CHEIA — mockup de laptop com o vídeo do projeto
     Abre ao clicar no item "Sites & Landing Pages" da lista de serviços.
     ========================================================== */

  (function deviceModal() {
    var modal = document.getElementById("deviceModal");
    var closeBtn = document.getElementById("deviceModalClose");
    var video = document.getElementById("deviceModalVideo");
    var placeholder = document.getElementById("deviceModalPlaceholder");
    var soundBtn = document.getElementById("deviceModalSound");
    var phoneSoundBtn = document.getElementById("phoneSound");
    var panels = modal ? modal.querySelectorAll(".device-modal__panel") : [];
    var triggers = document.querySelectorAll(".hoverlist__item[data-device]");
    if (!modal) return;

    var hasVideo = !!(video && video.getAttribute("src"));

    if (video) video.muted = false;

    function toggleSound(btn, mediaEl) {
      if (!btn || !mediaEl) return;
      mediaEl.muted = !mediaEl.muted;
      btn.setAttribute("aria-pressed", String(!mediaEl.muted));
    }

    if (soundBtn && video) {
      soundBtn.addEventListener("click", function () { toggleSound(soundBtn, video); });
    }

    if (phoneSoundBtn) {
      phoneSoundBtn.addEventListener("click", function () {
        var activeVideo = document.querySelector(".device-modal__phone-slide video");
        toggleSound(phoneSoundBtn, activeVideo);
      });
    }

    function showPanel(name) {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-panel") !== name;
      });
    }

    var returnFocus;
    function open(deviceType) {
      returnFocus = document.activeElement;
      showPanel(deviceType);
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      closeBtn.focus();
      document.documentElement.style.overflow = "hidden";
      if (deviceType === "mac" && hasVideo && video) video.play().catch(function () {});
    }

    modal.addEventListener("portfolio:open", function (event) {
      open(event.detail.panel);
      if (event.detail.trigger) returnFocus = event.detail.trigger;
    });

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
      if (video) video.pause();
      if (returnFocus) returnFocus.focus();
    }

    triggers.forEach(function (trigger) {
      var deviceType = trigger.getAttribute("data-device");
      trigger.addEventListener("click", function () { open(deviceType); });
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(deviceType); }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);

    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        var focusable = Array.from(modal.querySelectorAll('button, a[href], video[controls], [tabindex="0"]')).filter(function (el) { return !el.disabled && el.getClientRects().length; });
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    if (placeholder) placeholder.hidden = hasVideo;

    var ctaButtons = modal.querySelectorAll(".device-modal__cta[data-service-target]");
    ctaButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var service = btn.getAttribute("data-service-target");
        close();

        var servicos = document.getElementById("servicos");
        var targetSelect = document.querySelector('.card__select[data-service="' + service + '"]');

        if (servicos) servicos.scrollIntoView({ behavior: "smooth", block: "start" });

        if (targetSelect) {
          setTimeout(function () {
            if (targetSelect.getAttribute("aria-pressed") !== "true") targetSelect.click();
            var card = targetSelect.closest(".card, .ecosystem");
            if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 450);
        }
      });
    });

    var phoneScreen = document.getElementById("phoneScreen");
    var phoneHint = document.getElementById("phoneHint");
    if (phoneScreen && phoneHint) {
      phoneScreen.addEventListener("scroll", function () {
        var atLast = phoneScreen.scrollTop >= phoneScreen.scrollHeight - phoneScreen.clientHeight - 4;
        phoneHint.classList.toggle("is-dismissed", atLast);
      }, { passive: true });
    }
  })();

  /* ==========================================================
     9. CARROSSEL DE POSTS — dentro do modal, painel "carousel"
     ========================================================== */

  (function postsCarousel() {
    var track = document.getElementById("carouselTrack");
    var dotsWrap = document.getElementById("carouselDots");
    var prevBtn = document.getElementById("carouselPrev");
    var nextBtn = document.getElementById("carouselNext");
    if (!track || !dotsWrap) return;

    var slides = track.querySelectorAll(".carousel__slide");
    var count = slides.length;
    var active = 0;

    for (var i = 0; i < count; i++) {
      (function (index) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.setAttribute("aria-label", "Ir para o post " + (index + 1));
        dot.addEventListener("click", function () { goTo(index); });
        dotsWrap.appendChild(dot);
      })(i);
    }
    var dots = dotsWrap.querySelectorAll(".carousel__dot");

    function render() {
      slides.forEach(function (slide, index) {
        var raw = index - active;
        if (raw > count / 2) raw -= count;
        if (raw < -count / 2) raw += count;
        slide.style.setProperty("--offset", raw);
        slide.style.setProperty("--dist", Math.min(Math.abs(raw), 3));
        slide.setAttribute("data-active", raw === 0 ? "true" : "false");
      });
      dots.forEach(function (dot, index) { dot.classList.toggle("is-active", index === active); });
    }

    function goTo(index) {
      active = ((index % count) + count) % count;
      render();
    }

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(active - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(active + 1); });

    render();
  })();

  /* ==========================================================
     9b. SLIDER ANTES/DEPOIS — comparação nas abas de identidade visual
     ========================================================== */

  (function compareSliders() {
    var sliders = document.querySelectorAll("[data-compare-slider]");
    if (!sliders.length) return;

    sliders.forEach(function (slider) {
      var dragging = false;

      function setPosFromClientX(clientX) {
        var rect = slider.getBoundingClientRect();
        var pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.max(4, Math.min(96, pct));
        slider.style.setProperty("--pos", pct + "%");
      }

      function onMove(e) {
        if (!dragging) return;
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setPosFromClientX(clientX);
      }

      function stopDrag() {
        dragging = false;
      }

      slider.addEventListener("pointerdown", function (e) {
        dragging = true;
        setPosFromClientX(e.clientX);
      });
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stopDrag);

      slider.addEventListener("touchstart", function (e) {
        dragging = true;
        setPosFromClientX(e.touches[0].clientX);
      }, { passive: true });
      slider.addEventListener("touchmove", onMove, { passive: true });
      slider.addEventListener("touchend", stopDrag);

      slider.addEventListener("keydown", function (e) {
        var current = parseFloat(getComputedStyle(slider).getPropertyValue("--pos")) || 50;
        if (e.key === "ArrowLeft") { slider.style.setProperty("--pos", Math.max(4, current - 5) + "%"); }
        if (e.key === "ArrowRight") { slider.style.setProperty("--pos", Math.min(96, current + 5) + "%"); }
      });
      slider.setAttribute("tabindex", "0");
      slider.setAttribute("role", "slider");
      slider.setAttribute("aria-label", "Arraste para comparar antes e depois");
      slider.setAttribute("aria-valuemin", "0");
      slider.setAttribute("aria-valuemax", "100");
    });
  })();

  /* ==========================================================
     10. ABAS DE IDENTIDADE VISUAL — dentro do modal, painel "tabs"
     ========================================================== */

  (function identityTabs() {
    var bar = document.getElementById("idTabsBar");
    var panelsWrap = document.getElementById("idTabsPanels");
    if (!bar || !panelsWrap) return;

    var buttons = bar.querySelectorAll(".id-tabs__btn");
    var panels = panelsWrap.querySelectorAll(".id-tabs__panel");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-tab");
        buttons.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-selected", String(active));
        });
        panels.forEach(function (panel) {
          panel.classList.toggle("is-active", panel.getAttribute("data-tab-panel") === key);
        });
      });
    });
  })();

  /* ==========================================================
     12. Ano no rodapé
     ========================================================== */

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();


  /* ==========================================================
     13b. TYPE ONCE — títulos que digitam sozinhos ao entrar na tela
     (Ponto Cego, citação do Sobre, título do Contato). Roda uma vez
     só, sem loop — só a headline da hero (module 2) repete.
     ========================================================== */

  (function typeOnceHeadlines() {
    var targets = [
      { text: "O seu cliente não escolhe quem ele não lembra.", textId: "blindTyped", caretId: "blindCaret", speed: 26 },
      { text: "Cada peça do seu digital, feita para levar à venda.", textId: "servicosTyped", caretId: "servicosCaret", speed: 28 },
      { text: "Um pouco sobre mim.", textId: "sobreTyped", caretId: "sobreCaret", speed: 24 },
      { text: "Vamos conversar sobre o seu projeto?", textId: "ctaTyped", caretId: "ctaCaret", speed: 20 }
    ];

    targets.forEach(function (t) {
      var textEl = document.getElementById(t.textId);
      var caretEl = document.getElementById(t.caretId);
      if (!textEl) return;

      if (reduceMotion || !("IntersectionObserver" in window)) {
        textEl.textContent = t.text;
        if (caretEl) caretEl.classList.add("is-done");
        return;
      }

      var root = textEl.closest("[data-reveal]") || textEl;
      var started = false;

      function run() {
        if (started) return;
        started = true;
        var i = 0;
        (function tick() {
          i++;
          textEl.textContent = t.text.slice(0, i);
          if (i < t.text.length) {
            setTimeout(tick, t.speed);
          } else if (caretEl) {
            caretEl.classList.add("is-done");
          }
        })();
      }

      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            run();
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      obs.observe(root);
    });
  })();

  /* ==========================================================
     13c. SELEÇÃO DE SERVIÇOS — marca interesse e monta a
     mensagem do WhatsApp com o que a pessoa escolheu
     ========================================================== */

  (function servicesSelect() {
    var buttons = document.querySelectorAll(".card__select");
    var link = document.getElementById("servicesWhatsapp");
    if (!buttons.length || !link) return;

    var selected = [];
    var BASE_URL = "https://wa.me/5513988631429?text=";
    var DEFAULT_MSG = "Olá Matheus, vim pelo site e quero falar sobre um projeto.";

    function updateLink() {
      var msg = selected.length
        ? "Olá Matheus, vim pelo site e tenho interesse em: " + selected.join(", ") + ". Pode me passar mais detalhes?"
        : DEFAULT_MSG;
      link.href = BASE_URL + encodeURIComponent(msg);
    }

    buttons.forEach(function (btn) {
      var service = btn.getAttribute("data-service");
      var card = btn.closest(".card, .ecosystem");

      btn.addEventListener("click", function () {
        var isOn = btn.getAttribute("aria-pressed") === "true";
        btn.setAttribute("aria-pressed", String(!isOn));
        if (card) card.setAttribute("data-selected", String(!isOn));

        var idx = selected.indexOf(service);
        if (!isOn && idx === -1) selected.push(service);
        if (isOn && idx !== -1) selected.splice(idx, 1);

        updateLink();
      });
    });
  })();

})();

/* Player do portfólio: um vídeo por vez, com áudio e controles nativos. */
(function () {
  var modal = document.getElementById("deviceModal");
  var panel = document.getElementById("panelPhone");
  var video = document.getElementById("portfolioPlayerVideo");
  if (!modal || !panel || !video) return;
  var frame = document.getElementById("portfolioPlayerFrame");
  var empty = document.getElementById("portfolioPlayerEmpty");
  var prev = document.getElementById("videoPlayerPrev");
  var next = document.getElementById("videoPlayerNext");
  var items = (window.PORTFOLIO_DATA.videos || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).filter(function (item) { return !!item.video; });
  var active = 0;
  function isOpen() { return modal.classList.contains("is-open") && !panel.hidden; }
  function select(index) {
    if (index < 0 || index >= items.length) return;
    video.pause(); active = index;
    var item = items[active];
    document.getElementById("portfolioVideoTitle").textContent = item.title;
    document.getElementById("portfolioVideoCount").textContent = (active + 1) + " / " + items.length;
    prev.disabled = active === 0; next.disabled = active === items.length - 1;
    video.hidden = false; empty.hidden = true;
    frame.style.aspectRatio = item.ratio || "9 / 16";
    panel.querySelector(".portfolio-player").classList.toggle("is-portrait", frame.style.aspectRatio === "9 / 16");
    if (item.cover) video.poster = item.cover; else video.removeAttribute("poster");
    video.src = item.video; video.muted = false; video.volume = 1;
    video.play().catch(function () {});
  }
  video.addEventListener("loadedmetadata", function () {
    if (!video.videoWidth || !video.videoHeight) return;
    frame.style.aspectRatio = video.videoWidth + " / " + video.videoHeight;
    panel.querySelector(".portfolio-player").classList.toggle("is-portrait", video.videoHeight > video.videoWidth);
  });
  video.addEventListener("error", function () {
    if (!video.getAttribute("src")) return;
    video.hidden = true; empty.hidden = false;
  });
  prev.addEventListener("click", function () { select(active - 1); });
  next.addEventListener("click", function () { select(active + 1); });
  modal.addEventListener("portfolio:open", function (event) {
    if (event.detail.panel !== "phone") return;
    var index = items.findIndex(function (item) { return item.id === event.detail.videoId; });
    select(Math.max(0, index));
  });
  new MutationObserver(function () {
    if (isOpen()) return;
    video.pause(); video.removeAttribute("src"); video.load();
  }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", function () { if (document.hidden) video.pause(); });
  modal.addEventListener("keydown", function (event) {
    if (!isOpen() || event.target === video) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); select(active + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
})();
