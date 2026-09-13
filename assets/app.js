/**
 * 关注塔菲谢谢喵 · 交互脚本
 * ------------------------------------------------------------------
 * 主题切换 / 导航指示器 / Scrollspy / 滚动进度 / 进场动画 / 数字滚动
 * 分段控件 / 渐进式图片 / Lightbox / 音频 Dock / 命令面板搜索
 * 日程倒计时 / 留言板 / 分享 / 视差
 */

(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isTouch = window.matchMedia('(hover: none)').matches;

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) {
        return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    }
    function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }
    function clamp(v, a, b) { return Math.min(Math.max(v, a), b); }

    /* ==============================================================
       0. 轻量提示条
       ============================================================== */
    var toastTimer = null;
    function toast(msg) {
        var el = $('#toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast';
            el.setAttribute('role', 'status');
            el.style.cssText = [
                'position:fixed', 'left:50%', 'bottom:34px', 'transform:translate(-50%,14px)',
                'padding:11px 20px', 'border-radius:980px', 'font-size:.875rem', 'font-weight:550',
                'background:rgba(28,28,30,.92)', 'color:#fff', 'z-index:99999',
                'backdrop-filter:saturate(180%) blur(20px)', '-webkit-backdrop-filter:saturate(180%) blur(20px)',
                'box-shadow:0 12px 36px rgba(0,0,0,.28)', 'opacity:0', 'pointer-events:none',
                'transition:opacity .28s cubic-bezier(.16,1,.3,1),transform .28s cubic-bezier(.16,1,.3,1)',
                'max-width:82vw', 'text-align:center'
            ].join(';');
            document.body.appendChild(el);
        }
        el.textContent = msg;
        requestAnimationFrame(function () {
            el.style.opacity = '1';
            el.style.transform = 'translate(-50%,0)';
        });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.style.opacity = '0';
            el.style.transform = 'translate(-50%,14px)';
        }, 2200);
    }

    /* ==============================================================
       1. 主题切换
       ============================================================== */
    (function theme() {
        var btn = $('#themeToggle');
        var icon = $('#themeIcon');

        var SUN = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>';
        var MOON = '<path d="M20 14.2A8.4 8.4 0 019.8 4a8.4 8.4 0 1010.2 10.2z"/>';

        function paint() {
            var dark = root.getAttribute('data-theme') === 'dark';
            if (icon) icon.innerHTML = dark ? MOON : SUN;
            var meta = document.querySelector('meta[name="theme-color"]:not([media])');
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('name', 'theme-color');
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', dark ? '#000000' : '#fbfbfd');
            // 同步 Giscus 主题
            var frame = document.querySelector('iframe.giscus-frame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({
                    giscus: { setConfig: { theme: dark ? 'dark' : 'light' } }
                }, 'https://giscus.app');
            }
        }

        on(btn, 'click', function () {
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem('taffy-theme', next); } catch (e) { }
            paint();
        });

        paint();
    })();

    /* ==============================================================
       2. 导航：吸顶状态 / 移动抽屉 / 指示器 / Scrollspy
       ============================================================== */
    (function navigation() {
        var nav = $('#nav');
        var pill = $('#navPill');
        var linksWrap = $('#navLinks');
        var toggle = $('#navToggle');
        var sheet = $('#navSheet');
        if (!nav) return;

        var links = linksWrap ? $$('a', linksWrap) : [];

        /* ---- 吸顶阴影 ---- */
        function onScrollNav() {
            nav.classList.toggle('is-stuck', window.scrollY > 8);
        }
        onScrollNav();

        /* ---- 移动抽屉 ---- */
        function setSheet(open) {
            if (!sheet || !toggle) return;
            sheet.classList.toggle('is-open', open);
            toggle.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        on(toggle, 'click', function () {
            setSheet(!sheet.classList.contains('is-open'));
        });
        $$('a', sheet).forEach(function (a) {
            on(a, 'click', function () { setSheet(false); });
        });
        on(document, 'keydown', function (e) {
            if (e.key === 'Escape') setSheet(false);
        });
        on(window, 'resize', function () {
            if (window.innerWidth > 900) setSheet(false);
            placePill();
        });

        /* ---- 滑动指示器 ---- */
        function pillTo(el) {
            if (!pill || !linksWrap) return;
            if (!el) {
                pill.classList.remove('is-ready');
                return;
            }
            var c = linksWrap.getBoundingClientRect();
            var b = el.getBoundingClientRect();
            // 在横向滚动容器里需要加上滚动偏移
            var x = b.left - c.left + linksWrap.scrollLeft;
            var y = b.top - c.top;
            pill.style.width = b.width + 'px';
            pill.style.height = b.height + 'px';
            pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            pill.classList.add('is-ready');
        }

        /* ---- Scrollspy ---- */
        var sections = [];
        links.forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (href.charAt(0) !== '#') return;
            var el = document.getElementById(href.slice(1));
            if (el) sections.push({ el: el, link: a });
        });

        var currentLink = null;
        var ticking = false;

        function spy() {
            ticking = false;
            onScrollNav();

            var line = window.scrollY + (window.innerHeight * 0.28);
            var found = null;

            for (var i = 0; i < sections.length; i++) {
                var top = sections[i].el.getBoundingClientRect().top + window.scrollY;
                var h = sections[i].el.offsetHeight;
                if (line >= top && line < top + h) { found = sections[i]; break; }
            }
            // 兜底：最后一个已越过的章节
            if (!found) {
                for (var j = sections.length - 1; j >= 0; j--) {
                    var t2 = sections[j].el.getBoundingClientRect().top + window.scrollY;
                    if (window.scrollY >= t2) { found = sections[j]; break; }
                }
            }
            // 靠近页底时高亮最后一个
            if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 120) {
                found = sections[sections.length - 1] || found;
            }

            if (found && found.link !== currentLink) {
                currentLink = found.link;
                links.forEach(function (a) { a.classList.remove('is-active'); });
                currentLink.classList.add('is-active');
                pillTo(currentLink);
                // 让高亮项在横向滚动区可见
                if (linksWrap.scrollWidth > linksWrap.clientWidth) {
                    var l = currentLink.offsetLeft;
                    var w = currentLink.offsetWidth;
                    var sl = linksWrap.scrollLeft;
                    var vw = linksWrap.clientWidth;
                    if (l < sl || l + w > sl + vw) {
                        linksWrap.scrollTo({
                            left: clamp(l - vw / 2 + w / 2, 0, linksWrap.scrollWidth),
                            behavior: reduceMotion ? 'auto' : 'smooth'
                        });
                    }
                }
            } else if (!found && currentLink) {
                currentLink = null;
                links.forEach(function (a) { a.classList.remove('is-active'); });
                pillTo(null);
            }
        }

        function placePill() {
            if (currentLink) pillTo(currentLink);
        }

        on(window, 'scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(spy); }
        }, { passive: true });
        on(window, 'load', spy);
        on(linksWrap, 'scroll', placePill, { passive: true });

        // 搜索跳转等场景下的手动高亮
        window.__spyRefresh = spy;
    })();

    /* ==============================================================
       3. 滚动进度条
       ============================================================== */
    (function progress() {
        var bar = $('#scroll-progress');
        if (!bar) return;
        var ticking = false;
        function update() {
            ticking = false;
            var max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = (max > 0 ? clamp(window.scrollY / max, 0, 1) * 100 : 0) + '%';
        }
        on(window, 'scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        on(window, 'resize', update);
        update();
    })();

    /* ==============================================================
       4. 进场动画
       ============================================================== */
    (function reveal() {
        var items = $$('[data-reveal]');
        if (!items.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('is-in'); });
            return;
        }

        // stagger 容器：给子元素排延迟
        items.forEach(function (el) {
            if (el.getAttribute('data-reveal') === 'stagger') {
                $$(':scope > *', el).forEach(function (child, i) {
                    child.style.setProperty('--reveal-delay', (i * 70) + 'ms');
                });
            }
        });

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        items.forEach(function (el) { io.observe(el); });
    })();

    /* ==============================================================
       5. 数字滚动
       ============================================================== */
    (function counters() {
        var els = $$('[data-count]');
        if (!els.length) return;

        function run(el) {
            var target = parseFloat(el.getAttribute('data-count'));
            var suffix = el.getAttribute('data-suffix') || '';
            if (isNaN(target)) return;
            if (reduceMotion) { el.textContent = target + suffix; return; }

            var dur = 1150;
            var start = performance.now();
            function frame(now) {
                var p = clamp((now - start) / dur, 0, 1);
                var eased = 1 - Math.pow(1 - p, 4);
                el.textContent = Math.round(target * eased).toLocaleString('en-US') + suffix;
                if (p < 1) requestAnimationFrame(frame);
                else el.textContent = target.toLocaleString('en-US') + suffix;
            }
            requestAnimationFrame(frame);
        }

        if (!('IntersectionObserver' in window)) { els.forEach(run); return; }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                run(entry.target);
                io.unobserve(entry.target);
            });
        }, { threshold: 0.5 });

        els.forEach(function (el) { io.observe(el); });
    })();

    /* ==============================================================
       6. 渐进式图片：低清占位 → 高清
       ============================================================== */
    (function progressive() {
        $$('img.prog').forEach(function (img) {
            var full = img.getAttribute('data-src');
            if (!full) return;
            var real = new Image();
            real.decoding = 'async';
            real.onload = function () {
                img.src = real.src;
                img.removeAttribute('data-src');
                requestAnimationFrame(function () { img.classList.add('is-loaded'); });
            };
            real.onerror = function () { img.classList.add('is-loaded'); };
            real.src = full;
        });
    })();

    /* ==============================================================
       7. 分段控件
       ============================================================== */
    function setupSegmented(seg) {
        if (!seg) return null;
        var thumb = $('.segmented__thumb', seg);
        var tabs = $$('button[role="tab"]', seg);

        function move(btn, animate) {
            if (!thumb) return;
            var c = seg.getBoundingClientRect();
            var b = btn.getBoundingClientRect();
            if (animate === false) thumb.style.transition = 'none';
            thumb.style.width = b.width + 'px';
            thumb.style.height = b.height + 'px';
            thumb.style.transform = 'translate(' + (b.left - c.left + seg.scrollLeft) + 'px,' + (b.top - c.top) + 'px)';
            thumb.classList.add('is-ready');
            if (animate === false) {
                void thumb.offsetWidth;
                thumb.style.transition = '';
            }
        }

        function activate(panelId, opts) {
            opts = opts || {};
            var target = null;
            tabs.forEach(function (t) {
                var sel = t.getAttribute('data-panel') === panelId;
                t.setAttribute('aria-selected', sel ? 'true' : 'false');
                if (sel) target = t;
            });
            if (!target) return false;

            var group = seg.parentNode;
            var panels = $$('.tl-panel', group);
            panels.forEach(function (p) { p.classList.remove('is-active'); });
            var panel = document.getElementById(panelId);
            if (panel) panel.classList.add('is-active');

            move(target, opts.animate !== false);
            if (opts.scrollIntoView) {
                var left = target.offsetLeft - seg.clientWidth / 2 + target.offsetWidth / 2;
                seg.scrollTo({ left: clamp(left, 0, seg.scrollWidth), behavior: reduceMotion ? 'auto' : 'smooth' });
            }
            return true;
        }

        tabs.forEach(function (t) {
            on(t, 'click', function () {
                activate(t.getAttribute('data-panel'), { scrollIntoView: true });
            });
        });

        // 键盘左右切换
        on(seg, 'keydown', function (e) {
            var idx = tabs.indexOf(document.activeElement);
            if (idx < 0) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                var next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
                next.focus();
                activate(next.getAttribute('data-panel'), { scrollIntoView: true });
            }
        });

        on(window, 'resize', function () {
            var sel = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
            if (sel) move(sel, false);
        });

        var initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
        if (initial) requestAnimationFrame(function () { move(initial, false); });

        return { activate: activate, seg: seg };
    }

    var tlSeg = setupSegmented($('#tlTabs'));
    var gmSeg = setupSegmented($('#gmTabs'));

    // 字体加载完成后指示器可能位移，补一次
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
            [tlSeg, gmSeg].forEach(function (s) {
                if (!s) return;
                var sel = s.seg.querySelector('button[aria-selected="true"]');
                if (sel) s.activate(sel.getAttribute('data-panel'), { animate: false });
            });
        });
    }

    /* ==============================================================
       8. Lightbox
       ============================================================== */
    (function lightbox() {
        var box = $('#lightbox');
        var img = $('#lightbox-img');
        var cap = $('#lightbox-cap');
        var closeBtn = $('#lightboxClose');
        if (!box || !img) return;

        var lastFocus = null;

        function open(src, caption) {
            lastFocus = document.activeElement;
            img.src = src;
            img.alt = caption || '';
            cap.textContent = caption || '';
            box.setAttribute('aria-hidden', 'false');
            box.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            if (closeBtn) closeBtn.focus();
        }
        function close() {
            box.classList.remove('is-open');
            box.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        $$('[data-zoom]').forEach(function (el) {
            var target = el.tagName === 'IMG' ? el : $('img', el);
            if (!target) return;
            el.style.cursor = 'zoom-in';
            on(el, 'click', function (e) {
                e.preventDefault();
                open(target.currentSrc || target.src, el.getAttribute('data-caption') || target.alt);
            });
        });

        on(box, 'click', function (e) {
            if (e.target === box || e.target === img || e.target === closeBtn) close();
        });
        on(closeBtn, 'click', function (e) { e.stopPropagation(); close(); });
        on(document, 'keydown', function (e) {
            if (e.key === 'Escape' && box.classList.contains('is-open')) close();
        });
    })();

    /* ==============================================================
       9. 音频 Dock
       ============================================================== */
    (function audio() {
        var el = $('#bgm');
        var btn = $('#audio-btn');
        var icon = $('#audioIcon');
        var ring = $('#audioRing');
        var panel = $('#audioPanel');
        var caret = $('#audioCaret');
        var seek = $('#audio-seek');
        var vol = $('#audio-volume');
        var cur = $('#audio-current');
        var dur = $('#audio-duration');
        if (!el || !btn) return;

        var C = 129.4;
        var PLAY = '<path d="M8.5 5.5l10 6.5-10 6.5z"/>';
        var PAUSE = '<path d="M9 5.5v13M15 5.5v13"/>';

        function fmt(s) {
            if (!isFinite(s) || isNaN(s)) return '0:00';
            var m = Math.floor(s / 60);
            var sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        function paintRing() {
            if (!ring) return;
            var d = el.duration;
            var p = d && isFinite(d) ? clamp(el.currentTime / d, 0, 1) : 0;
            ring.style.strokeDashoffset = (C * (1 - p)).toFixed(2);
        }

        function setPlaying(on_) {
            if (icon) icon.innerHTML = on_ ? PAUSE : PLAY;
            btn.classList.toggle('is-playing', on_);
            btn.setAttribute('aria-label', on_ ? '暂停背景音乐' : '播放背景音乐');
        }

        on(btn, 'click', function () {
            if (el.paused) {
                el.volume = vol ? parseFloat(vol.value) : 0.5;
                var p = el.play();
                if (p && p.catch) p.catch(function () { toast('浏览器阻止了自动播放，请再点一次'); });
            } else {
                el.pause();
            }
        });

        on(el, 'play', function () { setPlaying(true); });
        on(el, 'pause', function () { setPlaying(false); });
        on(el, 'ended', function () { setPlaying(false); });

        on(el, 'loadedmetadata', function () {
            if (dur) dur.textContent = fmt(el.duration);
            if (seek) seek.max = el.duration || 100;
        });
        on(el, 'timeupdate', function () {
            if (seek && !seek.dataset.dragging) seek.value = el.currentTime || 0;
            if (cur) cur.textContent = fmt(el.currentTime);
            paintRing();
        });
        on(el, 'error', function () {
            if (dur) dur.textContent = '--:--';
            toast('音频加载失败，可能是网络问题');
        });

        var dragging = false;
        on(seek, 'input', function () { dragging = true; seek.dataset.dragging = '1'; });
        on(seek, 'change', function () {
            el.currentTime = parseFloat(seek.value) || 0;
            dragging = false;
            delete seek.dataset.dragging;
            paintRing();
        });

        on(vol, 'input', function () { el.volume = parseFloat(vol.value); });

        /* ---- 面板 ---- */
        function setPanel(open_) {
            if (!panel || !caret) return;
            panel.classList.toggle('is-open', open_);
            caret.setAttribute('aria-expanded', open_ ? 'true' : 'false');
        }
        on(caret, 'click', function (e) {
            e.stopPropagation();
            setPanel(!panel.classList.contains('is-open'));
        });
        on(document, 'click', function (e) {
            if (!panel || !panel.classList.contains('is-open')) return;
            if (!panel.contains(e.target) && e.target !== caret && !caret.contains(e.target)) setPanel(false);
        });
        on(document, 'keydown', function (e) {
            if (e.key === 'Escape') setPanel(false);
        });

        if (vol) el.volume = parseFloat(vol.value);
    })();

    /* ==============================================================
       10. 返回顶部
       ============================================================== */
    (function backToTop() {
        var btn = $('#backToTop');
        if (!btn) return;
        var ticking = false;
        function update() {
            ticking = false;
            btn.classList.toggle('is-hidden', window.scrollY < 520);
        }
        on(btn, 'click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        on(window, 'scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();
    })();

    /* ==============================================================
       11. 命令面板搜索
       ============================================================== */
    (function palette() {
        var wrap = $('#palette');
        var input = $('#palette-input');
        var list = $('#palette-list');
        var openBtn = $('#paletteOpen');
        if (!wrap || !input || !list) return;

        /* ---- 建索引 ---- */
        var index = [];
        var seen = {};

        function push(entry) {
            var key = entry.kind + '|' + entry.label + '|' + (entry.target || '');
            if (seen[key]) return;
            seen[key] = 1;
            index.push(entry);
        }

        // 章节
        $$('main .section, main .hero').forEach(function (sec) {
            var id = sec.id;
            if (!id) return;
            var titleEl = $('.sec-title', sec);
            var title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim()
                : (sec.classList.contains('hero') ? '首页' : '');
            if (!title) return;
            push({
                label: title,
                kind: '章节',
                text: sec.textContent.replace(/\s+/g, ' ').trim().slice(0, 220),
                target: id
            });
        });

        // 历程条目
        $$('.tl-item').forEach(function (item) {
            var panel = item.closest('.tl-panel');
            var desc = item.querySelector('.tl-item__desc');
            var date = item.querySelector('.tl-item__date');
            if (!desc) return;
            push({
                label: desc.textContent.replace(/\s+/g, ' ').trim(),
                kind: '历程',
                text: (date ? date.textContent.trim() : ''),
                target: panel ? panel.id : 'timeline',
                tabs: panel && /^tl-/.test(panel.id) ? { group: 'tlTabs', panel: panel.id } : null
            });
        });

        // 2025 游戏
        $$('.game').forEach(function (g) {
            var panel = g.closest('.tl-panel');
            var name = g.querySelector('.game__name');
            if (!name) return;
            var eng = g.querySelector('.game__eng');
            var day = g.querySelector('.game__day');
            push({
                label: name.textContent.replace(/\s+/g, ' ').trim(),
                kind: '游戏',
                text: [day ? day.textContent : '', eng ? eng.textContent : '',
                panel ? $('h3', panel).textContent : ''].filter(Boolean).join(' · '),
                target: panel ? panel.id : 'games2025',
                tabs: panel && /^gm-/.test(panel.id) ? { group: 'gmTabs', panel: panel.id } : null
            });
        });

        // 成就
        $$('.ach').forEach(function (a) {
            var n = a.querySelector('.ach__name');
            var v = a.querySelector('.ach__val');
            if (!n) return;
            push({
                label: n.textContent.replace(/\s+/g, ' ').trim(),
                kind: '成就',
                text: v ? v.textContent.replace(/\s+/g, ' ').trim() : '',
                target: 'achievements'
            });
        });

        // 趣闻
        $$('.acc__head').forEach(function (h) {
            var item = h.closest('.acc__item');
            if (!item) return;
            var body = item.querySelector('.acc__body');
            var sec = item.closest('.section');
            push({
                label: h.textContent.replace(/^\d+/, '').replace(/\s+/g, ' ').trim(),
                kind: '趣闻',
                text: body ? body.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : '',
                target: sec && sec.id ? sec.id : 'trivia'
            });
        });

        // 歌曲
        $$('.dtable tbody tr').forEach(function (tr) {
            var link = tr.querySelector('a');
            if (!link) return;
            push({
                label: link.textContent.trim(),
                kind: '歌曲',
                text: '原创歌曲 · ' + (tr.children[1] ? tr.children[1].textContent.trim() : ''),
                target: 'songs'
            });
        });

        // 百科 bento
        $$('#facts .bento__cell, #settings .bento__cell').forEach(function (c) {
            var label = c.querySelector('.bento__label');
            var value = c.querySelector('.bento__value');
            var desc = c.querySelector('.bento__desc');
            if (!label) return;
            push({
                label: (value ? value.textContent : label.textContent).replace(/\s+/g, ' ').trim(),
                kind: '百科',
                text: [label.textContent.trim(), desc ? desc.textContent.trim() : ''].join(' · ').slice(0, 140),
                target: c.closest('.section').id || 'facts'
            });
        });

        // 平台链接
        $$('.tile, .link-card').forEach(function (t) {
            var meta = t.querySelector('.tile__meta');
            push({
                label: meta ? meta.childNodes[0].textContent.trim() : t.textContent.trim(),
                kind: '链接',
                text: t.getAttribute('href') || '',
                target: 'links'
            });
        });

        /* ---- 打分 ---- */
        function fuzzy(hay, needle) {
            var hi = 0;
            for (var i = 0; i < needle.length; i++) {
                hi = hay.indexOf(needle.charAt(i), hi);
                if (hi === -1) return false;
                hi++;
            }
            return true;
        }

        function score(item, q) {
            var label = item.label.toLowerCase();
            var text = (item.text || '').toLowerCase();
            var terms = q.split(/\s+/).filter(Boolean);
            if (!terms.length) return 0;
            var total = 0;

            for (var i = 0; i < terms.length; i++) {
                var t = terms[i];
                var s = 0;
                var li = label.indexOf(t);
                if (li === 0) s = 140;
                else if (li > 0) s = 96 - Math.min(li, 50);
                else if (label.length <= 6 && fuzzy(label, t)) s = 42;

                var xi = text.indexOf(t);
                if (xi >= 0) s = Math.max(s, xi < 24 ? 62 : 34);
                else if (s === 0 && t.length > 1 && fuzzy(text, t)) s = 12;

                if (s === 0) return 0;
                total += s;
            }
            // 短标签更精确
            total -= Math.min(label.length, 24) * 0.6;
            // 类型微加成
            if (item.kind === '章节' || item.kind === '游戏') total += 6;
            return total;
        }

        /* ---- 渲染 ---- */
        var results = [];
        var cursor = 0;

        function render(query) {
            var q = (query || '').trim().toLowerCase();
            list.innerHTML = '';

            if (!q) {
                // 默认：热门入口
                results = index.filter(function (i) {
                    return ['章节'].indexOf(i.kind) >= 0;
                }).slice(0, 8).map(function (i) {
                    return { item: i, s: 0 };
                });
                if (!results.length) {
                    list.innerHTML = '<p class="palette__empty">输入关键词开始搜索</p>';
                    return;
                }
            } else {
                results = [];
                for (var i = 0; i < index.length; i++) {
                    var s = score(index[i], q);
                    if (s > 0) results.push({ item: index[i], s: s });
                }
                results.sort(function (a, b) { return b.s - a.s; });
                results = results.slice(0, 14);
                if (!results.length) {
                    list.innerHTML = '<p class="palette__empty">没有找到「' + q.replace(/[<>&]/g, '') + '」相关内容</p>';
                    return;
                }
            }

            cursor = 0;
            var frag = document.createDocumentFragment();
            results.forEach(function (r, i) {
                var b = document.createElement('button');
                b.className = 'palette__item' + (i === 0 ? ' is-cursor' : '');
                b.setAttribute('role', 'option');
                b.type = 'button';

                var icon = document.createElement('i');
                icon.textContent = r.item.kind.charAt(0);

                var body = document.createElement('span');
                var strong = document.createElement('b');
                strong.textContent = r.item.label;
                body.appendChild(strong);
                if (r.item.text) {
                    var small = document.createElement('small');
                    small.textContent = r.item.text;
                    body.appendChild(small);
                }

                var tag = document.createElement('em');
                tag.textContent = r.item.kind;

                b.appendChild(icon);
                b.appendChild(body);
                b.appendChild(tag);
                b.addEventListener('click', function () { go(r.item); });
                b.addEventListener('mousemove', function () { setCursor(i); });
                frag.appendChild(b);
            });
            list.appendChild(frag);
        }

        function setCursor(i) {
            var items = $$('.palette__item', list);
            if (!items.length) return;
            cursor = (i + items.length) % items.length;
            items.forEach(function (el, k) { el.classList.toggle('is-cursor', k === cursor); });
        }

        function go(item) {
            close();
            var target = document.getElementById(item.target);
            if (item.tabs) {
                var seg = item.tabs.group === 'tlTabs' ? tlSeg : gmSeg;
                if (seg) seg.activate(item.tabs.panel, { scrollIntoView: false });
                // 面板切换后再定位
                requestAnimationFrame(function () {
                    var p = document.getElementById(item.tabs.panel);
                    if (p) p.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                });
            } else if (target) {
                target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }
            // 高亮折叠项
            if (target) {
                var flash = target.querySelector('.acc__item[open]') || target;
                flash.classList.add('is-flash');
                setTimeout(function () { flash.classList.remove('is-flash'); }, 1600);
            }
            if (window.__spyRefresh) setTimeout(window.__spyRefresh, reduceMotion ? 0 : 520);
        }

        function open_() {
            wrap.setAttribute('aria-hidden', 'false');
            wrap.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            render('');
            setTimeout(function () { input.focus(); input.select(); }, 40);
        }
        function close() {
            wrap.classList.remove('is-open');
            wrap.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            input.value = '';
        }

        on(openBtn, 'click', open_);
        on(wrap, 'click', function (e) { if (e.target === wrap) close(); });

        var raf = 0;
        on(input, 'input', function () {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(function () { render(input.value); });
        });

        on(input, 'keydown', function (e) {
            var items = $$('.palette__item', list);
            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(cursor + 1); items[cursor] && items[cursor].scrollIntoView({ block: 'nearest' }); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(cursor - 1); items[cursor] && items[cursor].scrollIntoView({ block: 'nearest' }); }
            else if (e.key === 'Enter') { e.preventDefault(); if (results[cursor]) go(results[cursor].item); }
        });

        on(document, 'keydown', function (e) {
            var isOpen = wrap.classList.contains('is-open');
            // Ctrl/⌘ + K
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                isOpen ? close() : open_();
                return;
            }
            // 斜杠快捷搜索
            if (!isOpen && e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
                e.preventDefault();
                open_();
                return;
            }
            if (e.key === 'Escape' && isOpen) close();
        });

        // 平台提示
        var hint = $('#kbdHint');
        if (hint && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) hint.textContent = '⌘K';
    })();

    /* ==============================================================
       12. 分享 / 复制链接
       ============================================================== */
    (function share() {
        var url = encodeURIComponent(window.location.href);
        var title = encodeURIComponent('关注塔菲谢谢喵 · 永雏塔菲粉丝应援站');

        function pop(href) {
            window.open(href, '_blank', 'width=640,height=540,noopener');
        }

        on($('#shareWeibo'), 'click', function () {
            pop('https://service.weibo.com/share/share.php?url=' + url + '&title=' + title);
        });
        on($('#shareQQ'), 'click', function () {
            pop('https://connect.qq.com/widget/shareqq/index.html?url=' + url + '&title=' + title);
        });
        on($('#shareTwitter'), 'click', function () {
            pop('https://twitter.com/intent/tweet?text=' + title + '&url=' + url);
        });
        on($('#copyLink'), 'click', function () {
            var text = window.location.href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    toast('链接已复制');
                }).catch(function () { fallback(); });
            } else { fallback(); }

            function fallback() {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); toast('链接已复制'); }
                catch (e) { toast('复制失败，请手动复制地址栏'); }
                document.body.removeChild(ta);
            }
        });
    })();

    /* ==============================================================
       13. 日程倒计时
       ============================================================== */
    (function schedule() {
        var cards = $$('.sched__card[data-date]');
        if (!cards.length) return;

        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var best = null;

        cards.forEach(function (card) {
            var parts = card.getAttribute('data-date').split('-');
            var m = parseInt(parts[0], 10) - 1;
            var d = parseInt(parts[1], 10);

            var next = new Date(today.getFullYear(), m, d);
            if (next < today) next = new Date(today.getFullYear() + 1, m, d);

            var days = Math.round((next - today) / 86400000);
            var label = card.querySelector('.sched__days');
            if (label) {
                label.textContent = days === 0 ? '就是今天！' : ('还有 ' + days + ' 天');
            }
            if (!best || days < best.days) best = { days: days, card: card };
        });

        if (best) best.card.classList.add('sched__card--next');
    })();

    /* ==============================================================
       14. 应援留言板（GitHub Issues）
       ============================================================== */
    (function guestbook() {
        var box = $('#guestbook-list');
        if (!box) return;

        var api = 'https://api.github.com/repos/ciallo0721-cmd/tf/issues'
            + '?labels=' + encodeURIComponent('应援留言')
            + '&state=all&per_page=20&sort=created&direction=desc';

        function esc(s) {
            var d = document.createElement('div');
            d.textContent = s == null ? '' : String(s);
            return d.innerHTML;
        }

        // 骨架屏
        var sk = '';
        for (var i = 0; i < 3; i++) {
            sk += '<div class="gb__item"><div class="skeleton" style="width:36px;height:36px;border-radius:50%"></div>'
                + '<div><div class="skeleton" style="height:11px;width:32%;margin-bottom:8px"></div>'
                + '<div class="skeleton" style="height:11px;width:76%"></div></div></div>';
        }
        box.innerHTML = sk;

        fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
            .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(function (issues) {
                if (!Array.isArray(issues)) throw new Error('bad payload');
                var list = issues.filter(function (it) { return !it.pull_request; });
                if (!list.length) {
                    box.innerHTML = '<p class="gb__empty">还没有留言，快来发表第一条应援吧！</p>';
                    return;
                }
                box.innerHTML = list.map(function (it) {
                    var date = new Date(it.created_at).toLocaleDateString('zh-CN');
                    var body = (it.body || '').replace(/\s+/g, ' ').trim();
                    if (body.length > 180) body = body.slice(0, 180) + '…';
                    var av = it.user && it.user.avatar_url
                        ? '<img class="gb__avatar" src="' + esc(it.user.avatar_url) + '" alt="" loading="lazy" width="36" height="36">'
                        : '<span class="gb__avatar" aria-hidden="true"></span>';
                    return '<article class="gb__item">' + av
                        + '<div><div class="gb__head"><a class="gb__author" href="' + esc(it.html_url)
                        + '" target="_blank" rel="noopener">' + esc(it.user ? it.user.login : '匿名')
                        + '</a><time class="gb__date">' + date + '</time></div>'
                        + '<p class="gb__body">' + esc(body) + '</p></div></article>';
                }).join('');
            })
            .catch(function () {
                box.innerHTML = '<p class="gb__empty">留言加载失败，稍后再试试 ヽ(；▽；)ノ</p>';
            });
    })();

    /* ==============================================================
       15. 年份 / 视差 / 快捷键
       ============================================================== */
    (function misc() {
        var y = $('#year');
        if (y) y.textContent = String(new Date().getFullYear());

        // Hero 轻微视差
        var art = $('#heroArt');
        if (art && !reduceMotion && !isTouch) {
            var ticking = false;
            on(window, 'scroll', function () {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(function () {
                    ticking = false;
                    var y0 = window.scrollY;
                    if (y0 > window.innerHeight * 1.2) return;
                    art.style.transform = 'translate3d(0,' + (y0 * 0.055).toFixed(2) + 'px,0) scale(' + (1 - Math.min(y0 / 6000, 0.04)).toFixed(4) + ')';
                });
            }, { passive: true });
        }

        // Ctrl/⌘ + ← 回顶部
        on(document, 'keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Home') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
        });
    })();

})();
