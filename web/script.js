// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(open => {
      open.classList.remove('open');
      open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== Hero parallax (mouse-driven depth on the hero art) =====
(function initHeroParallax() {
  if (prefersReducedMotion) return;
  const hero = document.querySelector('.hero');
  const heroImg = document.querySelector('.hero-bg img');
  if (!hero || !heroImg) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    heroImg.style.transform = `scale(1.08) translate(${px * -22}px, ${py * -16}px) rotate(${px * 1.4}deg)`;
  });
  hero.addEventListener('mouseleave', () => {
    heroImg.style.transform = '';
  });
})();

// ===== Generic 3D tilt for cards =====
function attachTilt(el, maxDeg) {
  if (prefersReducedMotion) return;
  const max = maxDeg || 9;
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 2 * max;
    const ry = (px - 0.5) * 2 * max;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02, 1.02, 1.02)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
}

document.querySelectorAll('.feature-card, .step-card, .ss-card').forEach((el) => attachTilt(el, 7));

// ===== Audio-sync waveform pulse =====
(function initWaveform() {
  const el = document.getElementById('syncWaveform');
  if (!el) return;
  const bars = 26;
  for (let i = 0; i < bars; i += 1) {
    const bar = document.createElement('span');
    if (!prefersReducedMotion) {
      bar.style.animationDuration = (0.7 + Math.random() * 0.7).toFixed(2) + 's';
      bar.style.animationDelay = (Math.random() * -1.4).toFixed(2) + 's';
    }
    el.appendChild(bar);
  }
})();

// ===== Letter-by-letter headline reveal (looping) =====
(function animateHeadline() {
  const lines = document.querySelectorAll('#heroHeadline .headline-line');
  if (!lines.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stepMs = 32;
  const letterDurationMs = 500;
  const holdMs = 1800;

  const letters = [];
  let i = 0;
  lines.forEach((line) => {
    const text = line.getAttribute('data-text') || '';
    line.textContent = '';
    [...text].forEach((ch) => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.animationDelay = i * stepMs + 'ms';
      line.appendChild(span);
      letters.push(span);
      i += 1;
    });
  });

  if (reduceMotion || !letters.length) return;

  const cycleMs = (letters.length - 1) * stepMs + letterDurationMs + holdMs;

  function replay() {
    letters.forEach((span, idx) => {
      span.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      span.offsetWidth; // force reflow so the animation restarts
      span.style.animation = '';
      span.style.animationDelay = idx * stepMs + 'ms';
    });
    setTimeout(replay, cycleMs);
  }

  setTimeout(replay, cycleMs);
})();

// ===== Scroll-driven header, progress bar, back-to-top, scrollspy =====
const siteHeader = document.getElementById('site-header');
const scrollProgress = document.getElementById('scroll-progress');
const backToTop = document.getElementById('back-to-top');
const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
const sections = Array.from(navLinks)
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

let ticking = false;

function onScroll() {
  const scrollY = window.scrollY || window.pageYOffset;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
  scrollProgress.style.width = progress + '%';

  siteHeader.classList.toggle('scrolled', scrollY > 40);
  backToTop.classList.toggle('show', scrollY > 500);

  let currentId = null;
  const probe = scrollY + window.innerHeight * 0.3;
  sections.forEach(section => {
    if (section.offsetTop <= probe) currentId = section.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', currentId && link.getAttribute('href') === '#' + currentId);
  });

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(onScroll);
    ticking = true;
  }
}, { passive: true });

onScroll();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== Scroll-reveal on entry =====
const revealEls = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.getAttribute('data-reveal-delay');
      if (delay) entry.target.style.setProperty('--reveal-delay', delay + 'ms');
      entry.target.classList.add('reveal-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

// ===== Animated stat counters =====
document.querySelectorAll('.stat-count').forEach(statEl => {
  const target = parseFloat(statEl.getAttribute('data-target'));
  const decimals = parseInt(statEl.getAttribute('data-decimals') || '0', 10);
  const suffix = statEl.getAttribute('data-suffix') || '';

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const duration = 1400;
      const start = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = (target * eased).toFixed(decimals);
        statEl.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statObserver.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  statObserver.observe(statEl);
});

// ===== Cursor-tracking glow on feature cards =====
document.querySelectorAll('.tilt-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width) * 100 + '%');
    card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height) * 100 + '%');
  });
});

// ===== Play button: simulated sync-then-play flow =====
function wirePlayButtons(scope) {
  scope.querySelectorAll('.play-btn').forEach(btn => {
    const label = btn.querySelector('.play-label');
    const icon = btn.querySelector('.play-icon');
    const poster = btn.closest('.movie-card').querySelector('.movie-poster');
    let state = 'idle';

    btn.addEventListener('click', () => {
      if (state === 'idle') {
        state = 'syncing';
        btn.classList.add('syncing');
        icon.textContent = '⟳';
        label.textContent = 'Syncing…';

        setTimeout(() => {
          state = 'playing';
          btn.classList.remove('syncing');
          btn.classList.add('playing');
          icon.textContent = '⏸';
          label.textContent = 'Playing';
          poster.classList.add('is-playing');
        }, 1100);

      } else if (state === 'playing') {
        state = 'idle';
        btn.classList.remove('playing');
        icon.textContent = '▶';
        label.textContent = 'Play';
        poster.classList.remove('is-playing');
      }
    });
  });
}

// ===== Movies library: poster strip + filterable grid =====
(function initMoviesLibrary() {
  const stripTrack = document.getElementById('posterStripTrack');
  const grid = document.getElementById('moviesGrid');
  if (!grid || typeof MOVIES === 'undefined') return;

  if (stripTrack) {
    const stripImages = MOVIES.concat(MOVIES)
      .map((m) => `<img src="${m.poster}" alt="">`)
      .join('');
    stripTrack.innerHTML = stripImages;
  }

  function renderGrid(filter) {
    const list = filter === 'all' ? MOVIES : MOVIES.filter((m) => m.status === filter);
    grid.innerHTML = list.map((m, i) => `
      <div class="movie-card" data-status="${m.status}" style="--reveal-delay:${Math.min(i, 6) * 70}ms">
        <div class="movie-poster">
          ${m.status === 'new' ? '<span class="movie-new-badge">NEW</span>' : ''}
          <img src="${m.poster}" alt="${m.title} movie poster" loading="lazy">
          <span class="playing-badge"><span class="pulse-dot"></span> Now Playing</span>
        </div>
        <div class="movie-info">
          <h3>${m.title}</h3>
          <p class="movie-meta">${m.year} &middot; ${m.genre} &middot; ${m.rating}</p>
          <div class="movie-badges">
            <span class="badge-icon" title="Audio Description">\u{1F3A7}</span>
            <span class="badge-icon" title="Closed Captions">\u{1F4AC}</span>
            <span class="badge badge-lang">TELUGU</span>
          </div>
          <div class="movie-actions">
            <button type="button" class="btn btn-gold-outline btn-sm play-btn">
              <span class="play-icon">▶</span><span class="play-label">Play</span>
            </button>
            <a href="#download" class="btn btn-gold btn-sm">Get App</a>
          </div>
        </div>
      </div>
    `).join('');

    if (list.length === 0) {
      grid.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;">No movies match this filter.</p>';
      return;
    }

    wirePlayButtons(grid);
    grid.querySelectorAll('.movie-card').forEach((card) => attachTilt(card, 6));
    requestAnimationFrame(() => {
      grid.querySelectorAll('.movie-card').forEach((card) => card.classList.add('card-visible'));
    });
  }

  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      renderGrid(pill.getAttribute('data-filter'));
    });
  });

  renderGrid('all');
})();

// ===== Button ripple effect =====
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});
