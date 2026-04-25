document.addEventListener('DOMContentLoaded', function() {

    // ── ЗАЩИТА ОТ КОПИРОВАНИЯ ────────────────────────────────
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12') { e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && ['u','s','p'].indexOf(e.key.toLowerCase()) !== -1) {
            e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            var tag = document.activeElement.tagName.toLowerCase();
            var isPhoneLink = document.activeElement.classList.contains('phone-number');
            if (tag !== 'input' && tag !== 'textarea' && !isPhoneLink) {
                e.preventDefault();
            }
        }
    });
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'SVG') e.preventDefault();
    });

    console.log('%cВнимание!', 'color:red;font-size:30px;font-weight:bold;');
    console.log('%cДанный сайт защищён авторским правом ИП Балахеев Ю.Б.\nНесанкционированное копирование преследуется по закону.', 'font-size:14px;color:#333;');


    // ── АНИМАЦИИ ПРИ СКРОЛЛЕ ────────────────────────────────
    var animElements = document.querySelectorAll('.animate-on-scroll');
    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        animElements.forEach(function(el) { observer.observe(el); });
    } else {
        animElements.forEach(function(el) { el.classList.add('visible'); });
    }


    // ── СЧЁТЧИК ЦИФР ──────────────────────────────────────
    var countersStarted = false;
    var counterSection = document.querySelector('.counter-section');

    function animateCounters() {
        if (countersStarted) return;
        countersStarted = true;
        document.querySelectorAll('.counter-number').forEach(function(counter) {
            var target = parseInt(counter.getAttribute('data-target'));
            var duration = 2000;
            var startTime = null;
            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 3);
                counter.innerText = Math.floor(eased * target);
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    counter.innerText = target + '+';
                }
            }
            requestAnimationFrame(step);
        });
    }

    if (counterSection && 'IntersectionObserver' in window) {
        var counterObserver = new IntersectionObserver(function(entries) {
            if (entries[0].isIntersecting) {
                animateCounters();
                counterObserver.unobserve(counterSection);
            }
        }, { threshold: 0.3 });
        counterObserver.observe(counterSection);
    }


    // ── ШАПКА ПРИ СКРОЛЛЕ ─────────────────────────────────
    var header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });


    // ── КНОПКА НАВЕРХ ──────────────────────────────────────
    var scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 500) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        });
        scrollTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }


    // ── ГАМБУРГЕР-МЕНЮ ───────────────────────────────────────
    var hamburger = document.getElementById('hamburgerBtn');
    var navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
        navMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }


    // ── МАСКА ТЕЛЕФОНА ───────────────────────────────────────
    var phoneInput = document.getElementById('userPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            var x = e.target.value.replace(/\D/g, '');
            if (x.length > 0 && x[0] === '8') x = '7' + x.substring(1);
            if (x.length > 0 && x[0] !== '7') x = '7' + x;
            if (x.length > 11) x = x.substring(0, 11);
            var formatted = '';
            if (x.length > 0) formatted = '+7';
            if (x.length > 1) formatted += ' (' + x.substring(1, 4);
            if (x.length >= 4) formatted += ') ' + x.substring(4, 7);
            if (x.length >= 7) formatted += '-' + x.substring(7, 9);
            if (x.length >= 9) formatted += '-' + x.substring(9, 11);
            e.target.value = formatted;
        });
        phoneInput.addEventListener('focus', function() {
            if (!this.value) this.value = '+7';
        });
    }


    // ── ОТПРАВКА ФОРМ (все формы на странице) ────────────────
    var SEND_URL = '/send.php';
    var FORM_COOLDOWN = 5000;
    var formSubmitTimestamps = new WeakMap();

    // Каждая форма — timestamp рендера (для time-check на сервере)
    document.querySelectorAll('form').forEach(function(form) {
        form.dataset.ts = Math.floor(Date.now() / 1000).toString();
    });

    function showMessage(form, text, isError) {
        var success = form.querySelector('.form-success')
            || (form.closest('section, .hero, .modal') || document).querySelector('.form-success');
        if (!success) return;
        var original = success.dataset.original || success.textContent || '';
        if (!success.dataset.original) success.dataset.original = original;
        success.textContent = text;
        success.classList.toggle('error', !!isError);
        success.classList.add('show');
        setTimeout(function() {
            success.classList.remove('show');
            success.classList.remove('error');
            success.textContent = success.dataset.original;
        }, 5000);
    }

    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Клиентский cooldown
            var last = formSubmitTimestamps.get(form) || 0;
            if (Date.now() - last < FORM_COOLDOWN) return;
            formSubmitTimestamps.set(form, Date.now());

            var submitBtn = form.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Отправка...';
            }

            var formData = new FormData(form);
            formData.append('form_ts', form.dataset.ts || '');
            if (!formData.has('hp_field')) formData.append('hp_field', '');
            formData.append('page', document.title + ' (' + window.location.pathname + ')');

            fetch(SEND_URL, {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData,
                credentials: 'same-origin'
            })
            .then(function(response) {
                return response.json().catch(function() { return { ok: false }; })
                    .then(function(data) { return { response: response, data: data }; });
            })
            .then(function(r) {
                if (r.response.ok && r.data.ok) {
                    showMessage(form, 'Спасибо! Мы свяжемся с вами в ближайшее время.', false);
                    form.reset();
                    form.dataset.ts = Math.floor(Date.now() / 1000).toString();
                } else {
                    showMessage(form, r.data.error || 'Ошибка отправки. Позвоните нам!', true);
                }
            })
            .catch(function() {
                showMessage(form, 'Ошибка сети. Позвоните нам!', true);
            })
            .finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });
    });

});
