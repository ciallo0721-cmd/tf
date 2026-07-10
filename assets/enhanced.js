/**
 * 关注塔菲谢谢喵 — 增强功能脚本
 * 包含：返回顶部 / Lightbox / Scrollspy / 进度条 / 入场动画
 *       汉堡菜单 / 增强播放器 / 直播状态 / 搜索 / 留言板
 *       社交分享 / 日程表 / 版权年份
 */

(function () {
    'use strict';

    // ============================================================
    // 全局音频控制 (被 HTML onclick 调用)
    // ============================================================
    var bgm = document.getElementById('bgm');
    var btn = document.getElementById('audio-btn');
    var isPlaying = false;

    window.toggleAudio = function () {
        if (!bgm || !btn) return;
        if (isPlaying) {
            bgm.pause();
            btn.classList.remove('playing');
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        } else {
            bgm.play().then(function () {
                btn.classList.add('playing');
                btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            }).catch(function () {});
        }
        isPlaying = !isPlaying;
    };

    // First click auto-play
    document.addEventListener('click', function firstClick() {
        if (!isPlaying && bgm) {
            bgm.play().then(function () {
                isPlaying = true;
                if (btn) {
                    btn.classList.add('playing');
                    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                }
            }).catch(function () {});
        }
        document.removeEventListener('click', firstClick);
    }, { once: true });

    // ============================================================
    // 5. 版权年份自动更新
    // ============================================================
    document.addEventListener('DOMContentLoaded', function () {
        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
    });

    // ============================================================
    // 1. 返回顶部按钮
    // ============================================================
    (function backToTop() {
        const btn = document.createElement('div');
        btn.id = 'back-to-top';
        btn.title = '返回顶部';
        btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4l-8 8h5v8h6v-8h5z"/></svg>';
        btn.style.cssText =
            'position:fixed;bottom:90px;right:24px;z-index:9998;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--pink),var(--purple));color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(240,98,146,0.4);transition:all .3s;opacity:0;pointer-events:none;';
        btn.onmouseenter = function () { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseleave = function () { btn.style.transform = 'scale(1)'; };
        btn.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
        document.body.appendChild(btn);

        window.addEventListener('scroll', function () {
            if (window.scrollY > 500) {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            } else {
                btn.style.opacity = '0';
                btn.style.pointerEvents = 'none';
            }
        });
    })();

    // ============================================================
    // 4. 页面滚动进度条
    // ============================================================
    (function progressBar() {
        const bar = document.createElement('div');
        bar.id = 'scroll-progress';
        bar.style.cssText =
            'position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--pink),var(--purple));z-index:99999;width:0%;transition:width .1s ease;';
        document.body.appendChild(bar);

        window.addEventListener('scroll', function () {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            bar.style.width = progress + '%';
        });
    })();

    // ============================================================
    // 9. 页面入场动画 (IntersectionObserver)
    // ============================================================
    (function entranceAnimation() {
        var sections = document.querySelectorAll('.section, .hero');
        sections.forEach(function (el, i) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            el.style.transitionDelay = (i * 0.05) + 's';
        });

        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            sections.forEach(function (el) { observer.observe(el); });
        } else {
            sections.forEach(function (el) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }
    })();

    // ============================================================
    // 2. 图片 Lightbox
    // ============================================================
    (function lightbox() {
        var imgs = document.querySelectorAll('.cover-img, .avatar img, .section img[src*="xiaofei"]');
        var overlay = document.createElement('div');
        overlay.id = 'lightbox';
        overlay.style.cssText =
            'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);cursor:pointer;';
        overlay.innerHTML =
            '<img id="lightbox-img" style="max-width:90vw;max-height:90vh;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:12px;box-shadow:0 8px 48px rgba(0,0,0,0.5);">';
        document.body.appendChild(overlay);

        var lbImg = document.getElementById('lightbox-img');
        overlay.onclick = function () { overlay.style.display = 'none'; };
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.style.display !== 'none') overlay.style.display = 'none';
        });

        imgs.forEach(function (img) {
            img.style.cursor = 'pointer';
            img.onclick = function (e) {
                e.stopPropagation();
                var src = img.getAttribute('src') || '';
                // Resolve relative paths
                if (src.startsWith('./')) src = src.slice(1);
                lbImg.src = src;
                overlay.style.display = 'block';
            };
        });
    })();

    // ============================================================
    // 3. 导航滚动高亮 (Scrollspy)
    // ============================================================
    (function scrollspy() {
        var navLinks = document.querySelectorAll('.nav-inner a');
        var sections = [];
        navLinks.forEach(function (a) {
            var href = a.getAttribute('href');
            if (href && href.startsWith('#')) {
                var el = document.getElementById(href.slice(1));
                if (el) sections.push({ el: el, link: a });
            }
        });

        function updateActive() {
            var scrollY = window.scrollY + 120;
            var currentId = '';
            sections.forEach(function (s) {
                var top = s.el.offsetTop;
                var height = s.el.offsetHeight;
                if (scrollY >= top && scrollY < top + height) {
                    currentId = s.el.id;
                }
            });
            navLinks.forEach(function (a) {
                a.classList.remove('active');
                if (a.getAttribute('href') === '#' + currentId) {
                    a.classList.add('active');
                }
            });
        }

        window.addEventListener('scroll', updateActive);
        window.addEventListener('load', updateActive);
        // Add active style
        var style = document.createElement('style');
        style.textContent = '.nav-inner a.active{color:var(--pink-dark)!important;font-weight:700!important;}';
        document.head.appendChild(style);
    })();

    // ============================================================
    // 8. 社交分享按钮
    // ============================================================
    (function socialShare() {
        var shareHtml =
            '<div id="share-bar" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px;">' +
            '<button onclick="socialShareWeibo()" style="background:#E6162D;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:0.85rem;cursor:pointer;font-weight:500;">分享到微博</button>' +
            '<button onclick="socialShareQQ()" style="background:#12B7F5;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:0.85rem;cursor:pointer;font-weight:500;">分享到QQ</button>' +
            '<button onclick="socialShareTwitter()" style="background:#1DA1F2;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:0.85rem;cursor:pointer;font-weight:500;">分享到Twitter</button>' +
            '</div>';

        var quoteBlock = document.querySelector('.quote-block');
        if (quoteBlock) {
            var div = document.createElement('div');
            div.innerHTML = shareHtml;
            quoteBlock.parentNode.insertBefore(div, quoteBlock.nextSibling);
        }

        window.socialShareWeibo = function () {
            var url = encodeURIComponent(window.location.href);
            var title = encodeURIComponent('关注塔菲谢谢喵 - 塔菲粉丝应援站');
            window.open('https://service.weibo.com/share/share.php?url=' + url + '&title=' + title, '_blank', 'width=600,height=500');
        };
        window.socialShareQQ = function () {
            var url = encodeURIComponent(window.location.href);
            var title = encodeURIComponent('关注塔菲谢谢喵 - 塔菲粉丝应援站');
            window.open('https://connect.qq.com/widget/shareqq/index.html?url=' + url + '&title=' + title, '_blank', 'width=600,height=500');
        };
        window.socialShareTwitter = function () {
            var text = encodeURIComponent('关注塔菲谢谢喵 - 塔菲粉丝应援站');
            var url = encodeURIComponent(window.location.href);
            window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank', 'width=600,height=500');
        };
    })();

    // ============================================================
    // 11. 移动端汉堡菜单
    // ============================================================
    (function hamburgerMenu() {
        var nav = document.querySelector('.nav-inner');
        if (!nav) return;

        var toggle = document.createElement('button');
        toggle.id = 'nav-toggle';
        toggle.setAttribute('aria-label', '菜单');
        toggle.innerHTML = '<span></span><span></span><span></span>';
        toggle.style.cssText =
            'display:none;background:none;border:none;cursor:pointer;padding:8px;flex-direction:column;gap:5px;';
        toggle.querySelectorAll('span').forEach(function (s) {
            s.style.cssText =
                'display:block;width:24px;height:2.5px;background:#7f5b80;border-radius:2px;transition:all .3s;';
        });

        // Insert toggle before nav links
        nav.parentNode.insertBefore(toggle, nav);

        // Check if mobile
        function checkMobile() {
            if (window.innerWidth <= 640) {
                toggle.style.display = 'flex';
                nav.style.display = 'none';
                nav.style.flexDirection = 'column';
                nav.style.position = 'absolute';
                nav.style.top = '100%';
                nav.style.left = '0';
                nav.style.right = '0';
                nav.style.background = 'rgba(255,255,255,0.97)';
                nav.style.backdropFilter = 'blur(12px)';
                nav.style.padding = '12px 24px';
                nav.style.borderBottom = '1px solid #fce4ec';
                nav.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
            } else {
                toggle.style.display = 'none';
                nav.style.display = 'flex';
                nav.style.flexDirection = 'row';
                nav.style.position = 'static';
                nav.style.background = 'transparent';
                nav.style.backdropFilter = 'none';
                nav.style.padding = '0';
                nav.style.borderBottom = 'none';
                nav.style.boxShadow = 'none';
            }
        }

        checkMobile();
        window.addEventListener('resize', checkMobile);

        var isOpen = false;
        toggle.onclick = function () {
            isOpen = !isOpen;
            nav.style.display = isOpen ? 'flex' : 'none';
            var spans = toggle.querySelectorAll('span');
            if (isOpen) {
                spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        };

        // Click a link -> close menu
        nav.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () {
                if (window.innerWidth <= 640) {
                    isOpen = false;
                    nav.style.display = 'none';
                    var spans = toggle.querySelectorAll('span');
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            });
        });
    })();

    // ============================================================
    // 14. 增强音频播放器
    // ============================================================
    (function enhancedAudio() {
        var playerWrap = document.getElementById('audio-player');
        var audio = document.getElementById('bgm');
        var btn = document.getElementById('audio-btn');
        if (!playerWrap || !audio) return;

        // Create expandable panel
        var panel = document.createElement('div');
        panel.id = 'audio-panel';
        panel.style.cssText =
            'display:none;position:absolute;bottom:64px;right:0;background:rgba(255,255,255,0.96);backdrop-filter:blur(12px);border-radius:16px;padding:16px;width:260px;box-shadow:0 8px 32px rgba(240,98,146,0.2);border:1px solid #fce4ec;';
        panel.innerHTML =
            '<div style="font-size:0.8rem;font-weight:600;color:var(--pink-dark);margin-bottom:8px;">关注塔菲谢谢喵</div>' +
            '<div class="audio-time" style="display:flex;justify-content:space-between;font-size:0.75rem;color:#999;margin-bottom:6px;">' +
            '<span id="audio-current">0:00</span><span id="audio-duration">0:00</span></div>' +
            '<input type="range" id="audio-seek" min="0" max="100" value="0" style="width:100%;accent-color:var(--pink);margin-bottom:10px;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
            '<label style="font-size:0.75rem;color:#888;">音量</label>' +
            '<input type="range" id="audio-volume" min="0" max="1" step="0.05" value="0.5" style="flex:1;accent-color:var(--pink);">' +
            '</div>';

        playerWrap.style.position = 'relative';
        playerWrap.appendChild(panel);

        var seekBar = document.getElementById('audio-seek');
        var volBar = document.getElementById('audio-volume');
        var currentTimeEl = document.getElementById('audio-current');
        var durationEl = document.getElementById('audio-duration');

        function formatTime(s) {
            if (isNaN(s) || !isFinite(s)) return '0:00';
            var m = Math.floor(s / 60);
            var sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        audio.addEventListener('loadedmetadata', function () {
            durationEl.textContent = formatTime(audio.duration);
            seekBar.max = audio.duration || 100;
        });

        audio.addEventListener('timeupdate', function () {
            if (!seekBar.dataset.dragging) {
                seekBar.value = audio.currentTime || 0;
            }
            currentTimeEl.textContent = formatTime(audio.currentTime);
        });

        seekBar.addEventListener('input', function () {
            seekBar.dataset.dragging = 'true';
        });

        seekBar.addEventListener('change', function () {
            audio.currentTime = parseFloat(seekBar.value);
            delete seekBar.dataset.dragging;
        });

        volBar.addEventListener('input', function () {
            audio.volume = parseFloat(volBar.value);
        });

        // Toggle panel on btn right-click or long-press? Use click to toggle panel
        btn.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // Add a small expand indicator to the button
        var expandIcon = document.createElement('span');
        expandIcon.textContent = '▸';
        expandIcon.style.cssText =
            'position:absolute;top:-2px;right:-2px;font-size:10px;color:#fff;background:var(--purple);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;';
        btn.style.position = 'relative';
        btn.appendChild(expandIcon);

        // Click expand icon to toggle panel
        expandIcon.onclick = function (e) {
            e.stopPropagation();
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        };

        // Click outside to close
        document.addEventListener('click', function (e) {
            if (!playerWrap.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    })();

    // ============================================================
    // 13. 塔菲直播状态看板
    // ============================================================
    (function liveStatus() {
        var nav = document.querySelector('.nav-inner');
        if (!nav) return;

        var badge = document.createElement('span');
        badge.id = 'live-status';
        badge.style.cssText =
            'display:inline-flex;align-items:center;gap:4px;font-size:0.78rem;font-weight:600;padding:2px 10px;border-radius:12px;margin-left:auto;flex-shrink:0;';
        badge.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#ccc;display:inline-block;"></span> 查询中...';
        nav.appendChild(badge);

        function checkLive() {
            var xhr = new XMLHttpRequest();
            xhr.timeout = 5000;
            xhr.onload = function () {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data && data.data && data.data.live_status === 1) {
                        badge.innerHTML =
                            '<span style="width:8px;height:8px;border-radius:50%;background:#ff1744;display:inline-block;animation:pulse 1.5s infinite;"></span> 直播中';
                        badge.style.background = 'rgba(255,23,68,0.12)';
                        badge.style.color = '#d50000';
                    } else {
                        badge.innerHTML =
                            '<span style="width:8px;height:8px;border-radius:50%;background:#aaa;display:inline-block;"></span> 未开播';
                        badge.style.background = 'rgba(0,0,0,0.05)';
                        badge.style.color = '#888';
                    }
                } catch (e) {
                    badge.innerHTML =
                        '<span style="width:8px;height:8px;border-radius:50%;background:#aaa;display:inline-block;"></span> 未知';
                    badge.style.background = 'rgba(0,0,0,0.05)';
                    badge.style.color = '#888';
                }
            };
            xhr.onerror = function () {
                badge.innerHTML =
                    '<span style="width:8px;height:8px;border-radius:50%;background:#aaa;display:inline-block;"></span> 离线';
                badge.style.background = 'rgba(0,0,0,0.05)';
                badge.style.color = '#888';
            };
            xhr.open('GET', 'https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?roomid=22603245', true);
            xhr.send();
        }

        checkLive();
        setInterval(checkLive, 120000); // Check every 2 minutes
    })();

    // ============================================================
    // 22. 站内搜索 (Fuse.js via CDN)
    // ============================================================
    (function initSearch() {
        // Build search index from existing content
        var searchData = [];

        // Collect text from all sections
        var sections = document.querySelectorAll('.section, .hero');
        sections.forEach(function (s) {
            var id = s.id || '';
            var title = '';
            var titleEl = s.querySelector('.section-title');
            if (titleEl) title = titleEl.textContent.trim();
            else if (s.classList.contains('hero')) title = '首页';
            var text = s.textContent.trim().substring(0, 500);
            searchData.push({ id: id, title: title, text: text });
        });

        // Add quotes section
        var quoteBlock = document.querySelector('.quote-block');
        if (quoteBlock) {
            searchData.push({ id: 'quote', title: '名言', text: quoteBlock.textContent.trim() });
        }

        window.__searchData = searchData;

        // Inject Fuse.js via dynamic script
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.basic.min.js';
        script.onload = function () {
            if (typeof Fuse !== 'undefined') {
                window.__fuse = new Fuse(searchData, {
                    keys: ['title', 'text'],
                    threshold: 0.4,
                    includeScore: true
                });
            }
        };
        document.head.appendChild(script);
    })();

    // ============================================================
    // 15. 应援留言板 (GitHub Issues)
    // ============================================================
    (function guestbook() {
        var container = document.getElementById('guestbook-list');
        if (!container) return;

        var repo = 'ciallo0721-cmd/tf';
        var label = '应援留言';
        var apiUrl = 'https://api.github.com/repos/' + repo + '/issues?labels=' + encodeURIComponent(label) +
        '&state=all&per_page=20&sort=created&direction=desc';

        container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">加载留言中...</div>';

        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
            try {
                var issues = JSON.parse(xhr.responseText);
                if (Array.isArray(issues) && issues.length > 0) {
                    var html = '';
                    issues.forEach(function (issue) {
                        if (issue.pull_request) return;
                        var date = new Date(issue.created_at).toLocaleDateString('zh-CN');
                        var body = (issue.body || '').substring(0, 200);
                        if (issue.body && issue.body.length > 200) body += '...';
                        html +=
                            '<div style="background:var(--card-bg);border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(240,98,146,0.06);">' +
                            '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">' +
                            '<strong style="color:var(--pink-dark);font-size:0.9rem;">' + escapeHtml(issue.user.login) +
                            '</strong>' +
                            '<span style="color:#aaa;font-size:0.78rem;">' + date + '</span></div>' +
                            '<div style="font-size:0.88rem;color:#555;">' + escapeHtml(body) + '</div>' +
                            '</div>';
                    });
                    container.innerHTML = html;
                } else {
                    container.innerHTML =
                        '<div style="text-align:center;padding:20px;color:#888;font-size:0.9rem;">还没有留言，快来发表第一条应援吧！</div>';
                }
            } catch (e) {
                container.innerHTML =
                    '<div style="text-align:center;padding:20px;color:#888;font-size:0.9rem;">留言加载失败 ヽ(；▽；)ノ</div>';
            }
        };
        xhr.onerror = function () {
            container.innerHTML =
                '<div style="text-align:center;padding:20px;color:#888;font-size:0.9rem;">留言加载失败 ヽ(；▽；)ノ</div>';
        };
        xhr.open('GET', apiUrl, true);
        xhr.send();

        function escapeHtml(text) {
            if (!text) return '';
            var d = document.createElement('div');
            d.textContent = text;
            return d.innerHTML;
        }
    })();

})();
