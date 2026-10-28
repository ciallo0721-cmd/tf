#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 index.html 的单页锚点内容拆成独立 URL 页面。

为什么拆：单页锚点（#profile / #songs ...）搜索引擎不当独立页，
导致整站只能抢「塔菲」这一个打不过 B 站的大词，
永远吃不到「永雏塔菲生日」「永雏塔菲原创歌曲」这类长尾。

用法：  python tools/build_pages.py
输出：  profile/ story/ songs/ games/ trivia/ links/ 六个目录，各含 index.html
       同时刷新 sitemap.xml
"""
import os
import re
import json
import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://xn--d6qr7hrtcb06avk0aljka.top"
TODAY = datetime.date.today().isoformat()

SRC = os.path.join(ROOT, "index.html")
src = open(SRC, encoding="utf-8").read()
lines = src.split("\n")


# ---------------------------------------------------------------- 抽取工具
def slice_lines(a, b):
    """取 1-based 闭区间行"""
    return "\n".join(lines[a - 1:b])


def grab_block(start_pat, end_pat, frm=1):
    """按行首特征抽取一个块（含首尾）"""
    s = None
    for i in range(frm - 1, len(lines)):
        if re.search(start_pat, lines[i]):
            s = i
            break
    if s is None:
        raise SystemExit("找不到块起点：" + start_pat)
    for j in range(s, len(lines)):
        if re.search(end_pat, lines[j]):
            return "\n".join(lines[s:j + 1])
    raise SystemExit("找不到块终点：" + end_pat)


def grab_section(sec_id):
    """按 id 抽取 <section> ... </section>（标签配平）"""
    start = None
    for i, ln in enumerate(lines):
        if re.search(r'<section[^>]*id="%s"' % re.escape(sec_id), ln):
            start = i
            break
    if start is None:
        raise SystemExit("找不到 section: " + sec_id)
    depth = 0
    out = []
    for j in range(start, len(lines)):
        ln = lines[j]
        depth += len(re.findall(r"<section\b", ln))
        depth -= len(re.findall(r"</section>", ln))
        out.append(ln)
        if depth == 0:
            return "\n".join(out)
    raise SystemExit("section 未闭合: " + sec_id)


# 锚点 -> 所在页面
ANCHOR_PAGE = {
    "top": "/",
    "profile": "/profile/", "facts": "/profile/", "settings": "/profile/",
    "story": "/story/", "timeline": "/story/",
    "songs": "/songs/",
    "achievements": "/games/", "games2025": "/games/",
    "trivia": "/trivia/",
    "links": "/links/",
    "schedule": "/", "guestbook": "/", "comments": "/", "disclaimer": "/",
}

NAV_ITEMS = [
    ("档案", "profile"), ("故事", "story"), ("历程", "timeline"),
    ("百科", "facts"), ("趣闻", "trivia"), ("作品", "songs"),
    ("成就", "achievements"), ("游戏", "games2025"), ("日程", "schedule"),
    ("链接", "links"),
]

FOOTER = re.search(r'    <footer class="footer">[\s\S]*?</footer>', src).group(0)
DOCK = re.search(r'    <!-- =+ Dock =+ -->[\s\S]*?(?=    <!-- =+ 命令面板)', src).group(0)
LIGHTBOX = re.search(r'    <!-- =+ Lightbox =+ -->[\s\S]*?</div>', src).group(0)
AUDIO = re.search(r'    <audio id="bgm"[\s\S]*?</audio>', src).group(0)


def rewrite(html, page_slugs, host_anchors):
    """把区块里的锚点/相对资源改写成子页面可用形式"""
    # 首页给各板块插的「看完整页 →」在子页里是多余的自链接，剔掉
    html = re.sub(r'[ \t]*<p class="page-next">[\s\S]*?</p>[ \t]*\r?\n?', '', html)

    def fix_anchor(m):
        a = m.group(1)
        if a in host_anchors:
            return 'href="#%s"' % a
        return 'href="%s"' % ANCHOR_PAGE.get(a, "/#" + a)

    html = re.sub(r'href="#([A-Za-z0-9_-]+)"', fix_anchor, html)

    # 相对资源上跳一级
    for a, b in [
        ('"./assets/', '"../assets/'),
        ('"./avatar.webp', '"../avatar.webp'),
        ('"./cover.webp', '"../cover.webp'),
        ('"./gztfxxm.MP3', '"../gztfxxm.MP3'),
        ('"./feed.xml', '"../feed.xml'),
        ('"./manifest.json', '"../manifest.json'),
        ('"./sw.js', '"../sw.js'),
    ]:
        html = html.replace(a, b)
    return html


def build_nav(host_anchors):
    """站内导航：当前页锚点用 #，其余跳到对应子页面"""
    items = []
    for label, anchor in NAV_ITEMS:
        if anchor in host_anchors:
            href = "#" + anchor
            cls = ""
        else:
            href = ANCHOR_PAGE[anchor]
            cls = ""
        items.append('<a href="%s"%s>%s</a>' % (href, cls, label))
    desktop = "\n                ".join(items)
    sheet = "\n        ".join(items)
    return desktop, sheet


PAGES = [
    dict(
        slug="profile",
        eyebrow="Profile · 档案",
        h1='永雏<b>塔菲</b>档案',
        subtitle="本名、生日、身高、出身设定、形象设计——关于塔菲（塔菲喵）的基本设定都整理在这一页。",
        title="永雏塔菲档案｜生日·身高·出身设定｜塔菲喵资料",
        desc="永雏塔菲（Ace Taffy / 塔菲喵）完整档案：本名与别名、设定生日 1868 年 8 月 12 日、出身威尔士、身高 148cm 含呆毛、粉丝名雏草姬、形象设计神乐七奈、Live2D 千铃 SR，附设定补充与速览问答。",
        sections=["profile", "facts", "settings"],
        intro=[
            "这一页集中收录永雏塔菲的人物设定：本名与各种绰号的来历、设定生日与出身、外形参数、形象与 Live2D 的制作方，以及「小百科」里那些一句话就能记住的特征。",
            "往下还有「设定补充」，涵盖时光机规格、随身物品、喜欢与讨厌的东西，以及那只名叫小皮的垂耳兔。这些都是理解塔菲言行的钥匙——比如为什么她会说时光机载重必须 ≥129.3kg。",
        ],
        faq=[
            ("永雏塔菲的生日是什么时候？",
             "设定生日为 1868 年 8 月 12 日，出身威尔士。她自称永远 17 岁。"),
            ("永雏塔菲有多高？",
             "身高 148cm（含呆毛），体重 80 斤不到（本人说法）。发色为粉色、瞳色为金色，常戴心形护目镜。"),
            ("永雏塔菲的形象是谁设计的？",
             "形象设计为神乐七奈（nanakagura），Live2D 模型制作是千铃 SR。"),
            ("「永雏塔菲」这个名字是什么意思？",
             "「永雏」是 Ace 的日语借字表记，写作永雏但读作 Ace，意为「王牌」；「塔菲」是 Taffy 的音译。"),
            ("永雏塔菲是猫娘吗？",
             "不是。两侧看起来像猫耳的部分其实是「耳状发」，里面有骨头且非常敏感。塔菲本人多次否认是猫娘。"),
            ("永雏塔菲的粉丝叫什么？",
             "粉丝名是「雏草姬」，代表符号是四叶草，吉祥物叫「菲球」。"),
        ],
    ),
    dict(
        slug="story",
        eyebrow="Origin · 故事",
        h1='塔菲的<b>故事</b>',
        subtitle="从 1868 年的威尔士，到 2021 年的直播间——名字的来历、时光机的事故，以及无公会无团队的出道。",
        title="永雏塔菲的故事与活动历程｜从 1868 威尔士到 2021 出道",
        desc="永雏塔菲的出身故事：名字由 Ace 借字表记得来，1868 年生于威尔士，1883 年继承侦探事务所后转行发明，造出时光机却迟到 36 年落到 2021 年，以个人势出道。附 2021–2025 活动历程年表。",
        sections=["story", "timeline"],
        intro=[
            "「永雏」读作 Ace，「塔菲」是 Taffy——名字本身就是一个小小的梗。这一页讲清楚她是谁、为什么会在 2021 年出现在直播间，以及这五年一路走来的关键节点。",
            "年表按年份分组，从 2021 年出道、2022 年千舰与超管拉锯、2023 年百万粉金盾，一直排到 2025 年转入游戏区。",
        ],
        faq=[
            ("永雏塔菲是哪一年出道的？",
             "2021 年 6 月，以个人势虚拟偶像出道，出道口号就是「关注塔菲谢谢喵」。"),
            ("永雏塔菲为什么被叫「王牌发明家」？",
             "1883 年她继承了侦探事务所，但那时福尔摩斯正因「斑点带子案件」声名大噪，侦探业内卷严重，她接不到委托，只好宅在事务所搞发明，最大杰作是时光机。"),
            ("永雏塔菲的时光机为什么迟到 36 年？",
             "她把穿越目标设为 100 年后即 1985 年，结果时光机迟到了整整 36 年，降落在 2021 年。本想修好继续赶路，却发现了电子游戏，从此决定不回去。"),
            ("永雏塔菲是个人势吗？",
             "是。无公会、无 MCN、无团队，出道不到三年就达成 B 站百万粉金盾、千舰成就与多首原创歌曲。"),
        ],
    ),
    dict(
        slug="songs",
        eyebrow="Discography · 作品",
        h1='原创<b>歌曲</b>',
        subtitle="五首原创曲，以及 2021 到 2025 一路唱过来的翻唱精选。",
        title="永雏塔菲原创歌曲列表｜关注塔菲谢谢喵等 5 首原创曲",
        desc="永雏塔菲全部原创歌曲一览：真実の鍵（独立游戏《1883》OP）、又一遍的歌、未来旅行（百万粉纪念曲）、虚拟假面、关注塔菲谢谢喵（原创应援曲），附各年份翻唱精选。",
        sections=["songs"],
        intro=[
            "塔菲的原创曲目前共 5 首，从 2023 年的《真実の鍵》到 2025 年的《关注塔菲谢谢喵》，每首都对得上一个时间节点——独立游戏主题曲、百万粉纪念、以及后来变成站名的应援曲。",
            "下面还按年份列了翻唱精选，2021 到 2025 一年不落。想听原曲请到 B 站空间或网易云、QQ 音乐的歌手主页。",
        ],
        faq=[
            ("永雏塔菲有哪些原创歌曲？",
             "共 5 首：《真実の鍵》（2023.06.25，独立游戏《1883》OP）、《又一遍的歌》（2023.12.31）、《未来旅行》（2024.02.24，百万粉纪念曲）、《虚拟假面》（2025.02.03）、《关注塔菲谢谢喵》（2025.07.04，原创应援曲）。"),
            ("《未来旅行》是什么歌？",
             "永雏塔菲的百万粉纪念曲，2024 年 2 月 24 日发布。"),
            ("《关注塔菲谢谢喵》是原创曲吗？",
             "是。2025 年 7 月 4 日发布的原创应援曲，也是本站站名与塔菲口头禅的来源。"),
            ("《真実の鍵》是哪款游戏的主题曲？",
             "独立游戏《1883》的 OP，2023 年 6 月 25 日发布。"),
        ],
    ),
    dict(
        slug="games",
        eyebrow="Games · 游戏",
        h1='游戏与<b>成就</b>',
        subtitle="302 个直播游戏日、98 款游戏，以及那些刻在奖杯墙上的时刻。",
        title="永雏塔菲 2025 游戏总结｜302 个直播日·98 款游戏",
        desc="永雏塔菲 2025 年游戏总结与成就墙：302 个直播游戏日、98 款游戏、91 款新播、375 条录播链接，含逐月清单与通关记录（壶男、空洞骑士、艾尔登法环、黑神话悟空等）。",
        sections=["achievements", "games2025"],
        intro=[
            "2025 年塔菲有 302 个直播游戏日，播了 98 款游戏，其中 91 款是第一次播（含 DLC）——15 款播了十场以上，35 款只播了一场。",
            "上面是成就墙：游戏通关记录、里程碑与出演作品；下面是 2025 全年逐月游戏清单，按月份分组，每条都附了英文名，方便对照 Steam。",
        ],
        faq=[
            ("永雏塔菲 2025 年直播了多少款游戏？",
             "302 个直播游戏日，98 款游戏。其中 91 款为新播游戏（含 DLC），15 款直播十场以上，35 款只直播了一场，另有 375 条录播链接。"),
            ("永雏塔菲通关过哪些游戏？",
             "壶男通关 50 次（2021.08.14）、空洞骑士五门通关（2021.06.27）、艾尔登法环白金奖杯（2022.03.17）、黑魂系列全通关（2024.03.09）、平衡球通关（2024.02.01）、黑神话悟空天命挑战组队赛第一名（2024.08.25）。"),
            ("永雏塔菲达成过哪些里程碑？",
             "2022.02.23 千舰、2023.12.31 B 站百万粉金盾、2024.05.04 首次全息个唱「Ace Taffy Only 1st Live」。"),
            ("永雏塔菲出演过哪些游戏？",
             "魂器学院、节奏大师、雀姬、盲盒派对、旋转音律。另有原创游戏《1883 科学与灵媒》在 Steam 上架。"),
        ],
    ),
    dict(
        slug="trivia",
        eyebrow="Fun Facts · 趣闻",
        h1='趣闻<b>合集</b>',
        subtitle="菲球、超管、威尔士人和蒙娜塔菲的微笑。",
        title="永雏塔菲趣闻与梗合集｜菲球·游标卡尺·蒙娜塔菲",
        desc="永雏塔菲的梗与趣闻合集：吉祥物菲球的来历与全称、和 B 站超管的战斗史、「威尔士人」二设怎么来的、历年愚人节整活、生日歌传统，以及《蒙娜塔菲的微笑》。",
        sections=["trivia"],
        intro=[
            "粉丝站的乐趣一半在这些梗上。这一页收的是塔菲在直播和微博里真实发生过的事：菲球是怎么被雏草姬「改造」出来的、二设「威尔士人」的翻译事故、以及 2021 到 2022 年那串和超管有关的日期。",
            "这些都是原样整理，没有加工——包括愚人节换头像、以及那幅被本人命名为《蒙娜塔菲的微笑》的油画。",
        ],
        faq=[
            ("菲球是什么？",
             "永雏塔菲的吉祥物，全称「无敌的勇敢的性感的神秘的迷人的帅气的神奇的勤勉的强势的华丽的激情的可怕的漂亮的粉色王牌菲球」。由喵田弥夜 Miya 创作，2021 年 6 月首次出现，经命名投票定名「菲球」，本质是由雏草姬改造而来的毛绒玩具。"),
            ("「威尔士人」这个梗是怎么来的？",
             "神乐七奈某次直播用了翻译机，把「塔菲酱是我自豪的女儿」生草翻译成了「女儿是自大的威尔士人」，从此塔菲就有了「威尔士人」这个二设。"),
            ("《蒙娜塔菲的微笑》是什么？",
             "2024 年 3 月 31 日塔菲在微博展示的自画油画，取名《蒙娜塔菲的微笑》；同年 12 月 24 日圣诞直播又现场作画，命名为《2024 雪绒花下的笑哭誓约：雏草姬和塔菲的笑哭之夜》。"),
            ("永雏塔菲的生日歌是什么？",
             "每当雏草姬过生日（或假装过生日），塔菲会吹着笛子唱「祝你生日快乐」，后来进化出第二版「对所有的烦恼说拜拜，对所有的快乐说嗨嗨」。恐怖游戏里也用来壮胆。"),
        ],
    ),
    dict(
        slug="links",
        eyebrow="Links · 链接",
        h1='全平台<b>链接</b>',
        subtitle="想追塔菲，这些地方都能找到她。",
        title="永雏塔菲全平台链接｜B站直播间·微博·X·YouTube",
        desc="永雏塔菲官方账号汇总：B 站空间 UID 1265680561、B 站直播间 22603245、微博、Twitter/X、YouTube、小红书、网易云音乐与 QQ 音乐歌手主页，一站直达。",
        sections=["links"],
        intro=[
            "塔菲的主阵地在 B 站，但微博、X、YouTube、小红书也都在更新，网易云和 QQ 音乐上有歌手主页。这一页把官方账号集中列出，避免你搜到高仿号。",
            "认准 B 站直播间 22603245 与空间 UID 1265680561——这两个编号是最不容易出错的验证方式。",
        ],
        faq=[
            ("永雏塔菲的直播间是哪个？",
             "B 站直播间 22603245，对应 B 站空间 UID 1265680561。"),
            ("永雏塔菲在哪些平台活动？",
             "B 站（主阵地）、微博、Twitter/X、YouTube、小红书，音乐平台有网易云音乐与 QQ 音乐的歌手主页。"),
            ("永雏塔菲的 X（Twitter）账号是什么？",
             "@AceTaffy812。"),
        ],
    ),
]

# ---------------------------------------------------------------- CSS 增量
CSS_ADD = """
/* ===== 子页面（拆页）===== */
.page-hero {
    padding-top: clamp(105px, 15vw, 160px);
    padding-bottom: clamp(6px, 2vw, 16px);
}

.page-h1 {
    font-size: clamp(32px, 5.2vw, 52px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -.03em;
    color: var(--text);
    margin: 10px 0 14px;
}

.page-h1 b {
    font-weight: 800;
    background: var(--brand-grad);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}

.page-crumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: .06em;
    color: var(--text-3);
    margin-bottom: 6px;
}

.page-crumb a {
    color: var(--accent);
}

.page-crumb span {
    opacity: .5;
}

.page-intro p + p {
    margin-top: 12px;
}

.page-sec-tight {
    padding-top: 0;
}

.page-sub-tight {
    margin-bottom: 0;
}

.page-next {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
}

.page-next a {
    display: inline-flex;
    align-items: center;
    height: 40px;
    padding: 0 18px;
    border-radius: var(--r-pill);
    border: 1px solid var(--hairline);
    background: var(--surface);
    font-size: .9rem;
    font-weight: 600;
    color: var(--text-2);
    transition: .2s;
}

.page-next a:hover {
    color: var(--accent);
    border-color: var(--accent);
}
"""

PAGE_TPL = """<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>$title</title>
    <meta name="description" content="$desc" />
    <meta name="author" content="ciallo0721-cmd" />
    <link rel="canonical" href="$url" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />

    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="关注塔菲谢谢喵 · 永雏塔菲粉丝站" />
    <meta property="og:title" content="$title" />
    <meta property="og:description" content="$desc" />
    <meta property="og:image" content="$site/cover.webp" />
    <meta property="og:url" content="$url" />
    <meta property="og:locale" content="zh_CN" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="$title" />
    <meta name="twitter:description" content="$desc" />
    <meta name="twitter:image" content="$site/cover.webp" />

    <meta name="theme-color" content="#fbfbfd" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />

    <link rel="icon" href="$rel/avatar.webp" type="image/webp" />
    <link rel="shortcut icon" href="$rel/avatar.webp" type="image/webp" />
    <link rel="apple-touch-icon" href="$rel/avatar.webp" />
    <link rel="manifest" href="$rel/manifest.json" />
    <link rel="alternate" type="application/rss+xml" title="关注塔菲谢谢喵 · 永雏塔菲粉丝站" href="$rel/feed.xml" />

    <link rel="preconnect" href="https://www.googletagmanager.com" />
    <link rel="stylesheet" href="$rel/assets/style.css" />

    <script type="application/ld+json">
$jsonld
    </script>

    <script>
        (function () {
            document.documentElement.classList.add('js');
            try {
                var saved = localStorage.getItem('taffy-theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
            } catch (e) { }
        })();
    </script>

    <script async src="https://www.googletagmanager.com/gtag/js?id=G-CS8EP2CV6B"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-CS8EP2CV6B');
    </script>
</head>

<body>
    <a class="skip-link" href="#main">跳到主要内容</a>

    <div class="bg-layer" aria-hidden="true">
        <div class="bg-mesh"></div>
        <div class="bg-grid"></div>
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
        <div class="bg-orb orb-3"></div>
        <div class="bg-noise"></div>
    </div>

    <div id="scroll-progress" aria-hidden="true"></div>

    <header class="nav" id="nav">
        <div class="nav__inner">
            <a class="nav__brand" href="$rel/">
                <span class="nav__mark" aria-hidden="true">菲</span>
                <span>关注塔菲谢谢喵</span>
            </a>

            <nav class="nav__links" id="navLinks" aria-label="站内导航">
                <span class="nav__pill" id="navPill" aria-hidden="true"></span>
                $nav_desktop
            </nav>

            <div class="nav__tools">
                <button class="icon-btn" id="themeToggle" aria-label="切换深浅色模式" title="切换主题">
                    <svg viewBox="0 0 24 24" id="themeIcon" aria-hidden="true">
                        <circle cx="12" cy="12" r="4.2" />
                        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
                    </svg>
                </button>
                <button class="nav__toggle" id="navToggle" aria-label="展开菜单" aria-expanded="false"
                    aria-controls="navSheet">
                    <span></span><span></span><span></span>
                </button>
            </div>
        </div>
    </header>

    <nav class="nav__sheet" id="navSheet" aria-label="移动端导航">
        $nav_sheet
    </nav>

    <main id="main">

        <section class="section page-hero" aria-labelledby="pageTitle">
            <div class="wrap">
                <nav class="page-crumb" aria-label="面包屑">
                    <a href="$rel/">首页</a>
                    <span>/</span>
                    <span>$eyebrow_plain</span>
                </nav>
                <p class="eyebrow">$eyebrow</p>
                <h1 class="page-h1" id="pageTitle">$h1</h1>
                <p class="sec-sub">$subtitle</p>
            </div>
        </section>

        <section class="section page-sec-tight">
            <div class="wrap">
                <div class="card card__pad page-intro" data-reveal>
$intro_ps
                </div>
            </div>
        </section>

$sections_html

        <section class="section">
            <div class="wrap">
                <div class="card card__pad" data-reveal>
                    <p class="eyebrow">继续逛</p>
                    <p class="sec-sub page-sub-tight">这个站还有这些内容：</p>
                    <div class="page-next">
$next_links
                    </div>
                </div>
            </div>
        </section>

    </main>

$footer

$dock

$lightbox

$audio

    <script src="$rel/assets/app.js" defer></script>
</body>

</html>
"""


def build_jsonld(p, url):
    faq_entities = [{
        "@type": "Question",
        "name": q,
        "acceptedAnswer": {"@type": "Answer", "text": a},
    } for q, a in p["faq"]]

    graph = [
        {
            "@type": "WebPage",
            "@id": url + "#webpage",
            "url": url,
            "name": p["title"],
            "description": p["desc"],
            "isPartOf": {"@id": SITE + "/#website"},
            "inLanguage": "zh-CN",
            "datePublished": TODAY,
            "dateModified": TODAY,
            "primaryImageOfPage": {"@type": "ImageObject", "url": SITE + "/cover.webp"},
            "breadcrumb": {"@id": url + "#breadcrumb"},
            "about": {"@id": SITE + "/#taffy"},
        },
        {
            "@type": "BreadcrumbList",
            "@id": url + "#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "首页", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": p["eyebrow"].split("·")[-1].strip()},
            ],
        },
        {
            "@type": "FAQPage",
            "@id": url + "#faq",
            "isPartOf": {"@id": url + "#webpage"},
            "mainEntity": faq_entities,
        },
    ]

    if p["slug"] == "songs":
        songs = [
            ("真実の鍵", "2023-06-25", "独立游戏《1883》OP"),
            ("又一遍的歌", "2023-12-31", ""),
            ("未来旅行", "2024-02-24", "百万粉纪念曲"),
            ("虚拟假面", "2025-02-03", ""),
            ("关注塔菲谢谢喵", "2025-07-04", "原创应援曲"),
        ]
        graph.append({
            "@type": "ItemList",
            "@id": url + "#songs",
            "name": "永雏塔菲原创歌曲",
            "numberOfItems": len(songs),
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1,
                 "item": {"@type": "MusicRecording", "name": n, "datePublished": d,
                          **({"description": note} if note else {}), "byArtist": {"@id": SITE + "/#taffy"}}}
                for i, (n, d, note) in enumerate(songs)
            ],
        })

    if p["slug"] == "links":
        graph.append({
            "@type": "ItemList",
            "@id": url + "#accounts",
            "name": "永雏塔菲官方账号",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "B站空间", "url": "https://space.bilibili.com/1265680561"},
                {"@type": "ListItem", "position": 2, "name": "B站直播间", "url": "https://live.bilibili.com/22603245"},
                {"@type": "ListItem", "position": 3, "name": "微博", "url": "https://weibo.com/7618923072"},
                {"@type": "ListItem", "position": 4, "name": "X / Twitter", "url": "https://twitter.com/AceTaffy812"},
                {"@type": "ListItem", "position": 5, "name": "YouTube", "url": "https://www.youtube.com/channel/UC-WTKBWDsp0PFcGmmuO7svg"},
                {"@type": "ListItem", "position": 6, "name": "小红书", "url": "https://www.xiaohongshu.com/user/profile/681f2206000000000e010c96"},
                {"@type": "ListItem", "position": 7, "name": "QQ 音乐", "url": "https://y.qq.com/n/ryqq/singer/002rjVPW05pN0s"},
            ],
        })

    return json.dumps({"@context": "https://schema.org", "@graph": graph},
                      ensure_ascii=False, indent=2)


def main():
    made = []
    for p in PAGES:
        url = SITE + "/" + p["slug"] + "/"
        rel = ".."
        host_anchors = set(p["sections"]) | {"top", "main"}
        nav_desktop, nav_sheet = build_nav(host_anchors)

        parts = []
        for i, sec_id in enumerate(p["sections"]):
            block = grab_section(sec_id)
            if i == 0 and p.get("strip_head", True):
                # 首个板块的小标题与页面 h1 重复，去掉
                block = re.sub(r'[ \t]*<div class="sec-head"[^>]*>[\s\S]*?</div>[ \t]*\r?\n?', '', block, count=1)
                # 去掉小标题后上留白会过大，收紧一点
                block = block.replace('<section class="section"', '<section class="section page-sec-tight"', 1)
            parts.append(rewrite(block, [p["slug"]], host_anchors))
        sections_html = "\n\n".join(parts)
        intro_ps = "\n".join("                    <p>%s</p>" % t for t in p["intro"])

        others = [x for x in PAGES if x["slug"] != p["slug"]]
        next_links = "\n".join(
            '                        <a href="/%s/">%s</a>' % (x["slug"], x["h1"].replace("<b>", "").replace("</b>", ""))
            for x in others
        )

        html = (PAGE_TPL
                .replace("$jsonld", build_jsonld(p, url))
                .replace("$title", p["title"])
                .replace("$desc", p["desc"])
                .replace("$subtitle", p["subtitle"])
                .replace("$eyebrow_plain", p["eyebrow"].split("·")[-1].strip())
                .replace("$eyebrow", p["eyebrow"])
                .replace("$h1", p["h1"])
                .replace("$intro_ps", intro_ps)
                .replace("$next_links", next_links)
                .replace("$sections_html", sections_html)
                .replace("$nav_desktop", nav_desktop)
                .replace("$nav_sheet", nav_sheet)
                .replace("$footer", rewrite(FOOTER, [p["slug"]], host_anchors))
                .replace("$dock", rewrite(DOCK, [p["slug"]], host_anchors))
                .replace("$lightbox", LIGHTBOX)
                .replace("$audio", rewrite(AUDIO, [p["slug"]], host_anchors))
                .replace("$url", url)
                .replace("$site", SITE)
                .replace("$rel", rel)
                )

        out_dir = os.path.join(ROOT, p["slug"])
        os.makedirs(out_dir, exist_ok=True)
        out = os.path.join(out_dir, "index.html")
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(html)
        made.append((p["slug"], url, len(html)))
        print("生成 %-8s %6d 字节  %s" % (p["slug"], len(html), url))

    # sitemap
    urls = [("/", 1.0, "weekly")] + [("/%s/" % p["slug"], 0.8, "monthly") for p in PAGES]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, pri, freq in urls:
        sm += ["  <url>",
               "    <loc>%s%s</loc>" % (SITE, path),
               "    <lastmod>%s</lastmod>" % TODAY,
               "    <changefreq>%s</changefreq>" % freq,
               "    <priority>%.1f</priority>" % pri,
               "  </url>"]
    sm.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(sm) + "\n")
    print("sitemap.xml 已更新：%d 条 URL" % len(urls))

    # CSS 增量（幂等）
    css_path = os.path.join(ROOT, "assets", "style.css")
    css = open(css_path, encoding="utf-8").read()
    marker = "/* ===== 子页面（拆页）===== */"
    if marker not in css:
        with open(css_path, "a", encoding="utf-8", newline="\n") as f:
            f.write(CSS_ADD)
        print("style.css 已追加子页面样式")
    else:
        print("style.css 已存在子页面样式，跳过")


if __name__ == "__main__":
    main()
