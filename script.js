document.addEventListener('DOMContentLoaded', function() {

    // ── ЗАЩИТА ОТ КОПИРОВАНИЯ ────────────────────────────────

    // Блокировка правой кнопки мыши
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

    // Блокировка клавиш: F12, Ctrl+U, Ctrl+S, Ctrl+P
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12') { e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && ['u','s','p'].indexOf(e.key.toLowerCase()) !== -1) {
            e.preventDefault();
        }
        // Блокировка Ctrl+C кроме полей ввода и номера телефона
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            var tag = document.activeElement.tagName.toLowerCase();
            var isPhoneLink = document.activeElement.classList.contains('phone-number');
            if (tag !== 'input' && tag !== 'textarea' && !isPhoneLink) {
                e.preventDefault();
            }
        }
    });

    // Блокировка drag-and-drop изображений
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG' || e.target.tagName === 'SVG') e.preventDefault();
    });

    // Предупреждение в консоли
    console.log('%cВнимание!', 'color:red;font-size:30px;font-weight:bold;');
    console.log('%cДанный сайт защищён авторским правом ИП Балахеев Ю.Б.\nНесанкционированное копирование преследуется по закону.', 'font-size:14px;color:#333;');


    // ── АНИМАЦИИ ПРИ СКРОЛЛЕ (Intersection Observer) ────────
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
            var start = 0;
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


    // ── ШАПКА: УМЕНЬШЕНИЕ ПРИ СКРОЛЛЕ ─────────────────────
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
        // Закрыть меню при клике на ссылку
        navMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                hamburger.classList.remove('active');
            });
        });
    }


    // ── МАСКА ТЕЛЕФОНА ───────────────────────────────────────
    var phoneInput = document.getElementById('userPhone');
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
    // Автоподставить +7 при фокусе
    phoneInput.addEventListener('focus', function() {
        if (!this.value) this.value = '+7';
    });


    // ── УТИЛИТЫ БЕЗОПАСНОСТИ ─────────────────────────────────

    // Санитизация строки (удаление опасных символов)
    function sanitize(str) {
        return str.replace(/[<>{}()\[\]\\\/`"']/g, '').trim().substring(0, 50);
    }

    // Валидация телефона (формат +7 (XXX) XXX-XX-XX)
    function isValidPhone(phone) {
        return /^\+7\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/.test(phone);
    }


    // ── ОТПРАВКА ФОРМЫ (3 канала) ────────────────────────────
    var topForm = document.getElementById('topForm');

    topForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Honeypot — если заполнено, это бот
        var honeypot = document.getElementById('honeypotField');
        var btn = this.querySelector('button');
        if (honeypot && honeypot.value !== '') {
            btn.innerText = 'Заявка отправлена!';
            btn.style.backgroundColor = '#28a745';
            setTimeout(function() { btn.innerText = 'Отправить заявку'; btn.style.backgroundColor = ''; }, 4000);
            return;
        }

        var rawName = document.getElementById('userName').value.trim();
        var rawPhone = document.getElementById('userPhone').value.trim();
        var consent = document.getElementById('consentCheckbox').checked;

        // Валидация согласия
        if (!consent) {
            alert('Необходимо дать согласие на обработку персональных данных.');
            return;
        }

        // Валидация имени
        var name = sanitize(rawName);
        if (name.length < 2) {
            alert('Пожалуйста, введите корректное имя.');
            return;
        }

        // Валидация телефона
        if (!isValidPhone(rawPhone)) {
            alert('Введите телефон в формате +7 (XXX) XXX-XX-XX');
            return;
        }
        var phone = rawPhone;

        // Rate limiting (не чаще 1 раза в 30 сек)
        var lastSubmit = parseInt(localStorage.getItem('lastFormSubmit') || '0');
        var nowMs = Date.now();
        if (nowMs - lastSubmit < 30000) {
            alert('Пожалуйста, подождите 30 секунд перед повторной отправкой.');
            return;
        }
        localStorage.setItem('lastFormSubmit', nowMs.toString());

        var now = new Date().toLocaleString('ru-RU');
        var consentTimestamp = new Date().toISOString();

        // Блокируем кнопку
        btn.disabled = true;
        btn.innerText = 'Отправка...';

        // Запускаем все 3 канала параллельно
        var results = [];
        results.push(sendToTelegram(name, phone, now, consentTimestamp));
        results.push(sendToGoogleSheet(name, phone, now, consentTimestamp));
        results.push(sendToEmail(name, phone, now, consentTimestamp));

        Promise.allSettled(results).then(function(outcomes) {
            var anySuccess = outcomes.some(function(o) { return o.status === 'fulfilled'; });

            if (anySuccess) {
                btn.innerText = 'Заявка отправлена!';
                btn.style.backgroundColor = '#28a745';
                topForm.reset();
            } else {
                btn.innerText = 'Ошибка, позвоните нам';
                btn.style.backgroundColor = '#dc3545';
            }

            setTimeout(function() {
                btn.innerText = 'Отправить заявку';
                btn.style.backgroundColor = '';
                btn.disabled = false;
            }, 4000);
        });
    });


    // ── КАНАЛ 1: TELEGRAM ────────────────────────────────────
    function sendToTelegram(name, phone, date, consentTime) {
        var token = CONFIG.TELEGRAM_BOT_TOKEN;
        var chatId = CONFIG.TELEGRAM_CHAT_ID;

        if (!token || token.length < 10) {
            return Promise.reject('Telegram не настроен');
        }

        var text = '📋 *Новая заявка с сайта*\n\n'
            + '👤 Имя: ' + name + '\n'
            + '📞 Телефон: ' + phone + '\n'
            + '🕐 Дата: ' + date + '\n'
            + '✅ Согласие ПД: ' + consentTime;

        return fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        }).then(function(r) {
            if (!r.ok) throw new Error('Telegram error');
            return r.json();
        });
    }


    // ── КАНАЛ 2: GOOGLE ТАБЛИЦА ──────────────────────────────
    function sendToGoogleSheet(name, phone, date, consentTime) {
        var url = CONFIG.GOOGLE_SCRIPT_URL;

        if (!url || url.length < 10) {
            return Promise.reject('Google Sheet не настроен');
        }

        return fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                phone: phone,
                date: date,
                consent: consentTime
            })
        });
    }


    // ── КАНАЛ 3: EMAIL (EmailJS) ─────────────────────────────
    function sendToEmail(name, phone, date, consentTime) {
        var serviceId = CONFIG.EMAILJS_SERVICE_ID;
        var templateId = CONFIG.EMAILJS_TEMPLATE_ID;
        var publicKey = CONFIG.EMAILJS_PUBLIC_KEY;

        if (!serviceId || serviceId.length < 5) {
            return Promise.reject('EmailJS не настроен');
        }

        if (typeof emailjs === 'undefined') {
            return Promise.reject('EmailJS SDK не загружен');
        }

        return emailjs.send(serviceId, templateId, {
            from_name: name,
            phone: phone,
            date: date,
            consent: consentTime
        }, publicKey);
    }

});