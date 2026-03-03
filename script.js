document.addEventListener('DOMContentLoaded', () => {

    let chartInitialized = false;

    // ══════════════════════════════════════════════════════
    // SMOOTH SCROLL & MOBILE MENU CLOSE
    // ══════════════════════════════════════════════════════
    const navLinksMenu = document.getElementById('nav-links');
    const hamburger = document.getElementById('nav-hamburger');

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const id = link.getAttribute('href').slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                // Close mobile menu
                if (navLinksMenu) navLinksMenu.classList.remove('open');
                if (hamburger) {
                    hamburger.classList.remove('open');
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // ══════════════════════════════════════════════════════
    // SCROLL SPY — highlight active nav link
    // ══════════════════════════════════════════════════════
    const sections = document.querySelectorAll('[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    const spyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                navLinks.forEach(a => {
                    a.classList.toggle('nav-active', a.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { threshold: 0.1, rootMargin: '-64px 0px -50% 0px' });

    sections.forEach(sec => {
        // Only observe sections that have a matching nav link
        const hasNav = [...navLinks].some(a => a.getAttribute('href') === `#${sec.id}`);
        if (hasNav) spyObserver.observe(sec);
    });

    // ══════════════════════════════════════════════════════
    // VIDEO LAZY PLAY — play when in viewport, pause when out
    // ══════════════════════════════════════════════════════
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.2 });

    // Observe all videos except the hero (which autoplays)
    document.querySelectorAll('video').forEach(video => {
        if (!video.closest('.hero-video-bg')) {
            videoObserver.observe(video);
        }
    });

    // ══════════════════════════════════════════════════════
    // SCROLL REVEAL
    // ══════════════════════════════════════════════════════
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ══════════════════════════════════════════════════════
    // NAVBAR SCROLL EFFECT
    // ══════════════════════════════════════════════════════
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });

    // ══════════════════════════════════════════════════════
    // HAMBURGER MENU
    // ══════════════════════════════════════════════════════
    if (hamburger && navLinksMenu) {
        hamburger.addEventListener('click', () => {
            const isOpen = navLinksMenu.classList.toggle('open');
            hamburger.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', isOpen);
        });
    }

    // ══════════════════════════════════════════════════════
    // ANIMATED NUMBER COUNTERS
    // ══════════════════════════════════════════════════════
    function animateCounter(el) {
        const target = parseInt(el.dataset.count, 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        const start = performance.now();
        function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = prefix + Math.round(easeOutExpo(progress) * target) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

    // ══════════════════════════════════════════════════════
    // INTERACTIVE TECHNOLOGY TABS
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.tech-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.tech-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tech-panel').forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `panel-${target}`) {
                    panel.classList.add('active');
                    const v = panel.querySelector('video');
                    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
                } else {
                    const v = panel.querySelector('video');
                    if (v) v.pause();
                }
            });
        });
    });

    // ══════════════════════════════════════════════════════
    // EXPANDABLE EQUATION BOXES
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.equation-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const extra = toggle.nextElementSibling;
            const isOpen = extra.classList.toggle('open');
            toggle.classList.toggle('open', isOpen);
            const r = toggle.closest('.equation-box')?.dataset.reaction;
            const labels = { combustion: 'energy analysis', fermentation: 'carbon cycle', fuelcell: 'efficiency comparison' };
            toggle.textContent = isOpen ? 'Hide details ↑' : `Show ${labels[r] || 'details'} ↓`;
        });
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle.click(); }
        });
    });

    // ══════════════════════════════════════════════════════
    // INTERACTIVE BATTERY DIAGRAM
    // ══════════════════════════════════════════════════════
    const batteryParts = document.querySelectorAll('.battery-part.clickable');
    const batteryInfo = document.getElementById('battery-info');
    const batteryData = {
        anode: {
            title: '⊖ Anode — Graphite (LiₓC₆)',
            content: `<strong>During discharge:</strong> Lithium atoms lose electrons → Li⁺ ions migrate through electrolyte to cathode.<br><br><strong>Reaction:</strong> LiₓC₆ → xLi⁺ + xe⁻ + C₆<br><br>Released electrons flow through external circuit = electrical energy!`,
            highlight: 'highlight-anode'
        },
        cathode: {
            title: '⊕ Cathode — LiCoO₂ / LiFePO₄',
            content: `<strong>During discharge:</strong> Li⁺ ions intercalate into cathode crystal lattice + electrons from circuit.<br><br><strong>Reaction:</strong> Li₁₋ₓCoO₂ + xLi⁺ + xe⁻ → LiCoO₂<br><br>LiFePO₄ preferred for Indian EVs: lower cost, no cobalt, better thermal stability.`,
            highlight: 'highlight-cathode'
        }
    };
    batteryParts.forEach(part => {
        const handler = () => {
            const info = batteryData[part.dataset.info];
            if (info && batteryInfo) {
                batteryInfo.innerHTML = `<h4>${info.title}</h4><p>${info.content}</p>`;
                batteryInfo.className = 'battery-info-panel ' + info.highlight;
                batteryParts.forEach(p => p.style.borderColor = '');
                part.style.borderColor = part.dataset.info === 'anode' ? 'var(--gold)' : 'var(--green-primary)';
            }
        };
        part.addEventListener('click', handler);
        part.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    });

    // Pause/play battery animations based on visibility
    const batterySection = document.querySelector('.battery-interactive');
    if (batterySection) {
        new IntersectionObserver((entries) => {
            entries.forEach(e => batterySection.classList.toggle('battery-active', e.isIntersecting));
        }, { threshold: 0.1 }).observe(batterySection);
    }

    // ══════════════════════════════════════════════════════
    // EV SAVINGS CALCULATOR
    // ══════════════════════════════════════════════════════
    (function initCalculator() {
        const km = document.getElementById('calc-km');
        const price = document.getElementById('calc-price');
        const mileage = document.getElementById('calc-mileage');
        if (!km || !price || !mileage) return;

        function fmt(n) { return '₹' + n.toLocaleString('en-IN'); }
        function update() {
            const k = parseInt(km.value), p = parseInt(price.value), m = parseInt(mileage.value);
            document.getElementById('calc-km-val').textContent = k + ' km';
            document.getElementById('calc-price-val').textContent = '₹' + p;
            document.getElementById('calc-mileage-val').textContent = m + ' km/L';
            const petrol = Math.round((k / m) * p * 365);
            const co2 = Math.round((k / m) * 365 * 2.31);
            const ev = Math.round(k * 1.5 * 365);
            document.getElementById('petrol-cost').textContent = fmt(petrol);
            document.getElementById('petrol-co2').textContent = '+ ' + co2.toLocaleString('en-IN') + ' kg CO₂';
            document.getElementById('ev-cost').textContent = fmt(ev);
            document.getElementById('savings-amount').textContent = fmt(petrol - ev);
            document.getElementById('savings-co2').textContent = co2.toLocaleString('en-IN') + ' kg CO₂ avoided';
        }
        km.addEventListener('input', update);
        price.addEventListener('input', update);
        mileage.addEventListener('input', update);
        update();
    })();

    // ══════════════════════════════════════════════════════
    // OPPORTUNITIES vs CHALLENGES
    // ══════════════════════════════════════════════════════
    document.querySelectorAll('.comp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.comp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.comparison-view').forEach(v => {
                v.classList.toggle('active', v.id === `view-${btn.dataset.view}`);
            });
        });
    });

    // ══════════════════════════════════════════════════════
    // FLOATING PARTICLES
    // ══════════════════════════════════════════════════════
    const activeSystems = {};

    function initParticles(canvasId, opts) {
        if (activeSystems[canvasId] || window.innerWidth <= 768) return;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const particles = [];
        let animId = null;

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { w: rect.width, h: rect.height };
        }

        let { w, h } = resize();
        window.addEventListener('resize', () => { ({ w, h } = resize()); });

        const count = opts.count || 40;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w, y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
                size: Math.random() * 2 + 1,
                color: Math.random() < 0.25 ? (opts.accentColor || '212,160,18') : (opts.color || '46,125,50'),
                alpha: Math.random() * 0.5 + 0.3,
                pulse: Math.random() * 0.02 + 0.01,
                offset: Math.random() * Math.PI * 2,
            });
        }

        let visible = false;
        const io = new IntersectionObserver(e => {
            visible = e[0].isIntersecting;
            if (visible && !animId) animate();
        }, { threshold: 0.05 });
        io.observe(canvas);

        function animate() {
            if (!visible) { animId = null; return; }
            ctx.clearRect(0, 0, w, h);
            const now = performance.now();
            for (const p of particles) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                const a = p.alpha * (Math.sin(now * p.pulse + p.offset) * 0.2 + 0.8);
                ctx.beginPath();
                ctx.fillStyle = `rgba(${p.color},${(a * 0.18).toFixed(3)})`;
                ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.fillStyle = `rgba(${p.color},${a.toFixed(3)})`;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            const CONN_THRESHOLD = 110;
            const CONN_THRESHOLD_SQ = 12100;
            const connColor = opts.color || '46,125,50';
            ctx.lineWidth = 0.7;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    if (Math.abs(dx) >= CONN_THRESHOLD) continue;
                    const dy = particles[i].y - particles[j].y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < CONN_THRESHOLD_SQ) {
                        const d = Math.sqrt(dSq);
                        const a = (1 - d / CONN_THRESHOLD) * 0.15;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${connColor},${a.toFixed(3)})`;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(animate);
        }
        activeSystems[canvasId] = true;
    }

    // Init all particle systems on load
    initParticles('hero-particles', { count: 25, color: '46,125,50', accentColor: '212,160,18' });
    initParticles('stats-particles', { count: 22, color: '245,200,66', accentColor: '76,175,80' });
    initParticles('calc-particles', { count: 20, color: '76,175,80', accentColor: '245,200,66' });

    // ══════════════════════════════════════════════════════
    // CO₂ CHART — loads Chart.js when chart scrolls into view
    // ══════════════════════════════════════════════════════
    const chartCanvas = document.getElementById('co2Chart');
    if (chartCanvas) {
        new IntersectionObserver((entries, obs) => {
            if (entries[0].isIntersecting) {
                obs.unobserve(chartCanvas);
                initChart();
            }
        }, { threshold: 0.1 }).observe(chartCanvas);
    }

    function initChart() {
        const ctx = document.getElementById('co2Chart');
        if (!ctx || chartInitialized) return;
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
            script.onload = () => buildChart(ctx);
            document.head.appendChild(script);
            return;
        }
        buildChart(ctx);
    }

    function buildChart(ctx) {
        if (chartInitialized) return;
        chartInitialized = true;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2020', '2025', '2030', '2035', '2040', '2045', '2050', '2060', '2070'],
                datasets: [
                    {
                        label: 'Business-As-Usual (BAU)',
                        data: [100, 112, 128, 148, 165, 185, 200, 230, 260],
                        borderColor: '#b8860b', backgroundColor: 'rgba(184,134,11,0.05)',
                        borderWidth: 2, borderDash: [6, 4], tension: 0.4,
                        pointRadius: 5, pointBackgroundColor: '#b8860b', pointBorderColor: '#fff', pointBorderWidth: 2
                    },
                    {
                        label: 'Accelerated Renewable Adoption',
                        data: [100, 105, 92, 75, 55, 35, 20, 8, 2],
                        borderColor: '#2e7d32', backgroundColor: 'rgba(46,125,50,0.08)',
                        borderWidth: 2.5, fill: true, tension: 0.4,
                        pointRadius: 5, pointBackgroundColor: '#2e7d32', pointBorderColor: '#fff', pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { family: "'Inter'", size: 12, weight: '600' } } },
                    tooltip: { backgroundColor: '#1a1a1a', padding: 10, cornerRadius: 4 }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'CO₂ Index (2020=100)' }, grid: { color: 'rgba(0,0,0,0.06)' } },
                    x: { title: { display: true, text: 'Year' }, grid: { display: false } }
                }
            }
        });
    }

});
