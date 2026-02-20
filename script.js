document.addEventListener('DOMContentLoaded', () => {

    const initializeNewsSidebar = () => {
        const newsListElement = document.getElementById('news-list');
        const newsStatusElement = document.getElementById('news-status');
        const newsUpdatedElement = document.getElementById('news-updated');
        if (!newsListElement || !newsStatusElement || !newsUpdatedElement) return;

        const REFRESH_INTERVAL_MS = 12 * 60 * 1000;
        const CACHE_TTL_MS = 20 * 60 * 1000;
        const MAX_ITEMS = 8;
        const MAX_PER_TOPIC = 2;
        const CACHE_KEY = 'che110_live_news_v3';

        // ── Topic keyword matcher ─────────────────────────────────────────────
        const topicDefinitions = [
            { label: 'Electric Vehicles', keywords: ['electric vehicle', ' ev ', 'evs', 'battery electric', 'bev', 'charging station', 'tata nexon', 'ola electric', 'ather', 'e-scooter', 'e-bus'] },
            { label: 'Ethanol & Biofuels', keywords: ['ethanol', 'biofuel', 'blending', 'e20', 'molasses', 'flex fuel', 'sugarcane'] },
            { label: 'Green Hydrogen', keywords: ['green hydrogen', 'hydrogen fuel', 'electrolyser', 'fuel cell', 'mnre hydrogen', 'h2'] },
            { label: 'Rail Electrification', keywords: ['rail electrif', 'indian railways', 'railway electr', 'vande bharat', 'metro rail'] },
            { label: 'Transport Emissions', keywords: ['transport emission', 'vehicular emission', 'air pollution', 'pm2.5', 'co2 emission', 'carbon emission', 'decarboni'] },
            { label: 'Policy & Industry', keywords: ['fame scheme', 'mnre', 'morth', 'niti aayog', 'renewable energy policy', 'ev policy', 'clean energy', 'net zero', 'sustainability'] }
        ];

        // ── Curated RSS feeds — all CORS-accessible via rss2json free tier ────
        // Primary: NewsData.io public RSS (no key needed for RSS endpoint)
        // Secondary: Economic Times, Business Standard, Hindu BusinessLine RSS
        // These resolve to real article URLs, not Google redirect URLs.
        const feedConfigs = [
            {
                url: 'https://economictimes.indiatimes.com/industry/renewables/rssfeeds/13357270.cms',
                sourceName: 'Economic Times'
            },
            {
                url: 'https://www.business-standard.com/rss/home_page_top_stories.rss',
                sourceName: 'Business Standard'
            },
            {
                url: 'https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss',
                sourceName: 'The Hindu'
            },
            {
                url: 'https://feeds.feedburner.com/Pymnts',           // fallback general tech feed
                sourceName: 'PYMNTS'
            },
            {
                url: 'https://www.livemint.com/rss/companies',
                sourceName: 'Livemint'
            }
        ];

        // ── Curated fallback cards (shown when all live feeds fail) ───────────
        const fallbackNews = [
            { title: 'India targets 30% EV sales share by 2030 under National EV Policy', url: 'https://economictimes.indiatimes.com/topic/national-electric-mobility-mission', publishedAt: '', sourceName: 'Economic Times', topic: 'Electric Vehicles' },
            { title: 'MNRE Green Hydrogen Mission: 5 MTPA production target by 2030', url: 'https://mnre.gov.in/green-hydrogen-mission/', publishedAt: '', sourceName: 'MNRE', topic: 'Green Hydrogen' },
            { title: 'Indian Railways achieves 100% broad-gauge electrification', url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=1944980', publishedAt: '', sourceName: 'PIB India', topic: 'Rail Electrification' },
            { title: 'Ethanol blending crosses 12% milestone; E20 target by 2025-26', url: 'https://mopng.gov.in/en/refining/bio-fuel', publishedAt: '', sourceName: 'MoPNG', topic: 'Ethanol & Biofuels' },
            { title: "India's transport sector CO\u2082 emissions: IEA analysis 2024", url: 'https://www.iea.org/countries/india', publishedAt: '', sourceName: 'IEA', topic: 'Transport Emissions' },
            { title: 'FAME-II scheme: Over 7,400 electric buses sanctioned across India', url: 'https://heavyindustries.gov.in/fame-india-phase-ii', publishedAt: '', sourceName: 'Ministry of Heavy Industries', topic: 'Policy & Industry' },
            { title: 'CEEW: Clean transport investment surge in India 2024', url: 'https://www.ceew.in/publications', publishedAt: '', sourceName: 'CEEW', topic: 'Policy & Industry' },
            { title: 'Air quality improvement linked to EV uptake in Indian cities: IQAir', url: 'https://www.iqair.com/world-air-quality-report', publishedAt: '', sourceName: 'IQAir', topic: 'Transport Emissions' }
        ];

        let lastFetchTimestamp = 0;

        // ── Helpers ───────────────────────────────────────────────────────────
        const extractDomain = (url) => {
            try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
            catch { return ''; }
        };

        const inferTopic = (text) => {
            const t = (' ' + text + ' ').toLowerCase();
            for (const def of topicDefinitions) {
                if (def.keywords.some(kw => t.includes(kw))) return def.label;
            }
            return 'Policy & Industry';
        };

        const formatTime = (isoValue) => {
            if (!isoValue) return '';
            const d = new Date(isoValue);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        };

        const loadCachedNews = () => {
            try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (!raw) return null;
                const c = JSON.parse(raw);
                if (!c || !Array.isArray(c.items) || !c.savedAt) return null;
                if (Date.now() - c.savedAt > CACHE_TTL_MS) return null;
                return c;
            } catch { return null; }
        };

        const saveCachedNews = (items) => {
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items })); }
            catch { /* storage full — ignore */ }
        };

        // ── Render ────────────────────────────────────────────────────────────
        const renderNewsItems = (items) => {
            newsListElement.innerHTML = '';
            if (!items.length) {
                newsListElement.innerHTML = '<p class="news-meta" style="padding:8px 0">No articles found right now.</p>';
                return;
            }
            items.forEach((item) => {
                const art = document.createElement('article');
                art.className = 'news-item';

                const badge = document.createElement('span');
                badge.className = 'news-topic';
                badge.textContent = item.topic;

                const h4 = document.createElement('h4');
                const a = document.createElement('a');
                a.href = item.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = item.title;
                h4.appendChild(a);

                const meta = document.createElement('p');
                meta.className = 'news-meta';
                const ts = formatTime(item.publishedAt);
                meta.textContent = ts ? `${item.sourceName} • ${ts}` : item.sourceName;

                art.appendChild(badge);
                art.appendChild(h4);
                art.appendChild(meta);
                newsListElement.appendChild(art);
            });
        };

        const setStatus = (message, updatedAt) => {
            newsStatusElement.textContent = message;
            newsUpdatedElement.textContent = updatedAt ? `Last updated: ${formatTime(updatedAt)}` : '';
        };

        const withTimeout = (promise, ms) => {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), ms);
            return Promise.race([promise, new Promise((_, rej) => ctrl.signal.addEventListener('abort', () => rej(new Error('timeout'))))])
                .finally(() => clearTimeout(tid));
        };

        // ── Fetch a single RSS feed via rss2json proxy ────────────────────────
        const fetchOneFeed = async ({ url, sourceName }) => {
            const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=15`;
            try {
                const res = await withTimeout(fetch(endpoint), 9000);
                if (!res.ok) return [];
                const data = await res.json();
                if (data.status !== 'ok' || !Array.isArray(data.items)) return [];
                return data.items
                    .filter(it => it.link && it.title)
                    .map(it => {
                        const combined = `${it.title} ${it.description || ''}`;
                        const topic = inferTopic(combined);
                        return {
                            title: it.title.trim(),
                            url: it.link,
                            publishedAt: it.pubDate || '',
                            sourceName: it.author || sourceName,
                            sourceDomain: extractDomain(it.link),
                            topic
                        };
                    });
            } catch { return []; }
        };

        // ── Curate: dedupe, sort newest-first, cap per topic ──────────────────
        const curateItems = (items) => {
            // Only keep items with a live URL (don't require trusted domain —
            // article URLs from ET/BS/Hindu are fine; filter junk by topic match)
            const seen = new Set();
            const deduped = items.filter(it => {
                if (!it.url || !it.title || it.url.includes('google.com/url')) return false;
                const key = it.url.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            deduped.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

            const topicCount = new Map();
            const result = [];
            for (const item of deduped) {
                const n = topicCount.get(item.topic) || 0;
                if (n >= MAX_PER_TOPIC) continue;
                result.push(item);
                topicCount.set(item.topic, n + 1);
                if (result.length >= MAX_ITEMS) break;
            }
            return result;
        };

        // ── Main fetch + render cycle ─────────────────────────────────────────
        const fetchAndRenderNews = async () => {
            const results = await Promise.allSettled(feedConfigs.map(fetchOneFeed));
            const allItems = results
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => r.value);

            const curated = curateItems(allItems);
            if (curated.length >= 2) {
                renderNewsItems(curated);
                saveCachedNews(curated);
                setStatus('Live updates', new Date().toISOString());
                lastFetchTimestamp = Date.now();
                return;
            }

            // Try stale cache before giving up
            const cached = loadCachedNews();
            if (cached) {
                renderNewsItems(cached.items);
                setStatus('Recent updates (cached)', new Date(cached.savedAt).toISOString());
                return;
            }

            // Last resort: curated fallback links
            renderNewsItems(fallbackNews);
            setStatus('Reference links (live feed unavailable)', new Date().toISOString());
        };

        // ── Boot: show cache immediately, then refresh in background ─────────
        const boot = () => {
            // Clear any old-format cache keys
            ['che110_live_news_cache_v1', 'che110_live_news_cache_v2'].forEach(k => {
                try { localStorage.removeItem(k); } catch { /* ignore */ }
            });

            const cached = loadCachedNews();
            if (cached) {
                renderNewsItems(cached.items);
                setStatus('Recent updates (cached)', new Date(cached.savedAt).toISOString());
            } else {
                setStatus('Loading latest news…', '');
            }
            fetchAndRenderNews();
        };

        boot();
        setInterval(fetchAndRenderNews, REFRESH_INTERVAL_MS);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            if (Date.now() - lastFetchTimestamp >= REFRESH_INTERVAL_MS) fetchAndRenderNews();
        });

        // ── Hide sidebar when footer is visible ───────────────────────────────
        const sidebarElement = document.querySelector('.news-sidebar');
        const footerElement = document.getElementById('references');
        if (sidebarElement && footerElement) {
            new IntersectionObserver(entries => {
                sidebarElement.classList.toggle('footer-visible', entries[0].isIntersecting);
            }, { threshold: 0.12 }).observe(footerElement);
        }

        // ── Mobile close / reopen ─────────────────────────────────────────────
        const closeBtn = document.getElementById('news-close-btn');

        // Create reopen pill dynamically
        const reopenBtn = document.createElement('button');
        reopenBtn.className = 'news-reopen-btn';
        reopenBtn.id = 'news-reopen-btn';
        reopenBtn.setAttribute('aria-label', 'Show news panel');
        reopenBtn.innerHTML = '&#128240; Live News';
        document.body.appendChild(reopenBtn);

        const isMobile = () => window.innerWidth <= 768;

        if (closeBtn && sidebarElement) {
            closeBtn.addEventListener('click', () => {
                if (!isMobile()) return;
                sidebarElement.classList.add('dismissed');
                reopenBtn.style.display = 'flex';
                sessionStorage.setItem('newsDismissed', '1');
            });

            reopenBtn.addEventListener('click', () => {
                sidebarElement.classList.remove('dismissed');
                reopenBtn.style.display = 'none';
                sessionStorage.removeItem('newsDismissed');
                sidebarElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            // Restore dismissed state on page load
            if (isMobile() && sessionStorage.getItem('newsDismissed')) {
                sidebarElement.classList.add('dismissed');
                reopenBtn.style.display = 'flex';
            }

            // Reset when resizing back to desktop
            window.addEventListener('resize', () => {
                if (!isMobile()) {
                    sidebarElement.classList.remove('dismissed');
                    reopenBtn.style.display = 'none';
                }
            });
        }
    };

    // ===== PROGRESS BAR =====
    const progressBar = document.getElementById('progress-bar');

    // ===== SCROLL REVEAL =====
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // ===== BACKGROUND LAYER CROSSFADE ON SCROLL =====
    // Skipped entirely on mobile — bg-layers is hidden via CSS
    const bgLayers = Array.from(document.querySelectorAll('.bg-layer'));
    const bgLayerMap = new Map(bgLayers.map(layer => [layer.dataset.for, layer]));
    const trackedSections = Array.from(document.querySelectorAll('.section-block, .site-footer[id]'));
    let currentBg = null;
    let bgZIndex = 1;

    const setActiveBg = (sectionId) => {
        if (!sectionId || sectionId === currentBg || !bgLayerMap.has(sectionId)) return;
        const targetLayer = bgLayerMap.get(sectionId);
        currentBg = sectionId;
        bgLayers.forEach(layer => {
            if (layer === targetLayer) {
                layer.style.zIndex = String(++bgZIndex);
                layer.classList.add('active');
            } else {
                layer.classList.remove('active');
            }
        });
    };

    const updateBgFromViewport = () => {
        const activationLine = window.innerHeight * 0.32;
        let candidateSection = null;
        let fallbackSection = null;
        let minTop = Infinity;
        trackedSections.forEach(section => {
            const sectionId = section.id;
            if (!bgLayerMap.has(sectionId)) return;
            const rect = section.getBoundingClientRect();
            if (rect.top <= activationLine && rect.bottom >= activationLine) candidateSection = section;
            if (rect.top >= 0 && rect.top < minTop) { minTop = rect.top; fallbackSection = section; }
        });
        if (candidateSection) setActiveBg(candidateSection.id);
        else if (fallbackSection) setActiveBg(fallbackSection.id);
    };

    const onMobile = window.innerWidth <= 768;

    if (!onMobile) {
        // Only run bg crossfade on desktop
        const bgObserver = new IntersectionObserver(() => {
            updateBgFromViewport();
        }, { threshold: [0, 0.08, 0.2, 0.35], rootMargin: '-5% 0px -60% 0px' });
        trackedSections.forEach(section => bgObserver.observe(section));

        const initialSection = window.location.hash ? window.location.hash.slice(1) : 'hero';
        setActiveBg(initialSection);
        updateBgFromViewport();
    }

    // ===== SINGLE MERGED SCROLL LISTENER (passive + rAF throttled) =====
    const navbar = document.querySelector('.navbar');
    let scrollTicking = false;

    window.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;

            // Progress bar
            if (progressBar) progressBar.style.width = (scrollTop / docHeight) * 100 + '%';

            // Navbar shadow
            if (navbar) navbar.style.boxShadow = scrollTop > 30 ? '0 2px 12px rgba(60,50,30,0.08)' : 'none';

            // Background crossfade — desktop only
            if (!onMobile) updateBgFromViewport();

            scrollTicking = false;
        });
    }, { passive: true });

    if (!onMobile) window.addEventListener('resize', updateBgFromViewport);

    // ===== HAMBURGER MENU =====
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            hamburger.classList.toggle('open', isOpen);
            hamburger.setAttribute('aria-expanded', isOpen);
        });
        // Close when any nav link is tapped
        navLinks.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                navLinks.classList.remove('open');
                hamburger.classList.remove('open');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ===== LAZY-LOAD BACKGROUND IMAGES (mobile performance) =====
    // On mobile, delay loading of bg images until their section is near viewport
    const isMobileDevice = () => window.innerWidth <= 768;
    const bgLayerNodes = document.querySelectorAll('.bg-layer[data-for]');

    if (isMobileDevice()) {
        // Swap to smaller images on mobile (800px wide instead of 1920px)
        bgLayerNodes.forEach(layer => {
            const orig = layer.style.backgroundImage;
            if (!orig) return;
            // Unsplash: add w=800&q=70
            const smaller = orig
                .replace(/w=1920/g, 'w=800')
                .replace(/q=80/g, 'q=65')
                // picsum: replace /1920/1080 with /800/600
                .replace(/picsum\.photos\/id\/(\d+)\/1920\/1080/g, 'picsum.photos/id/$1/800/600');
            layer.style.backgroundImage = smaller;
        });
    }

    // ===== SMOOTH SCROLL FOR NAV =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // ===== CO₂ PROJECTIONS LINE CHART =====
    const ctx = document.getElementById('co2Chart');
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2020', '2025', '2030', '2035', '2040', '2045', '2050', '2060', '2070'],
                datasets: [
                    {
                        label: 'Business-As-Usual (BAU)',
                        data: [100, 112, 128, 148, 165, 185, 200, 230, 260],
                        borderColor: '#8b6f47',
                        backgroundColor: 'rgba(139, 111, 71, 0.08)',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#8b6f47'
                    },
                    {
                        label: 'Accelerated Renewable Adoption',
                        data: [100, 105, 92, 75, 55, 35, 20, 8, 2],
                        borderColor: '#3e5432',
                        backgroundColor: 'rgba(62, 84, 50, 0.1)',
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#3e5432'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: "'Inter', sans-serif", size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'CO₂ Emissions Index', font: { family: "'Inter', sans-serif" } },
                        grid: { color: 'rgba(0,0,0,0.06)' },
                        ticks: { font: { family: "'Inter', sans-serif" } }
                    },
                    x: {
                        title: { display: true, text: 'Year', font: { family: "'Inter', sans-serif" } },
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif" } }
                    }
                }
            }
        });
    }

    initializeNewsSidebar();

});
