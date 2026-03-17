// ============================================
// MMK Accountants - Premium Interactive JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const API_BASE = (() => {
        if (window.MMK_API_BASE) return window.MMK_API_BASE;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:4000/api/v1';
        }
        return '/api/v1';
    })();

    // --- Preloader ---
    const preloader = document.getElementById('preloader');
    const hidePreloader = () => setTimeout(() => preloader.classList.add('loaded'), 800);
    window.addEventListener('load', hidePreloader);
    setTimeout(hidePreloader, 3500);

    // --- Custom Cursor ---
    if (!isMobile && !prefersReducedMotion) {
        const cursor = document.getElementById('cursor');
        const follower = document.getElementById('cursorFollower');
        let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.left = mouseX + 'px';
            cursor.style.top = mouseY + 'px';
        });

        const updateFollower = () => {
            followerX += (mouseX - followerX) * 0.12;
            followerY += (mouseY - followerY) * 0.12;
            follower.style.left = followerX + 'px';
            follower.style.top = followerY + 'px';
            requestAnimationFrame(updateFollower);
        };
        updateFollower();

        const hoverElements = document.querySelectorAll('a, button, .service-card, .specialist-item, .testimonial-card');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hover');
                follower.classList.add('hover');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hover');
                follower.classList.remove('hover');
            });
        });
    }

    // --- Header scroll + Top bar hide ---
    const header = document.getElementById('header');
    const backToTop = document.getElementById('backToTop');
    const topBar = document.getElementById('topBar');
    const isInnerPage = document.body.classList.contains('page-inner');
    let lastScrollY = 0;

    const onScroll = () => {
        const scrollY = window.scrollY;
        const scrollingDown = scrollY > lastScrollY;

        // Hide top bar when scrolling down past it
        if (topBar) {
            if (scrollY > 40) {
                topBar.classList.add('hidden');
            } else {
                topBar.classList.remove('hidden');
            }
        }

        header.classList.toggle('scrolled', isInnerPage || scrollY > 80);
        backToTop.classList.toggle('visible', scrollY > 600);

        // Scroll progress for back-to-top circle
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(scrollY / docHeight, 1);
        backToTop.style.setProperty('--scroll-progress', progress);

        lastScrollY = scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // --- Mobile menu ---
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // --- Dynamic active nav (shared nav via build system) ---
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
            const parentDropdown = link.closest('.has-dropdown');
            if (parentDropdown) {
                const parentLink = parentDropdown.querySelector(':scope > a');
                if (parentLink && parentLink !== link) parentLink.classList.add('active');
            }
        }
    });

    // --- Request a Quote Modal ---
    const quoteBtn = document.getElementById('quoteBtn');
    const quoteModal = document.getElementById('quoteModal');
    const modalClose = document.getElementById('modalClose');
    if (quoteBtn && quoteModal) {
        const openModal = () => {
            quoteModal.style.display = 'flex';
            requestAnimationFrame(() => {
                quoteModal.classList.add('active');
            });
            document.body.style.overflow = 'hidden';
        };
        const closeModal = () => {
            quoteModal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => { quoteModal.style.display = 'none'; }, 400);
        };
        quoteBtn.addEventListener('click', openModal);
        if (modalClose) modalClose.addEventListener('click', closeModal);
        quoteModal.addEventListener('click', (e) => { if (e.target === quoteModal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && quoteModal.classList.contains('active')) closeModal(); });
    }
    // Quote form submission
    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = quoteForm.querySelector('button[type="submit"]');
            const origText = btn.innerHTML;
            btn.innerHTML = '<span class="btn-text">Sending...</span>';
            btn.disabled = true;

            const formData = new FormData(quoteForm);
            const data = Object.fromEntries(formData.entries());

            try {
                await apiPost('/inquiries/quote', data);
                btn.innerHTML = '<span class="btn-text">Quote Requested!</span>';
                setTimeout(() => {
                    quoteForm.reset();
                    btn.innerHTML = origText;
                    btn.disabled = false;
                    if (quoteModal) { quoteModal.classList.remove('active'); document.body.style.overflow = ''; }
                }, 1500);
            } catch (error) {
                showInlineMessage(quoteForm, error.message || 'Unable to submit your request. Please try again.', 'error');
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        });
    }

    // --- Hero reveal animations ---
    setTimeout(() => {
        document.querySelectorAll('.reveal-text').forEach(el => {
            const delay = parseFloat(el.dataset.delay || 0);
            el.style.setProperty('--reveal-delay', delay + 's');
            setTimeout(() => el.classList.add('revealed'), delay * 1000 + 100);
        });
        document.querySelectorAll('.reveal-fade').forEach(el => {
            const delay = parseFloat(el.dataset.delay || 0);
            el.style.transitionDelay = delay + 's';
            setTimeout(() => el.classList.add('revealed'), 100);
        });
    }, 1200);

    // --- Scroll animations (staggered) ---
    const animItems = document.querySelectorAll('.anim-item');
    const animObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Find siblings for stagger
                const parent = entry.target.parentElement;
                const siblings = parent.querySelectorAll('.anim-item');
                let index = 0;
                siblings.forEach((sib, i) => { if (sib === entry.target) index = i; });
                const staggerDelay = index * 0.08;
                entry.target.style.transitionDelay = staggerDelay + 's';
                entry.target.classList.add('visible');
                animObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    animItems.forEach(el => animObserver.observe(el));

    // --- Animated counters (CountUp.js with scroll-spy) ---
    const animateCounterGroup = (container) => {
        if (container.dataset.animated) return;
        container.dataset.animated = 'true';
        const counters = container.querySelectorAll('.stat-number, .stats-number');
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.count, 10);
            if (typeof countUp !== 'undefined' && countUp.CountUp) {
                const cu = new countUp.CountUp(counter, target, {
                    startVal: 0,
                    duration: 2.5,
                    useEasing: true,
                    useGrouping: true,
                    separator: ',',
                });
                if (!cu.error) cu.start();
            } else {
                // Fallback if CountUp.js didn't load
                const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
                const duration = 2200;
                const startTime = performance.now();
                const update = (now) => {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    counter.textContent = Math.round(target * easeOutQuart(progress));
                    if (progress < 1) requestAnimationFrame(update);
                };
                requestAnimationFrame(update);
            }
        });
    };
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) animateCounterGroup(e.target); });
    }, { threshold: 0.5 });
    document.querySelectorAll('.hero-stats, .stats-grid').forEach(el => statsObserver.observe(el));

    // --- Particles ---
    if (!isMobile && !prefersReducedMotion) {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) { /* skip on inner pages */ }
        else for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (8 + Math.random() * 12) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            p.style.width = (2 + Math.random() * 3) + 'px';
            p.style.height = p.style.width;
            p.style.opacity = 0.2 + Math.random() * 0.4;
            particlesContainer.appendChild(p);
        }
    }

    // --- Marquee clone for infinite loop ---
    const marqueeTrack = document.getElementById('marqueeTrack');
    if (marqueeTrack) {
        const content = marqueeTrack.querySelector('.marquee-content');
        const clone = content.cloneNode(true);
        marqueeTrack.appendChild(clone);
    }

    // --- Tilt effect on cards ---
    if (!isMobile && !prefersReducedMotion) {
        document.querySelectorAll('[data-tilt]').forEach(card => {
            const intensity = parseInt(card.dataset.tiltIntensity || 8, 10);
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -intensity;
                const rotateY = ((x - centerX) / centerX) * intensity;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
                setTimeout(() => { card.style.transition = ''; }, 600);
            });
        });
    }


    // --- Parallax on scroll ---
    if (!isMobile && !prefersReducedMotion) {
        const parallaxEls = document.querySelectorAll('[data-parallax]');
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    parallaxEls.forEach(el => {
                        const speed = parseFloat(el.dataset.parallax);
                        el.style.transform = `translateY(${scrollY * speed}px)`;
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // --- Contact form ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            if (!data.name || !data.email || !data.message) {
                showFormMessage('Please fill in all required fields.', 'error');
                return;
            }
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const original = submitBtn.innerHTML;
            submitBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/></svg><span class="btn-text">Sending...</span>';
            submitBtn.disabled = true;

            try {
                await apiPost('/inquiries/contact', data);
                showFormMessage("Thank you! We'll be in touch within 2 hours.", 'success');
                contactForm.reset();
                submitBtn.innerHTML = original;
                submitBtn.disabled = false;
            } catch (error) {
                showFormMessage(error.message || 'Unable to send your message right now. Please try again shortly.', 'error');
                submitBtn.innerHTML = original;
                submitBtn.disabled = false;
            }
        });
    }

    async function apiPost(path, payload) {
        const response = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const body = await response.json().catch(() => null);
        if (!response.ok || !body || body.success === false) {
            throw new Error(body?.error?.message || 'Request failed');
        }
        return body;
    }

    function showInlineMessage(form, message, type) {
        const existing = form.querySelector('.form-message');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'form-message';
        el.textContent = message;
        Object.assign(el.style, {
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '0.9rem',
            fontWeight: '500',
            animation: 'fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1)',
            ...(type === 'success'
                ? { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }
                : { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }
            )
        });

        const heading = form.querySelector('h3');
        if (heading) {
            heading.insertAdjacentElement('afterend', el);
        } else {
            form.prepend(el);
        }

        setTimeout(() => {
            el.style.animation = 'fadeSlideOut 0.4s forwards';
            setTimeout(() => el.remove(), 400);
        }, 5000);
    }

    function showFormMessage(message, type) {
        showInlineMessage(contactForm, message, type);
    }

    // --- Back to Top ---
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Smooth anchor scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- Dynamic styles ---
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);

    // --- Newsletter form ---
    document.querySelectorAll('.newsletter-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const btn = form.querySelector('button');
            const email = emailInput.value;

            if (!email) return;

            const originalText = btn.textContent;
            btn.textContent = 'Subscribing...';
            btn.disabled = true;

            try {
                await apiPost('/newsletter/subscribe', {
                    email,
                    sourcePage: window.location.pathname
                });

                btn.textContent = 'Subscribed!';
                btn.style.background = '#34d399';
                emailInput.value = '';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            } catch (error) {
                btn.textContent = 'Try Again';
                btn.style.background = '#ef4444';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            }
        });
    });
});

// ============================================
// Tax Calculators & Tools
// ============================================

function formatCurrency(amount) {
    return '£' + amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Chart.js helper ---
const chartInstances = {};
function renderDoughnut(canvasId, labels, data, colors) {
    if (typeof Chart === 'undefined') return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    // Filter out zero values
    const filtered = labels.reduce((acc, label, i) => {
        if (data[i] > 0) { acc.labels.push(label); acc.data.push(data[i]); acc.colors.push(colors[i]); }
        return acc;
    }, { labels: [], data: [], colors: [] });
    if (filtered.data.length === 0) return;
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: filtered.labels,
            datasets: [{ data: filtered.data, backgroundColor: filtered.colors, borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, pointStyleWidth: 10, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } } },
                tooltip: {
                    callbacks: { label: (ctx) => ctx.label + ': ' + formatCurrency(ctx.parsed) },
                    bodyFont: { family: "'Plus Jakarta Sans', sans-serif" }
                }
            },
            animation: { animateRotate: true, duration: 800 }
        }
    });
}

// --- Income Tax Calculator ---
function calculateIncomeTax() {
    const income = parseFloat(document.getElementById('annualIncome').value) || 0;
    const taxCode = document.getElementById('taxCode').value;

    let personalAllowance = 12570;
    if (taxCode === 'blind') personalAllowance = 15450;
    if (taxCode === 'none') personalAllowance = 0;

    // Taper PA for income over 100k
    if (income > 100000 && taxCode !== 'none') {
        personalAllowance = Math.max(0, personalAllowance - ((income - 100000) / 2));
    }

    const taxableIncome = Math.max(0, income - personalAllowance);

    // 2025/26 bands
    const basicLimit = 37700;
    const higherLimit = 125140 - 12570; // effective higher rate band

    let basicTax = 0, higherTax = 0, additionalTax = 0;

    if (taxableIncome > 0) {
        const basicIncome = Math.min(taxableIncome, basicLimit);
        basicTax = basicIncome * 0.20;

        if (taxableIncome > basicLimit) {
            const higherIncome = Math.min(taxableIncome - basicLimit, higherLimit - basicLimit);
            higherTax = Math.max(0, higherIncome) * 0.40;
        }

        if (taxableIncome > (125140 - personalAllowance)) {
            const additionalIncome = taxableIncome - (125140 - personalAllowance);
            additionalTax = Math.max(0, additionalIncome) * 0.45;
            // Recalculate higher rate
            const higherIncome = Math.min(taxableIncome, 125140 - personalAllowance) - basicLimit;
            higherTax = Math.max(0, higherIncome) * 0.40;
        }
    }

    const totalTax = basicTax + higherTax + additionalTax;
    const effectiveRate = income > 0 ? ((totalTax / income) * 100).toFixed(1) : '0.0';
    const takeHome = income - totalTax;

    document.getElementById('itPersonalAllowance').textContent = formatCurrency(personalAllowance);
    document.getElementById('itBasicRate').textContent = formatCurrency(basicTax);
    document.getElementById('itHigherRate').textContent = formatCurrency(higherTax);
    document.getElementById('itAdditionalRate').textContent = formatCurrency(additionalTax);
    document.getElementById('itTotalTax').textContent = formatCurrency(totalTax);
    document.getElementById('itEffectiveRate').textContent = effectiveRate + '%';
    document.getElementById('itTakeHome').textContent = formatCurrency(takeHome);

    document.getElementById('incomeTaxResults').style.display = 'block';

    renderDoughnut('itChart',
        ['Take-Home Pay', 'Basic Rate (20%)', 'Higher Rate (40%)', 'Additional Rate (45%)'],
        [takeHome, basicTax, higherTax, additionalTax],
        ['#34d399', '#0ea5e9', '#f59e0b', '#ef4444']
    );
}

// --- National Insurance Calculator ---
function calculateNI() {
    const salary = parseFloat(document.getElementById('niSalary').value) || 0;
    const category = document.getElementById('niCategory').value;

    // 2025/26 thresholds
    const primaryThreshold = 12570;
    const upperEarningsLimit = 50270;
    const secondaryThreshold = 5000;

    let employeeNI = 0;
    let employerNI = 0;

    // Employee NI
    if (salary > primaryThreshold) {
        const mainBand = Math.min(salary, upperEarningsLimit) - primaryThreshold;
        employeeNI = mainBand * 0.08;

        if (salary > upperEarningsLimit) {
            employeeNI += (salary - upperEarningsLimit) * 0.02;
        }
    }

    // Employer NI
    if (salary > secondaryThreshold) {
        employerNI = (salary - secondaryThreshold) * 0.138;
    }

    // Category H/M: employer NI only on earnings above UEL
    if (category === 'H' || category === 'M') {
        employerNI = salary > upperEarningsLimit ? (salary - upperEarningsLimit) * 0.138 : 0;
    }

    document.getElementById('niThreshold').textContent = formatCurrency(primaryThreshold);
    document.getElementById('niEmployee').textContent = formatCurrency(employeeNI);
    document.getElementById('niEmployer').textContent = formatCurrency(employerNI);
    document.getElementById('niTotal').textContent = formatCurrency(employeeNI + employerNI);

    document.getElementById('niResults').style.display = 'block';

    const netPay = salary - employeeNI;
    renderDoughnut('niChart',
        ['Net Pay', 'Employee NI', 'Employer NI'],
        [netPay, employeeNI, employerNI],
        ['#34d399', '#0ea5e9', '#f59e0b']
    );
}

// --- VAT Calculator ---
function calculateVAT() {
    const amount = parseFloat(document.getElementById('vatAmount').value) || 0;
    const rate = parseFloat(document.getElementById('vatRate').value) / 100;
    const direction = document.querySelector('input[name="vatDirection"]:checked').value;

    let net, vat, gross;

    if (direction === 'add') {
        net = amount;
        vat = amount * rate;
        gross = amount + vat;
    } else {
        gross = amount;
        net = amount / (1 + rate);
        vat = gross - net;
    }

    document.getElementById('vatNet').textContent = formatCurrency(net);
    document.getElementById('vatVatAmount').textContent = formatCurrency(vat);
    document.getElementById('vatGross').textContent = formatCurrency(gross);

    document.getElementById('vatResults').style.display = 'block';
}

// --- Dividend Tax Calculator ---
function calculateDividendTax() {
    const otherIncome = parseFloat(document.getElementById('divSalary').value) || 0;
    const dividends = parseFloat(document.getElementById('divAmount').value) || 0;

    const personalAllowance = otherIncome > 100000
        ? Math.max(0, 12570 - ((otherIncome - 100000) / 2))
        : 12570;
    const dividendAllowance = 500;

    const totalIncome = otherIncome + dividends;
    const basicLimit = 50270;
    const higherLimit = 125140;

    // Where do dividends sit in the bands?
    const incomeBeforeDividends = otherIncome;
    const taxableDividends = Math.max(0, dividends - dividendAllowance);

    let basicDiv = 0, higherDiv = 0, additionalDiv = 0;

    if (taxableDividends > 0) {
        const usedBand = Math.max(0, incomeBeforeDividends - personalAllowance);
        const remainingBasic = Math.max(0, basicLimit - usedBand + personalAllowance - personalAllowance);
        const remainingBasicBand = Math.max(0, (50270) - incomeBeforeDividends);

        if (incomeBeforeDividends < basicLimit) {
            const basicAmount = Math.min(taxableDividends, remainingBasicBand);
            basicDiv = basicAmount * 0.0875;

            const remaining = taxableDividends - basicAmount;
            if (remaining > 0) {
                const higherAmount = Math.min(remaining, higherLimit - basicLimit);
                higherDiv = higherAmount * 0.3375;

                const addlRemaining = remaining - higherAmount;
                if (addlRemaining > 0) {
                    additionalDiv = addlRemaining * 0.3935;
                }
            }
        } else if (incomeBeforeDividends < higherLimit) {
            const higherAmount = Math.min(taxableDividends, higherLimit - incomeBeforeDividends);
            higherDiv = higherAmount * 0.3375;

            const remaining = taxableDividends - higherAmount;
            if (remaining > 0) {
                additionalDiv = remaining * 0.3935;
            }
        } else {
            additionalDiv = taxableDividends * 0.3935;
        }
    }

    const totalDivTax = basicDiv + higherDiv + additionalDiv;

    document.getElementById('divAllowance').textContent = formatCurrency(dividendAllowance);
    document.getElementById('divBasicRate').textContent = formatCurrency(basicDiv);
    document.getElementById('divHigherRate').textContent = formatCurrency(higherDiv);
    document.getElementById('divAdditionalRate').textContent = formatCurrency(additionalDiv);
    document.getElementById('divTotalTax').textContent = formatCurrency(totalDivTax);

    document.getElementById('dividendResults').style.display = 'block';

    const netDividend = dividends - totalDivTax;
    renderDoughnut('divChart',
        ['Net Dividends', 'Basic Rate (8.75%)', 'Higher Rate (33.75%)', 'Additional Rate (39.35%)'],
        [netDividend, basicDiv, higherDiv, additionalDiv],
        ['#34d399', '#0ea5e9', '#f59e0b', '#ef4444']
    );
}

// --- Corporation Tax Calculator ---
function calculateCorpTax() {
    const profits = parseFloat(document.getElementById('corpProfits').value) || 0;
    const associated = parseInt(document.getElementById('corpAssociated').value) || 0;

    const divisor = associated + 1;
    const lowerLimit = 50000 / divisor;
    const upperLimit = 250000 / divisor;

    let tax = 0;
    let relief = 0;
    let rate = '';

    if (profits <= lowerLimit) {
        tax = profits * 0.19;
        rate = '19% (Small Profits)';
    } else if (profits >= upperLimit) {
        tax = profits * 0.25;
        rate = '25% (Main Rate)';
    } else {
        // Marginal relief
        tax = profits * 0.25;
        relief = (upperLimit - profits) * (profits / profits) * (3 / 200);
        tax -= relief;
        rate = 'Marginal Relief';
    }

    const effective = profits > 0 ? ((tax / profits) * 100).toFixed(2) : '0.00';

    document.getElementById('corpRate').textContent = rate;
    document.getElementById('corpRelief').textContent = formatCurrency(relief);
    document.getElementById('corpTax').textContent = formatCurrency(tax);
    document.getElementById('corpEffective').textContent = effective + '%';

    document.getElementById('corpTaxResults').style.display = 'block';

    const afterTax = profits - tax;
    renderDoughnut('corpChart',
        ['After-Tax Profit', 'Corporation Tax', 'Marginal Relief'],
        [afterTax, tax, relief],
        ['#34d399', '#0ea5e9', '#f59e0b']
    );
}

// --- SDLT Calculator ---
function calculateSDLT() {
    const price = parseFloat(document.getElementById('sdltPrice').value) || 0;
    const type = document.getElementById('sdltType').value;

    let bands, surcharge = 0;

    if (type === 'ftb' && price <= 625000) {
        bands = [
            { limit: 425000, rate: 0 },
            { limit: 625000, rate: 0.05 },
        ];
    } else if (type === 'additional') {
        bands = [
            { limit: 250000, rate: 0.05 },
            { limit: 925000, rate: 0.10 },
            { limit: 1500000, rate: 0.15 },
            { limit: Infinity, rate: 0.17 },
        ];
    } else {
        bands = [
            { limit: 250000, rate: 0 },
            { limit: 925000, rate: 0.05 },
            { limit: 1500000, rate: 0.10 },
            { limit: Infinity, rate: 0.12 },
        ];
    }

    let totalSDLT = 0;
    let prev = 0;
    const breakdown = [];

    for (const band of bands) {
        if (price <= prev) break;
        const taxableInBand = Math.min(price, band.limit) - prev;
        const taxInBand = taxableInBand * band.rate;
        totalSDLT += taxInBand;
        if (taxableInBand > 0) {
            breakdown.push({
                from: prev, to: Math.min(price, band.limit),
                rate: (band.rate * 100).toFixed(0) + '%',
                tax: taxInBand
            });
        }
        prev = band.limit;
    }

    const effectiveRate = price > 0 ? ((totalSDLT / price) * 100).toFixed(2) : '0.00';

    document.getElementById('sdltTotal').textContent = formatCurrency(totalSDLT);
    document.getElementById('sdltEffective').textContent = effectiveRate + '%';

    // Build breakdown table
    let html = '<table><thead><tr><th>Band</th><th>Rate</th><th>Tax</th></tr></thead><tbody>';
    breakdown.forEach(b => {
        html += `<tr><td>${formatCurrency(b.from)} – ${formatCurrency(b.to)}</td><td>${b.rate}</td><td>${formatCurrency(b.tax)}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('sdltBreakdown').innerHTML = html;

    document.getElementById('sdltResults').style.display = 'block';
}

// --- Company Search ---
function searchCompany(event) {
    const query = document.getElementById('companySearch').value.trim();
    if (query) {
        event.preventDefault();
        const url = 'https://find-and-update.company-information.service.gov.uk/search?q=' + encodeURIComponent(query);
        window.open(url, '_blank', 'noopener');
    }
}

// --- VAT Number Check ---
function checkVAT(event) {
    const vatNum = document.getElementById('vatNumber').value.trim();
    if (vatNum) {
        event.preventDefault();
        window.open('https://www.tax.service.gov.uk/check-vat-number/enter-vat', '_blank', 'noopener');
    }
}

// --- MTD Readiness Check ---
function checkMTD() {
    const type = document.getElementById('mtdType').value;
    const turnover = parseFloat(document.getElementById('mtdTurnover').value) || 0;
    const statusDiv = document.getElementById('mtdStatus');
    let html = '';

    if (type === 'vat') {
        html = '<div class="mtd-status mtd-required"><h4>MTD for VAT — Already Required</h4><p>All VAT-registered businesses must already keep digital records and submit VAT returns through MTD-compatible software.</p><ul><li>Keep digital records using compatible software (e.g. Xero)</li><li>Submit VAT returns quarterly through your software</li><li>Ensure digital links between all parts of your records</li></ul><p><strong>Action:</strong> If you\'re not yet compliant, contact us immediately for help.</p></div>';
    } else if (type === 'sole' || type === 'landlord') {
        if (turnover > 50000) {
            html = '<div class="mtd-status mtd-required"><h4>MTD for Income Tax — Required from April 2026</h4><p>With income over £50,000, you will need to comply with MTD for Income Tax from <strong>6 April 2026</strong>.</p><ul><li>Keep digital records of all income and expenses</li><li>Submit quarterly updates to HMRC through compatible software</li><li>File a final declaration instead of a self-assessment return</li><li>Choose MTD-compatible software now (Xero, FreeAgent, etc.)</li></ul><p><strong>Action:</strong> Start preparing now. Contact us for help with the transition.</p></div>';
        } else if (turnover > 30000) {
            html = '<div class="mtd-status mtd-optional"><h4>MTD for Income Tax — Required from April 2027</h4><p>With income between £30,000 and £50,000, you will need to comply from <strong>6 April 2027</strong>.</p><ul><li>You have until April 2027, but preparing early is recommended</li><li>Consider moving to digital records and cloud software now</li><li>Quarterly updates will be required from April 2027</li></ul><p><strong>Action:</strong> Use the time to prepare. Contact us for advice on the best software.</p></div>';
        } else {
            html = '<div class="mtd-status mtd-ready"><h4>MTD for Income Tax — Not Yet Required</h4><p>With income under £30,000, you are not currently required to comply with MTD for Income Tax.</p><ul><li>Continue filing self-assessment returns as normal</li><li>MTD may be extended to lower income levels in future</li><li>Consider adopting digital records voluntarily for efficiency</li></ul></div>';
        }
    } else if (type === 'ltd') {
        html = '<div class="mtd-status mtd-ready"><h4>MTD for Corporation Tax — Not Yet Announced</h4><p>HMRC has not yet set a date for MTD for Corporation Tax. Limited companies continue to file CT600 returns as normal.</p><ul><li>Continue filing Corporation Tax returns within 12 months of your year end</li><li>If VAT-registered, you must comply with MTD for VAT</li><li>Keep digital records as best practice</li></ul></div>';
    }

    statusDiv.innerHTML = html;
    document.getElementById('mtdResults').style.display = 'block';
}
