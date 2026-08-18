const state = {
  route: "home",
  query: "",
  sport: "All",
  year: "All",
  modal: null,
  authTab: "login",
  adminTab: "publish",
  editingArticleId: null,
  pendingSubscriptionPlan: null,
  adminVerified: JSON.parse(localStorage.getItem("hoco_admin_verified") || "false"),
  user: JSON.parse(localStorage.getItem("sp_user") || "null"),
  accounts: JSON.parse(localStorage.getItem("hoco_accounts") || "[]"),
  adminEmails: JSON.parse(localStorage.getItem("hoco_admin_emails") || '["admin@hocosportsalmanac.com"]'),
  reads: JSON.parse(localStorage.getItem("sp_reads") || "null") || {
    count: 0,
    month: new Date().toISOString().slice(0, 7),
    article_ids: [],
  },
  membersLoaded: false,
};

const AUTHOR_NAME = "Willie Sean Coughlan";
const SITE_NAME = "HoCo Sports Almanac";
const sports = [
  "football",
  "basketball",
  "baseball",
  "hockey",
  "soccer",
  "lacrosse",
  "wrestling",
  "track",
  "volleyball",
  "cheer",
  "cross country",
  "golf",
  "field hockey",
  "flag football",
  "softball",
  "tennis",
  "gymnastics",
];
const currentDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

const articleImages = {
  football:
    "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1400&q=80",
  basketball:
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80",
  baseball:
    "https://images.unsplash.com/photo-1508344928928-7165b67de128?auto=format&fit=crop&w=1400&q=80",
  soccer:
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=80",
  lacrosse:
    "https://images.unsplash.com/photo-1746826093063-92ad5a2f0f77?auto=format&fit=crop&w=1400&q=80",
  running:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1400&q=80",
  wrestling:
    "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=1400&q=80",
  hockey:
    "https://images.unsplash.com/photo-1515703407324-5f753afd8be8?auto=format&fit=crop&w=1400&q=80",
  volleyball:
    "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1400&q=80",
  cheer:
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=80",
  "cross country":
    "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=80",
  golf:
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1400&q=80",
  "field hockey":
    "https://images.unsplash.com/photo-1600679472829-3044539ce8ed?auto=format&fit=crop&w=1400&q=80",
  "flag football":
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1400&q=80",
  softball:
    "https://images.unsplash.com/photo-1562077772-3bd90403f7f0?auto=format&fit=crop&w=1400&q=80",
  tennis:
    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1400&q=80",
  gymnastics:
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80",
};

const seedArticles = [
  {
    id: "a1",
    slug: "howard-football-fall-record",
    sport: "football",
    year: 2026,
    title: "Howard County Football Keeps Its Own Record Book",
    subtitle:
      "Friday night rivalries, county pride, and the thin margin between a good season and a remembered one.",
    author: AUTHOR_NAME,
    date: "June 21, 2026",
    readTime: 8,
    featured: true,
    access: "public",
    image: articleImages.football,
    tags: ["Howard County", "Football", "Almanac"],
  },
  {
    id: "a2",
    slug: "centennial-guard-carries-winter",
    sport: "basketball",
    year: 2026,
    title: "The Centennial Guard Who Turned Winter Into a Statement",
    subtitle: "A senior's patience, a coach's trust, and the closing stretch that changed a playoff draw.",
    author: AUTHOR_NAME,
    date: "June 19, 2026",
    readTime: 6,
    access: "paid",
    image: articleImages.basketball,
    tags: ["Basketball", "Profiles", "Centennial"],
  },
  {
    id: "a3",
    slug: "ellicott-city-baseball-archive",
    sport: "baseball",
    year: 2025,
    title: "An Ellicott City Baseball Archive Written in Box Scores",
    subtitle: "What old notebooks, scorecards, and summer tournaments still tell us about local baseball.",
    author: AUTHOR_NAME,
    date: "May 28, 2026",
    readTime: 7,
    access: "public",
    image: articleImages.baseball,
    tags: ["Baseball", "Archive", "History"],
  },
  {
    id: "a4",
    slug: "river-hill-soccer-shape",
    sport: "soccer",
    year: 2025,
    title: "River Hill's Shape Was the Story Before the Goals Arrived",
    subtitle: "A tactical look at the county side that controlled matches long before the scoreboard admitted it.",
    author: AUTHOR_NAME,
    date: "April 17, 2026",
    readTime: 9,
    access: "public",
    image: articleImages.soccer,
    tags: ["soccer", "Tactics", "River Hill"],
  },
  {
    id: "a5",
    slug: "glenelg-lacrosse-pressure",
    sport: "lacrosse",
    year: 2024,
    title: "Glenelg Lacrosse and the Pressure That Travels",
    subtitle: "The best defenses do not wait at the crease. They start at midfield and make every pass expensive.",
    author: AUTHOR_NAME,
    date: "March 30, 2026",
    readTime: 5,
    access: "paid",
    image: articleImages.lacrosse,
    tags: ["lacrosse", "Defense", "Glenelg"],
  },
  {
    id: "a6",
    slug: "cross-country-course-memory",
    sport: "track",
    year: 2024,
    title: "The Cross-Country Course Every Runner Remembers Differently",
    subtitle: "Hills, weather, and split times become folklore when a county meet decides more than medals.",
    author: AUTHOR_NAME,
    date: "February 12, 2026",
    readTime: 6,
    access: "free",
    image: articleImages.running,
    tags: ["Running", "County Meet", "Archive"],
  },
  {
    id: "a7",
    slug: "wilde-lake-wrestling-room",
    sport: "wrestling",
    year: 2023,
    title: "Inside the Wilde Lake Wrestling Room Where Small Details Decide February",
    subtitle: "Technique, repetition, and the kind of quiet leadership that does not fit on a bracket.",
    author: AUTHOR_NAME,
    date: "January 27, 2026",
    readTime: 8,
    access: "public",
    image: articleImages.wrestling,
    tags: ["wrestling", "Wilde Lake", "Winter"],
  },
  {
    id: "a8",
    slug: "county-hockey-late-window",
    sport: "hockey",
    year: 2023,
    title: "County Hockey Lives in the Late Window",
    subtitle: "A rink after dark, a league built on commitment, and players who learned to love odd hours.",
    author: AUTHOR_NAME,
    date: "December 18, 2025",
    readTime: 7,
    access: "paid",
    image: articleImages.hockey,
    tags: ["Hockey", "Community", "Feature"],
  },
  {
    id: "a9",
    slug: "howard-county-track-champions-2024",
    sport: "track",
    year: 2024,
    title: "Howard County Track & Field Champions Shine at 2024 Championships",
    subtitle: "Record-breaking performances and unexpected upsets highlight the county's finest athletes.",
    author: AUTHOR_NAME,
    date: "May 5, 2024",
    readTime: 7,
    access: "public",
    image: articleImages.running,
    tags: ["Track", "Championships", "Howard County"],
  },
];

const storedArticles = JSON.parse(localStorage.getItem("hoco_published_articles") || "[]");
let articles = [
  ...storedArticles,
  ...seedArticles.filter((seed) => !storedArticles.some((article) => article.id === seed.id)),
];

const functionBase = "/.netlify/functions";

function articleBody(article) {
  return [
    `${article.title} begins in the ordinary places where Howard County sports usually hide their meaning: an empty sideline, a bus ride home, a practice field with the lights humming above it. The almanac exists to preserve those details before they flatten into a final score.`,
    `The games matter, but the record is larger than wins and losses. It is the sequence of decisions that made a season feel inevitable only after it ended. Coaches remember the adjustment. Players remember the drill. Families remember the night the weather turned and nobody left early.`,
    `That is why this publication treats local sport with newspaper seriousness. Every season deserves a reliable account, not just a social post that disappears under the next schedule change. The archive should be searchable, readable, and worth returning to when a younger athlete asks what came before.`,
    `In the best moments, a county game can carry the weight of a professional one without borrowing its scale. The crowd is smaller, but the stakes are personal. A rivalry has a family tree. A gym has memory. A field has a way of naming the players who changed it.`,
    `The turning point arrived quietly. A substitution changed the rhythm, a captain slowed the huddle, and the sideline began to sense that the game had moved into a different register. Those are the stretches an almanac should hold onto, because they explain the score better than the score explains itself.`,
    `Howard County's sports history is not a single dynasty or a single school. It is a rotating argument about preparation, talent, geography, and timing. Some years belong to a favorite. Some years belong to a roster that learned exactly who it was in the final month.`,
    `${SITE_NAME} will keep following that argument with the patience it deserves. The aim is simple: write the local record with enough care that readers can come back years later and still feel the season breathing on the page.`,
  ];
}

function articleBodyHtml(article, unlocked) {
  if (!article.bodyHtml) {
    const body = articleBody(article);
    const visible = unlocked ? body : body.slice(0, 4);
    const hidden = unlocked ? [] : body.slice(4);
    return `
      ${visible.map((p, index) => (index === 2 ? `<blockquote>“A county game can carry the weight of a professional one without borrowing its scale.”</blockquote><p>${p}</p>` : `<p>${p}</p>`)).join("")}
      ${hidden.length ? `<div class="hidden-copy">${hidden.map((p) => `<p>${p}</p>`).join("")}</div>${paywall()}` : ""}
    `;
  }
  if (unlocked) return article.bodyHtml;
  const template = document.createElement("template");
  template.innerHTML = article.bodyHtml;
  const blocks = Array.from(template.content.children).slice(0, 2);
  const preview = blocks.length ? blocks.map((node) => node.outerHTML).join("") : "<p>Subscribe or log in to read this member story.</p>";
  return `${preview}<div class="hidden-copy"></div>${paywall()}`;
}

function saveState() {
  localStorage.setItem("sp_user", JSON.stringify(state.user));
  localStorage.setItem("sp_reads", JSON.stringify(state.reads));
  localStorage.setItem("hoco_accounts", JSON.stringify(state.accounts));
  localStorage.setItem("hoco_admin_emails", JSON.stringify(state.adminEmails));
  localStorage.setItem("hoco_admin_verified", JSON.stringify(Boolean(state.adminVerified)));
}

function savePublishedArticles() {
  const customArticles = articles.filter((article) => article.custom);
  try {
    localStorage.setItem("hoco_published_articles", JSON.stringify(customArticles));
  } catch (error) {
    localStorage.removeItem("hoco_published_articles");
  }
}

function localStoredArticles() {
  return JSON.parse(localStorage.getItem("hoco_published_articles") || "[]").filter((article) => article.custom);
}

function authHeaders() {
  const headers = { "content-type": "application/json" };
  if (state.user?.email) headers["x-user-email"] = state.user.email;
  return headers;
}

async function loadRemoteArticles() {
  try {
    const response = await fetch(`${functionBase}/articles?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const remoteArticles = Array.isArray(data.articles) ? data.articles : [];
    if (!remoteArticles.length && localStoredArticles().length) {
      render();
      return;
    }
    articles = [
      ...remoteArticles,
      ...seedArticles.filter((seed) => !remoteArticles.some((article) => article.id === seed.id)),
    ];
    if (remoteArticles.length) localStorage.removeItem("hoco_published_articles");
    render();
  } catch (error) {
    // Plain static hosting cannot call Netlify Functions; keep local articles.
  }
}

async function syncMember() {
  if (!state.user?.email) return;
  try {
    const response = await fetch(`${functionBase}/members?email=${encodeURIComponent(state.user.email)}`, {
      headers: authHeaders(),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data.member) {
      mergeMemberIntoCurrentUser(data.member);
      upsertAccount(data.member);
      saveState();
      render();
    }
  } catch (error) {
    // Keep local account state when backend is unavailable.
  }
}

async function refreshAdminStatus() {
  if (!state.user?.email) {
    state.adminVerified = false;
    saveState();
    return;
  }
  try {
    const response = await fetch(`${functionBase}/admin-status`, {
      headers: authHeaders(),
    });
    if (!response.ok) return;
    const data = await response.json();
    state.adminVerified = Boolean(data.isAdmin);
    if (state.adminVerified) {
      state.user = {
        ...state.user,
        accountType: "admin",
      };
      upsertAccount({ ...state.user, accountType: "admin" });
    }
    saveState();
    render();
    if (state.adminVerified) loadAdminMembers();
  } catch (error) {
    // Keep local admin state when Netlify Functions are unavailable.
  }
}

async function loadAdminMembers() {
  if (!isAdmin()) return;
  try {
    const response = await fetch(`${functionBase}/members?list=all`, {
      headers: authHeaders(),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.members)) {
      state.accounts = data.members;
      state.membersLoaded = true;
      saveState();
      render();
    }
  } catch (error) {
    // Keep local member list when Netlify Functions are unavailable.
  }
}

async function recordArticleView(articleId) {
  if (!articleId) return;
  try {
    const response = await fetch(`${functionBase}/article-view`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: articleId }),
    });
    if (!response.ok) return;
    const data = await response.json();
    articles = articles.map((article) => (article.id === articleId ? { ...article, views: Number(data.views || 0) } : article));
  } catch (error) {
    // View tracking requires Netlify Functions; static previews skip it.
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sportLabel(sport) {
  return String(sport || "").toLowerCase();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function displayName(user = state.user) {
  const raw = String(user?.name || user?.email?.split("@")[0] || "Account").trim();
  return raw.split(/\s+/)[0] || "Account";
}

function mergeMemberIntoCurrentUser(member) {
  if (!member || !state.user?.email) return;
  const fallbackName = state.user.email.split("@")[0];
  const currentName = String(state.user.name || "").trim();
  const memberName = String(member.name || "").trim();
  state.user = {
    ...state.user,
    ...member,
    name: currentName && currentName !== fallbackName ? currentName : memberName || currentName || fallbackName,
  };
}

function openAccountAction() {
  if (state.user?.email) {
    routeTo("account");
    return;
  }
  state.modal = "auth";
  state.authTab = "login";
  render();
}

function isAdmin(user = state.user) {
  const email = normalizeEmail(user?.email);
  const isCurrentUser = Boolean(email && email === normalizeEmail(state.user?.email));
  return Boolean(
    email &&
      ((isCurrentUser && state.adminVerified) ||
        user.accountType === "admin" ||
        state.adminEmails.map(normalizeEmail).includes(email))
  );
}

function accountType(user = state.user) {
  if (isAdmin(user)) return "admin";
  if (user?.subscription === "active") return "paid";
  if (user) return "free";
  return "anonymous";
}

function membershipPlan(user = state.user) {
  const plan = String(user?.plan || "").toLowerCase();
  if (["monthly", "annual"].includes(plan)) return plan;
  return user?.subscription === "active" ? "monthly" : "free";
}

function membershipLabel(plan) {
  return {
    free: "Free",
    monthly: "Monthly",
    annual: "Annual",
  }[plan || "free"] || "Free";
}

function upsertAccount(account) {
  const email = normalizeEmail(account.email);
  if (!email) return;
  const existing = state.accounts.find((item) => normalizeEmail(item.email) === email);
  const has = (key) => Object.prototype.hasOwnProperty.call(account, key);
  const next = {
    name: account.name || existing?.name || email.split("@")[0],
    email,
    plan: account.plan || existing?.plan || (account.subscription === "active" ? "monthly" : "free"),
    subscription: account.subscription || existing?.subscription || "free",
    accountType: account.accountType || existing?.accountType || (account.subscription === "active" ? "paid" : "free"),
    stripeCustomerId: account.stripeCustomerId || existing?.stripeCustomerId,
    stripeSubscriptionId: account.stripeSubscriptionId || existing?.stripeSubscriptionId,
    cancelAtPeriodEnd: has("cancelAtPeriodEnd") ? Boolean(account.cancelAtPeriodEnd) : Boolean(existing?.cancelAtPeriodEnd),
    currentPeriodEnd: has("currentPeriodEnd") ? account.currentPeriodEnd : existing?.currentPeriodEnd,
    signedUpAt: existing?.signedUpAt || new Date().toISOString(),
  };
  state.accounts = [next, ...state.accounts.filter((item) => normalizeEmail(item.email) !== email)];
}

function accessLabel(access) {
  return {
    public: "public",
    free: "free account",
    paid: "paid members",
    admin: "admins only",
  }[access || "public"];
}

function routeTo(route) {
  if (route === "admin" && !isAdmin()) {
    state.modal = "auth";
    state.authTab = "login";
    showToast("Log in with an admin email to access Admin.");
    render();
    return;
  }
  state.route = route;
  state.modal = null;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function isSubscriber() {
  return state.user?.subscription === "active";
}

function isCancellationScheduled() {
  return Boolean(state.user?.cancelAtPeriodEnd);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function hasUnlimitedReads() {
  return isAdmin() || isSubscriber();
}

function readsRemaining() {
  if (hasUnlimitedReads()) return "Unlimited";
  return Math.max(0, 5 - state.reads.count);
}

function readMeterLabel() {
  return hasUnlimitedReads() ? "Unlimited reads" : `${readsRemaining()} free reads left`;
}

function markRead(article, unlocked) {
  const month = new Date().toISOString().slice(0, 7);
  if (state.reads.month !== month) {
    state.reads = { count: 0, month, article_ids: [] };
  }
  if (unlocked && !state.reads.article_ids.includes(article.id) && !hasUnlimitedReads()) {
    state.reads.article_ids.push(article.id);
    state.reads.count = state.reads.article_ids.length;
    saveState();
  }
}

function canRead(article) {
  const access = article.access || (article.premium ? "paid" : "public");
  const type = accountType();
  if (type === "admin") return true;
  if (access === "admin") return false;
  if (access === "paid") return hasUnlimitedReads();
  if (access === "free") return type === "free" || type === "paid";
  return state.reads.count < 5 || state.reads.article_ids.includes(article.id) || hasUnlimitedReads();
}

function header() {
  return `
    <div class="breaking"><strong>BREAKING:</strong><span>Howard County spring championship archive is now open for subscriber preview.</span></div>
    <header class="masthead" id="masthead">
      <div class="masthead-inner">
        <button class="brand link-button" onclick="routeTo('home')" aria-label="Home">
          <span class="shield">HC</span>
          <span><span class="brand-title">${SITE_NAME}</span><span class="brand-tagline">The Game. The Story. The Record.</span></span>
        </button>
        <nav class="primary-nav" aria-label="Primary">
          <a href="#" onclick="routeTo('home')">Home</a>
          ${sports.slice(0, 6).map((sport) => `<a href="#" onclick="setSport('${sport}')">${sport}</a>`).join("")}
          ${isAdmin() ? `<a href="#" onclick="routeTo('admin')">Admin</a>` : ""}
        </nav>
        <div class="secondary-actions">
          <button class="icon-button" onclick="openSearch()" title="Search">⌕</button>
          <button class="btn-secondary" onclick="openAccountAction()">${state.user ? escapeHtml(displayName()) : "Login"}</button>
          <button class="btn" onclick="routeTo('subscribe')">${isSubscriber() ? "Subscribed" : "Subscribe"}</button>
        </div>
      </div>
    </header>
    <div class="datebar">
      <div class="datebar-inner">
        <time>${currentDate}</time>
      </div>
    </div>
  `;
}

function footer() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-grid">
          <div>
            <h3>${SITE_NAME}</h3>
            <p>The independent Howard County sports almanac: broadsheet discipline, modern reader experience.</p>
          </div>
          <div><h4>Navigate</h4><a href="#" onclick="routeTo('home')">Home</a><a href="#" onclick="routeTo('archive')">Archive</a><a href="#" onclick="openSearch()">Search</a></div>
          <div><h4>Account</h4><a href="#" onclick="openAccountAction()">${state.user ? "My Account" : "Login"}</a><a href="#" onclick="routeTo('subscribe')">Subscribe</a></div>
          <div><h4>Legal</h4><a href="#" onclick="routeTo('about')">About</a><a href="#" onclick="routeTo('contact')">Contact</a><a href="#">Privacy</a><a href="#">Terms</a></div>
        </div>
        <p class="meta">© 2026 ${SITE_NAME}. Independent publication prototype.</p>
      </div>
    </footer>
    <nav class="mobile-bottom" aria-label="Mobile">
      <button onclick="routeTo('home')">Home</button>
      <button onclick="setSport('football')">Sports</button>
      <button onclick="openSearch()">Search</button>
      <button onclick="routeTo('archive')">Archive</button>
      <button onclick="openAccountAction()">${state.user ? escapeHtml(displayName()) : "Account"}</button>
    </nav>
  `;
}

function card(article, compact = false) {
  if (compact) {
    return `<article class="compact-card">
      <a href="#" onclick="openArticle('${article.slug}')"><h3>${article.title}</h3></a>
      <div class="meta">${sportLabel(article.sport)} · ${article.date} · ${article.readTime} min</div>
    </article>`;
  }
  return `<article class="card">
    <a href="#" onclick="openArticle('${article.slug}')">
      <div class="card-image">
        <img src="${article.image}" alt="${article.title}" />
        ${(article.access || article.premium) && (article.access || "paid") !== "public" ? `<span class="badge premium">${accessLabel(article.access || "paid")}</span>` : ""}
      </div>
      <div class="card-body">
        <span class="badge">${sportLabel(article.sport)}</span>
        <h3>${article.title}</h3>
        <p>${article.subtitle}</p>
        <div class="meta">${escapeHtml(article.author || AUTHOR_NAME)} · ${article.date} · ${article.readTime} min read</div>
      </div>
    </a>
  </article>`;
}

function filteredArticles() {
  const q = state.query.trim().toLowerCase();
  return articles.filter((article) => {
    const sportOk = state.sport === "All" || article.sport === state.sport;
    const yearOk = state.year === "All" || String(article.year) === String(state.year);
    const qOk =
      !q ||
      [article.title, article.subtitle, article.author, article.sport, (article.tags || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q);
    return sportOk && yearOk && qOk;
  });
}

function homePage() {
  const featured = articles.find((article) => article.featured);
  const picks = articles.slice(1, 4);
  const latest = articles.slice(0, 6);
  return `
    ${header()}
    <section class="hero">
      <img class="hero-video" src="${featured.image}" alt="Howard County sports feature" />
      <div class="hero-content">
        <span class="kicker">Howard County Sports</span>
        <h1>${featured.title}</h1>
        <p>${featured.subtitle}</p>
        <div class="hero-meta">${sportLabel(featured.sport)} · ${featured.date} · ${featured.readTime} min read · ${readMeterLabel()}</div>
        <button class="btn" onclick="openArticle('${featured.slug}')">Read the Story</button>
      </div>
    </section>
    <main class="main container">
      <div class="section-heading"><h2>Editor's Picks</h2><button class="btn-ghost" onclick="routeTo('archive')">View Archive</button></div>
      <div class="picks-grid">${picks.map((article) => card(article)).join("")}</div>
      <div class="content-layout">
        <section>
          <div class="section-heading"><h2>Latest Stories</h2><span class="section-label">${latest.length} reports</span></div>
          <div class="article-grid">${latest.map((article) => card(article)).join("")}</div>
        </section>
        ${sidebar()}
      </div>
      ${sportSections()}
    </main>
    ${footer()}
    ${modal()}
  `;
}

function sidebar() {
  return `<aside class="sidebar">
    <section class="sidebar-box dark">
      <span class="eyebrow">Metered Access</span>
      <h3>${hasUnlimitedReads() ? "Unlimited articles" : `${readsRemaining()} free articles left this month`}</h3>
      <p>Subscribe for unlimited access to every feature, archive story, and premium report.</p>
      <button class="btn" onclick="routeTo('subscribe')">Subscribe</button>
    </section>
    <section class="sidebar-box">
      <h3>Top Stories This Week</h3>
      <ol class="top-list">${articles.slice(0, 5).map((article) => `<li>${card(article, true)}</li>`).join("")}</ol>
    </section>
    <section class="sidebar-box">
      <h3>Newsletter</h3>
      <p>Get the next almanac dispatch when new county features publish.</p>
      <input class="input" id="newsletterEmail" placeholder="Email address" />
      <button class="btn" style="margin-top:10px;width:100%" onclick="joinNewsletter()">Join List</button>
    </section>
  </aside>`;
}

function sportSections() {
  return `<section style="margin-top:52px">
    ${["football", "basketball", "baseball"].map((sport) => {
      const group = articles.filter((article) => article.sport === sport).slice(0, 4);
      return `<div style="margin-bottom:36px">
        <div class="section-heading"><h2>${sportLabel(sport)}</h2><button class="btn-ghost" onclick="setSport('${sport}')">See All ${sportLabel(sport)} Stories</button></div>
        <div class="sport-grid">${group.map((article) => card(article)).join("")}</div>
      </div>`;
    }).join("")}
  </section>`;
}

function archivePage() {
  const years = ["All", ...new Set(articles.map((article) => article.year))];
  const results = filteredArticles();
  return `
    ${header()}
    <section class="page-header"><div class="container"><span class="eyebrow">Archive and Search</span><h1>Find the county record by sport, year, or keyword.</h1><p class="page-deck">The PRD calls for sport/year browsing and full-text search. This prototype models that discovery path client-side.</p></div></section>
    <main class="main container">
      <div class="filter-panel">
        <div class="filter-row">
          <input class="input" value="${state.query}" oninput="state.query=this.value; render()" placeholder="Search football, Glenelg, playoffs, archive..." />
          <select class="select" onchange="state.sport=this.value; render()">${["All", ...sports].map((sport) => `<option ${state.sport === sport ? "selected" : ""}>${sport}</option>`).join("")}</select>
          <select class="select" onchange="state.year=this.value; render()">${years.map((year) => `<option ${String(state.year) === String(year) ? "selected" : ""}>${year}</option>`).join("")}</select>
        </div>
      </div>
      <div class="section-heading"><h2>${results.length} Results</h2><button class="btn-secondary" onclick="clearFilters()">Clear Filters</button></div>
      <div class="article-grid">${results.map((article) => card(article)).join("") || "<p>No stories match those filters yet.</p>"}</div>
    </main>
    ${footer()}
    ${modal()}
  `;
}

function articlePage(slug) {
  const article = articles.find((item) => item.slug === slug) || articles[0];
  const unlocked = canRead(article);
  markRead(article, unlocked);
  const bodyHtml = articleBodyHtml(article, unlocked);
  return `
    ${header()}
    <article class="article-shell">
      <section class="article-hero">
        <img src="${article.image}" alt="${article.title}" />
        <div class="article-hero-content">
          <span class="badge">${sportLabel(article.sport)}</span>
          <h1>${article.title}</h1>
          <p>${article.subtitle}</p>
          <div class="hero-meta">By ${escapeHtml(article.author || AUTHOR_NAME)} · ${article.date} · ${article.readTime} min read</div>
          ${article.imageCredit ? `<div class="hero-meta">Image: ${escapeHtml(article.imageCredit)}</div>` : ""}
        </div>
      </section>
      <div class="article-content-wrap">
        <div class="share-bar"><button onclick="showToast('Share link copied.')">↗</button><button onclick="showToast('Story saved.')">★</button><button onclick="showToast('Bookmark added.')">▣</button></div>
        <div class="article-body ${unlocked ? "" : "locked"}">
          ${bodyHtml}
          ${unlocked && article.credits ? `<section class="credits-box"><h2>Credits</h2><p>${escapeHtml(article.credits).replaceAll("\n", "<br>")}</p></section>` : ""}
          <h2>Related Coverage</h2>
          <div class="article-grid">${articles.filter((item) => item.slug !== article.slug).slice(0, 2).map((item) => card(item)).join("")}</div>
        </div>
        <aside class="article-aside">
          <strong>Article Record</strong><br />
          Sport: ${sportLabel(article.sport)}<br />Season: ${article.year}<br />Tags: ${(article.tags || []).join(", ")}<br /><br />
          Reads this month: ${state.reads.count} / 5<br />
          Access: ${accessLabel(article.access || "public")}<br />
          Your account: ${accountType()}
        </aside>
      </div>
    </article>
    ${footer()}
    ${modal()}
  `;
}

function paywall() {
  return `<section class="paywall-card">
    <div style="font-size:28px;color:var(--color-gold)">▣</div>
    <span class="eyebrow">You've reached your free limit</span>
    <h2>Subscribe to Keep Reading</h2>
    <p>Log in or subscribe to unlock this story based on its account access level.</p>
    <button class="btn" onclick="routeTo('subscribe')" style="width:100%;margin-bottom:10px">Subscribe Now</button>
    <button class="btn-secondary" onclick="state.modal='auth'; state.authTab='login'; render()" style="width:100%">Log In</button>
    <p class="meta">5 free articles per month. No credit card required to create a free account.</p>
  </section>`;
}

function subscribePage() {
  return `
    ${header()}
    <section class="page-header subscribe-hero"><div class="container"><span class="eyebrow">Subscribe</span><h1>Unlimited access to the record.</h1><p class="page-deck">Create an account first, then continue to secure Stripe Checkout for monthly or annual membership.</p></div></section>
    <main class="main container">
      <div class="pricing-grid">
        <section class="price-card"><span class="eyebrow">Free</span><h2>Reader</h2><div class="price">$0</div><p>Five article reads per month, newsletter signup, and archive browsing.</p><button class="btn-secondary" onclick="state.modal='auth'; state.authTab='signup'; render()">Create Account</button></section>
        <section class="price-card"><span class="eyebrow">Monthly</span><h2>Member</h2><div class="price">$6.95</div><p>Unlimited stories, premium features, and full almanac access.</p><button class="btn" onclick="subscribe('monthly')">Start Monthly</button></section>
        <section class="price-card featured"><span class="eyebrow">Best Value</span><h2>Annual</h2><div class="price">$24.95</div><p>Full-year access, supporter badge, and early archive previews.</p><button class="btn" onclick="subscribe('annual')">Start Annual</button></section>
      </div>
    </main>
    ${footer()}
    ${modal()}
  `;
}

function accountPage() {
  const canManageSubscription = Boolean(state.user?.stripeCustomerId);
  const showCancelSubscription = isSubscriber() && canManageSubscription && !isCancellationScheduled();
  const cancellationNotice = isSubscriber() && isCancellationScheduled()
    ? `<p class="account-note">Your subscription is cancelled for future billing. Paid access remains active${state.user?.currentPeriodEnd ? ` until ${formatDate(state.user.currentPeriodEnd)}` : " through the end of the current billing period"}.</p>`
    : "";
  return `
    ${header()}
    <section class="page-header"><div class="container"><span class="eyebrow">Account</span><h1>${state.user ? `Welcome, ${escapeHtml(displayName())}` : "Create an account or log in."}</h1><p class="page-deck">Manage subscription state, read meter, and billing portal handoff.</p></div></section>
    <main class="main container">
      <div class="stats-grid">
        <div class="stat-card"><span class="eyebrow">Account Type</span><strong>${accountType()}</strong></div>
        <div class="stat-card"><span class="eyebrow">Plan</span><strong>${membershipLabel(membershipPlan())}</strong></div>
        <div class="stat-card"><span class="eyebrow">Free Reads</span><strong>${readsRemaining()}</strong></div>
      </div>
      ${cancellationNotice}
      <p><button class="btn" onclick="${canManageSubscription ? "manageBilling()" : "routeTo('subscribe')"}">${canManageSubscription ? "Manage Billing" : "Subscribe"}</button> ${showCancelSubscription ? `<button class="btn-danger" onclick="cancelSubscription()">Cancel Subscription</button>` : ""} ${isAdmin() ? `<button class="btn-secondary" onclick="routeTo('admin')">Admin Dashboard</button>` : ""} <button class="btn-secondary" onclick="logout()">Log Out</button></p>
    </main>
    ${footer()}
    ${modal()}
  `;
}

function adminPage() {
  if (!isAdmin()) {
    return `${header()}<section class="page-header"><div class="container"><span class="eyebrow">Admin</span><h1>Admin access required.</h1><p class="page-deck">Log in with an email listed in admin settings. Default local admin: admin@hocosportsalmanac.com.</p><button class="btn" onclick="state.modal='auth'; state.authTab='login'; render()">Log In</button></div></section>${footer()}${modal()}`;
  }
  return `
    ${header()}
    <main class="admin-layout">
      <aside class="admin-sidebar">
        <button class="brand link-button" onclick="routeTo('home')"><span class="shield">HC</span><span><span class="brand-title" style="font-size:24px">Admin</span></span></button>
        <nav class="admin-nav">
          ${["publish", "dashboard", "articles", "subscribers", "settings"].map((tab) => `<button class="${state.adminTab === tab ? "active" : ""}" onclick="state.adminTab='${tab}'; render()">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join("")}
        </nav>
      </aside>
      <section class="admin-main">${adminPanel()}</section>
    </main>
    ${footer()}
    ${modal()}
  `;
}

function publishPanel() {
  const editingArticle = state.editingArticleId ? articles.find((article) => article.id === state.editingArticleId) : null;
  const draft = editingArticle || JSON.parse(localStorage.getItem("hoco_admin_draft") || "null") || {};
  return `<div class="section-heading">
      <h2>${editingArticle ? "Edit Article" : "Publish Article"}</h2>
      <span class="section-label">Admin-only workspace</span>
    </div>
    <form class="publish-grid" onsubmit="event.preventDefault(); publishArticle()">
      <section class="editor-panel">
        <label class="field-label">Headline</label>
        <input class="input headline-input" id="adminTitle" value="${escapeHtml(draft.title || "")}" placeholder="Write the article headline" required />
        <label class="field-label">Subtitle / Deck</label>
        <textarea class="textarea deck-input" id="adminSubtitle" placeholder="Short summary below the headline">${escapeHtml(draft.subtitle || "")}</textarea>
        <label class="field-label">Author Names</label>
        <input class="input" id="adminAuthor" value="${escapeHtml(draft.author || AUTHOR_NAME)}" placeholder="Willie Sean Coughlan, Contributor Name" />
        <div class="editor-toolbar" aria-label="Editor tools">
          <button type="button" class="btn-secondary" onclick="formatEditor('h2')">Add Section Heading</button>
          <button type="button" class="btn-secondary" onclick="formatEditor('blockquote')">Add Quote</button>
          <button type="button" class="btn-secondary" onclick="insertImageFromUrl()">Insert Image URL</button>
          <label class="btn-secondary file-button">Upload Image<input type="file" accept="image/*" onchange="insertUploadedImage(event)" /></label>
        </div>
        <label class="field-label">Body</label>
        <div class="rich-editor" id="adminBody" contenteditable="true" data-placeholder="Write the story here. Put your cursor where an image should go, then use Insert Image URL or Upload Image.">${draft.bodyHtml || "<p></p>"}</div>
      </section>
      <aside class="editor-panel publish-sidebar">
        <label class="field-label">Sport</label>
        <select class="select" id="adminSport">${sports.map((sport) => `<option ${draft.sport === sport ? "selected" : ""} value="${sport}">${sportLabel(sport)}</option>`).join("")}</select>
        <label class="field-label">Season / Year</label>
        <input class="input" id="adminYear" type="number" min="1900" max="2100" value="${draft.year || new Date().getFullYear()}" />
        <label class="field-label">Hero Image URL</label>
        <input class="input" id="adminImage" value="${escapeHtml(draft.image || "")}" placeholder="Paste an image URL, or leave blank for sport default" />
        <label class="btn-secondary file-button hero-upload-button">Upload Hero Image<input type="file" accept="image/*" onchange="uploadHeroImage(event)" /></label>
        <p class="meta" id="heroImageStatus">${draft.image ? "Hero image set." : "Paste a link or upload a hero image from your computer."}</p>
        <label class="field-label">Image Credit</label>
        <input class="input" id="adminImageCredit" value="${escapeHtml(draft.imageCredit || "")}" placeholder="Photo by..." />
        <label class="field-label">Credits</label>
        <textarea class="textarea" id="adminCredits" placeholder="Reporting, photo, stat, or archive credits">${escapeHtml(draft.credits || "")}</textarea>
        <label class="field-label">Who Can Read It</label>
        <select class="select" id="adminAccess">
          ${["public", "free", "paid", "admin"].map((access) => `<option value="${access}" ${(draft.access || "public") === access ? "selected" : ""}>${accessLabel(access)}</option>`).join("")}
        </select>
        <label class="check-row"><input type="checkbox" id="adminFeatured" ${draft.featured ? "checked" : ""}> Feature on homepage</label>
        <button class="btn" type="submit">${editingArticle ? "Save Changes" : "Publish Now"}</button>
        <button class="btn-secondary" type="button" onclick="saveDraft()">Save Draft</button>
        <button class="btn-secondary" type="button" onclick="previewDraft()">Preview</button>
        ${editingArticle ? `<button class="btn-danger" type="button" onclick="cancelEdit()">Cancel Edit</button>` : ""}
        <p class="meta">On Netlify, published articles are stored in Netlify Blobs and become visible to every visitor.</p>
      </aside>
    </form>`;
}

function adminPanel() {
  if (state.adminTab === "publish") {
    return publishPanel();
  }
  if (state.adminTab === "articles") {
    const localOnly = localStoredArticles();
    return `<div class="section-heading"><h2>Article Manager</h2><button class="btn" onclick="state.adminTab='publish'; render()">New Article</button></div>
      ${localOnly.length ? `<p class="account-note">${localOnly.length} article${localOnly.length === 1 ? "" : "s"} saved only in this browser. <button class="btn-secondary table-action" onclick="syncLocalArticles()">Sync to Website</button></p>` : ""}
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Headline</th><th>Sport</th><th>Access</th><th>Author</th><th>Views</th><th>Actions</th></tr></thead><tbody>${articles.map((a) => `<tr><td>${escapeHtml(a.title)}${a.featured ? " · Featured" : ""}</td><td>${sportLabel(a.sport)}</td><td>${accessLabel(a.access || "public")}</td><td>${escapeHtml(a.author || AUTHOR_NAME)}</td><td>${Number(a.views || 0).toLocaleString()}</td><td><button class="btn-secondary table-action" onclick="editArticle('${a.id}')">Edit</button> <button class="btn-danger table-action" onclick="deleteArticle('${a.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
  }
  if (state.adminTab === "subscribers") {
    if (!state.membersLoaded) setTimeout(loadAdminMembers, 0);
    const paidMembers = state.accounts.filter((account) => account.subscription === "active");
    const adminMembers = state.accounts.filter((account) => isAdmin(account));
    return `<div class="section-heading"><h2>Members and Emails</h2><div><button class="btn-secondary" onclick="loadAdminMembers()">Refresh Members</button> <button class="btn-secondary" onclick="exportAccountsCsv()">Export CSV</button></div></div>
      <div class="stats-grid"><div class="stat-card"><span class="eyebrow">Paid Members</span><strong>${paidMembers.length}</strong></div><div class="stat-card"><span class="eyebrow">Signed Up Emails</span><strong>${state.accounts.length}</strong></div><div class="stat-card"><span class="eyebrow">Admins</span><strong>${adminMembers.length}</strong></div></div>
      <p class="meta">${state.membersLoaded ? "Showing shared Netlify member records." : "Loading shared members. Local fallback may include only this browser's accounts."}</p>
      <div class="table-wrap" style="margin-top:22px"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Account Type</th><th>Plan</th><th>Subscription</th><th>Signed Up</th></tr></thead><tbody>${state.accounts.map((account) => {
        const plan = membershipPlan(account);
        return `<tr><td>${escapeHtml(account.name || "")}</td><td>${escapeHtml(account.email || "")}</td><td>${isAdmin(account) ? "admin" : escapeHtml(account.accountType || "free")}</td><td><select class="select table-select" onchange="updateMemberPlan('${escapeHtml(account.email || "")}', this.value)">${["free", "monthly", "annual"].map((option) => `<option value="${option}" ${plan === option ? "selected" : ""}>${membershipLabel(option)}</option>`).join("")}</select></td><td>${escapeHtml(account.subscription || "free")}</td><td>${account.signedUpAt ? new Date(account.signedUpAt).toLocaleDateString() : ""}</td></tr>`;
      }).join("") || `<tr><td colspan="6">No signups found yet.</td></tr>`}</tbody></table></div>`;
  }
  if (state.adminTab === "settings") {
    return `<div class="section-heading"><h2>Site Settings</h2><button class="btn" onclick="showToast('Settings saved for prototype.')">Save</button></div>
      <div class="editor-panel">
        <label><input type="checkbox" checked> Breaking news banner enabled</label>
        <label class="field-label">Breaking News Text</label>
        <input class="input" value="Howard County spring championship archive is now open for subscriber preview.">
        <label class="field-label">Admin Emails</label>
        <textarea class="textarea" id="adminEmailsInput" placeholder="one email per line or comma-separated">${state.adminEmails.join("\n")}</textarea>
        <button class="btn" style="margin-top:12px" onclick="saveAdminEmails()">Save Admin Emails</button>
        <p class="meta">Production should store these in Netlify env var ADMIN_EMAILS and enforce them server-side in every write function.</p>
      </div>`;
  }
  return `<div class="section-heading"><h2>Dashboard</h2><span class="section-label">Admin email gated in production</span></div>
    <div class="stats-grid"><div class="stat-card"><span class="eyebrow">Published</span><strong>${articles.length}</strong></div><div class="stat-card"><span class="eyebrow">Paid Members</span><strong>${state.accounts.filter((account) => account.subscription === "active").length}</strong></div><div class="stat-card"><span class="eyebrow">Signed Up Emails</span><strong>${state.accounts.length}</strong></div></div>
    <div class="table-wrap" style="margin-top:22px"><h3>Recent Stories</h3><table class="data-table"><tbody>${articles.slice(0, 5).map((a) => `<tr><td>${a.title}</td><td>${a.date}</td><td>${sportLabel(a.sport)}</td></tr>`).join("")}</tbody></table></div>`;
}

function simplePage(title, deck) {
  return `${header()}<section class="page-header"><div class="container"><span class="eyebrow">${SITE_NAME}</span><h1>${title}</h1><p class="page-deck">${deck}</p></div></section><main class="main container"><p class="page-deck">This page is included in the PRD page map and ready for production copy, forms, and policy text.</p></main>${footer()}${modal()}`;
}

function getDraftFromForm() {
  const sport = document.getElementById("adminSport")?.value || "football";
  const bodyHtml = document.getElementById("adminBody")?.innerHTML.trim() || "<p></p>";
  const title = document.getElementById("adminTitle")?.value.trim() || "Untitled Story";
  const subtitle = document.getElementById("adminSubtitle")?.value.trim() || "";
  const plainWords = document.getElementById("adminBody")?.innerText.trim().split(/\s+/).filter(Boolean).length || 0;
  return {
    id: `custom-${Date.now()}`,
    slug: `${slugify(title)}-${Date.now().toString().slice(-4)}`,
    title,
    subtitle,
    sport,
    year: Number(document.getElementById("adminYear")?.value) || new Date().getFullYear(),
    image: document.getElementById("adminImage")?.value.trim() || articleImages[sport] || articleImages.football,
    access: document.getElementById("adminAccess")?.value || "public",
    featured: Boolean(document.getElementById("adminFeatured")?.checked),
    author: document.getElementById("adminAuthor")?.value.trim() || AUTHOR_NAME,
    imageCredit: document.getElementById("adminImageCredit")?.value.trim() || "",
    credits: document.getElementById("adminCredits")?.value.trim() || "",
    date: new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date()),
    readTime: Math.max(1, Math.ceil(plainWords / 238)),
    bodyHtml,
    tags: [sport, "Howard County"],
    custom: true,
  };
}

function saveDraft() {
  localStorage.setItem("hoco_admin_draft", JSON.stringify(getDraftFromForm()));
  showToast("Draft saved in this browser.");
}

async function publishArticle() {
  const article = getDraftFromForm();
  const wasEditing = Boolean(state.editingArticleId);
  if (article.featured) {
    articles = articles.map((item) => ({ ...item, featured: false }));
  }
  if (state.editingArticleId) {
    article.id = state.editingArticleId;
    article.slug = articles.find((item) => item.id === state.editingArticleId)?.slug || article.slug;
    articles = articles.map((item) => (item.id === state.editingArticleId ? article : item));
    state.editingArticleId = null;
  } else {
    articles = [article, ...articles];
  }
  try {
    const response = await fetch(`${functionBase}/articles`, {
      method: wasEditing ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(article),
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Publish failed");
    const remoteArticles = Array.isArray(data.articles) ? data.articles : [data.article];
    articles = [
      ...remoteArticles,
      ...seedArticles.filter((seed) => !remoteArticles.some((item) => item.id === seed.id)),
    ];
    localStorage.removeItem("hoco_published_articles");
  } catch (error) {
    savePublishedArticles();
    showToast(error.message || "Backend unavailable; saved in this browser only.");
  }
  localStorage.removeItem("hoco_admin_draft");
  state.adminTab = "articles";
  render();
  showToast("Article published.");
}

async function syncLocalArticles() {
  const localOnly = localStoredArticles();
  if (!localOnly.length) {
    showToast("No local-only articles to sync.");
    return;
  }
  try {
    let remoteArticles = [];
    for (const article of localOnly) {
      const response = await fetch(`${functionBase}/articles`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(article),
        credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Could not sync ${article.title}`);
      remoteArticles = Array.isArray(data.articles) ? data.articles : remoteArticles;
    }
    if (!remoteArticles.length) {
      const response = await fetch(`${functionBase}/articles?t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      remoteArticles = Array.isArray(data.articles) ? data.articles : [];
    }
    articles = [
      ...remoteArticles,
      ...seedArticles.filter((seed) => !remoteArticles.some((item) => item.id === seed.id)),
    ];
    localStorage.removeItem("hoco_published_articles");
    render();
    showToast("Local articles synced to the website.");
  } catch (error) {
    showToast(error.message || "Local articles could not be synced.");
  }
}

function previewDraft() {
  const article = { ...getDraftFromForm(), id: "preview", slug: "preview" };
  const existing = articles.filter((item) => item.slug !== "preview");
  articles = [article, ...existing];
  state.route = "article:preview";
  render();
}

function editArticle(id) {
  state.editingArticleId = id;
  state.adminTab = "publish";
  render();
}

function cancelEdit() {
  state.editingArticleId = null;
  state.adminTab = "articles";
  render();
}

async function deleteArticle(id) {
  if (!confirm("Delete this article?")) return;
  articles = articles.filter((article) => article.id !== id);
  try {
    const response = await fetch(`${functionBase}/articles`, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ id }),
      credentials: "same-origin",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Delete failed");
    const remoteArticles = Array.isArray(data.articles) ? data.articles : [];
    articles = [
      ...remoteArticles,
      ...seedArticles.filter((seed) => !remoteArticles.some((item) => item.id === seed.id)),
    ];
    localStorage.removeItem("hoco_published_articles");
  } catch (error) {
    savePublishedArticles();
    showToast(error.message || "Backend unavailable; deleted in this browser only.");
  }
  render();
  showToast("Article deleted.");
}

function saveAdminEmails() {
  const raw = document.getElementById("adminEmailsInput")?.value || "";
  const emails = raw
    .split(/[,\n]/)
    .map(normalizeEmail)
    .filter(Boolean);
  if (!emails.length) {
    showToast("Keep at least one admin email.");
    return;
  }
  state.adminEmails = [...new Set(emails)];
  saveState();
  render();
  showToast("Admin emails updated.");
}

function exportAccountsCsv() {
  const rows = [
    ["name", "email", "account_type", "plan", "subscription", "signed_up_at"],
    ...state.accounts.map((account) => [
      account.name,
      account.email,
      isAdmin(account) ? "admin" : account.accountType,
      membershipPlan(account),
      account.subscription,
      account.signedUpAt,
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hoco-members.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function updateMemberPlan(email, plan) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  try {
    const response = await fetch(`${functionBase}/members`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ email: normalizedEmail, plan }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update membership.");
    if (Array.isArray(data.members)) {
      state.accounts = data.members;
      state.membersLoaded = true;
    }
    if (data.member) {
      upsertAccount(data.member);
      if (normalizeEmail(state.user?.email) === normalizedEmail) mergeMemberIntoCurrentUser(data.member);
    }
    saveState();
    render();
    showToast(`${normalizedEmail} changed to ${membershipLabel(plan)}.`);
  } catch (error) {
    showToast(error.message || "Could not update membership.");
    loadAdminMembers();
  }
}

function joinNewsletter() {
  const input = document.getElementById("newsletterEmail");
  const email = normalizeEmail(input?.value);
  if (!email) {
    showToast("Enter an email first.");
    return;
  }
  upsertAccount({ name: email.split("@")[0], email, subscription: "free", accountType: "free" });
  saveState();
  input.value = "";
  showToast("Email added to the member list.");
}

function formatEditor(type) {
  const editor = document.getElementById("adminBody");
  editor?.focus();
  if (type === "h2") {
    document.execCommand("formatBlock", false, "h2");
  } else if (type === "blockquote") {
    document.execCommand("formatBlock", false, "blockquote");
  }
}

function insertImageHtml(src, caption = "") {
  const editor = document.getElementById("adminBody");
  editor?.focus();
  const html = `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(caption || "Article image")}" /><figcaption>${escapeHtml(caption || "Image caption")}</figcaption></figure><p></p>`;
  document.execCommand("insertHTML", false, html);
}

function insertImageFromUrl() {
  const src = prompt("Paste image URL");
  if (!src) return;
  const caption = prompt("Caption", "");
  insertImageHtml(src, caption || "");
}

function insertUploadedImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => insertImageHtml(reader.result, file.name);
  reader.readAsDataURL(file);
  event.target.value = "";
}

function uploadHeroImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Choose an image file for the hero image.");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const input = document.getElementById("adminImage");
    const status = document.getElementById("heroImageStatus");
    if (input) input.value = reader.result;
    if (status) status.textContent = `Hero image uploaded: ${file.name}`;
    showToast("Hero image uploaded.");
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function modal() {
  if (state.modal !== "auth") return "";
  const signup = state.authTab === "signup";
  return `<div class="modal-backdrop" onclick="if(event.target===this){state.modal=null; render()}">
    <section class="modal-card" role="dialog" aria-modal="true" aria-label="Authentication">
      <div class="modal-head"><h2>${signup ? "Create Account" : "Welcome Back"}</h2><button class="icon-button" onclick="state.modal=null; render()">×</button></div>
      <div class="tabs"><button class="${!signup ? "active" : ""}" onclick="state.authTab='login'; render()">Log In</button><button class="${signup ? "active" : ""}" onclick="state.authTab='signup'; render()">Create Account</button></div>
      <form class="form-stack" onsubmit="event.preventDefault(); login('${signup ? "signup" : "login"}')">
        ${signup ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><input class="input" id="firstName" placeholder="First name" required><input class="input" placeholder="Last name"></div>` : ""}
        <input class="input" id="email" type="email" placeholder="Email" required />
        <input class="input" id="password" type="password" placeholder="Password" required />
        ${signup ? `<label><input type="checkbox" checked> Join the email list</label>` : `<label><input type="checkbox"> Remember me</label>`}
        <button class="btn" type="submit">${signup ? "Create Account" : "Log In"}</button>
      </form>
    </section>
  </div>`;
}

function render() {
  document.body.classList.toggle("modal-open", Boolean(state.modal));
  const app = document.getElementById("app");
  if (state.route.startsWith("article:")) app.innerHTML = articlePage(state.route.split(":")[1]);
  else if (state.route === "archive") app.innerHTML = archivePage();
  else if (state.route === "subscribe") app.innerHTML = subscribePage();
  else if (state.route === "account") app.innerHTML = accountPage();
  else if (state.route === "admin") app.innerHTML = adminPage();
  else if (state.route === "about") app.innerHTML = simplePage("About the Almanac", "HoCo Sports Almanac began in 2019 on Facebook, delivering Howard County high school sports content, ranging from features on current players, coaches and teams, to the recent grads competing at the next level(s), to the legendary figures of yesteryear.\n\nThe page has grown to more than 6,000 members, and through shares and algorithms, garnered more than 3 million views from May of 2025 through 2026.\n\nFrom 1980 through 2026, someone in my family has either played or coached on a Howard County high school team in 42 of those 46 years. Many of those years, several were doing one or the other that same year.\n\nI've done extensive research on the history of the sports teams and figures, dating back to the 1940s, when the three county high schools were Elkridge, Harriett Tubman, and Clarksville.\n\nI'm grateful for all of the support I've received. Thank you.");
  else if (state.route === "contact") app.innerHTML = simplePage("Contact", "Route tips, corrections, sponsorship requests, and archive contributions to the editor.");
  else app.innerHTML = homePage();
}

function openArticle(slug) {
  const article = articles.find((item) => item.slug === slug);
  if (article) recordArticleView(article.id);
  state.route = `article:${slug}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function setSport(sport) {
  state.route = "archive";
  state.sport = sport;
  state.year = "All";
  render();
}

function clearFilters() {
  state.query = "";
  state.sport = "All";
  state.year = "All";
  render();
}

function openSearch() {
  state.route = "archive";
  setTimeout(() => document.querySelector(".filter-panel .input")?.focus(), 0);
  render();
}

async function login(mode) {
  const email = document.getElementById("email").value;
  const normalizedEmail = normalizeEmail(email);
  const firstNameInput = document.getElementById("firstName")?.value.trim();
  const existing = state.accounts.find((account) => normalizeEmail(account.email) === normalizedEmail);
  if (mode === "signup" && existing) {
    showToast("An account already exists for this email. Please log in instead.");
    state.modal = "auth";
    state.authTab = "login";
    render();
    setTimeout(() => {
      const emailInput = document.getElementById("email");
      if (emailInput) {
        emailInput.value = normalizedEmail;
        emailInput.focus();
      }
    }, 0);
    return;
  }
  const firstName = firstNameInput || existing?.name || normalizedEmail.split("@")[0];
  state.user = {
    name: firstName,
    email: normalizedEmail,
    subscription: existing?.subscription || state.user?.subscription || "free",
  };
  state.adminVerified = false;
  upsertAccount(state.user);
  state.modal = null;
  if (!state.pendingSubscriptionPlan) state.route = "account";
  saveState();
  render();
  showToast(mode === "signup" ? `Welcome, ${displayName()}.` : `Welcome back, ${displayName()}.`);
  try {
    const response = await fetch(`${functionBase}/members`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...state.user, mode }),
    });
    if (response.status === 409) {
      const data = await response.json();
      showToast(data.error || "An account already exists for this email. Please log in instead.");
      state.user = null;
      state.accounts = state.accounts.filter((account) => normalizeEmail(account.email) !== normalizedEmail);
      state.modal = "auth";
      state.authTab = "login";
      state.route = "home";
      saveState();
      render();
      return;
    }
    if (response.ok) {
      const data = await response.json();
      if (data.member) {
        mergeMemberIntoCurrentUser(data.member);
        upsertAccount(data.member);
        saveState();
        render();
      }
    }
  } catch (error) {
    // Member persistence is optional for plain static previews.
  }
  refreshAdminStatus();
  if (state.pendingSubscriptionPlan) {
    const plan = state.pendingSubscriptionPlan;
    state.pendingSubscriptionPlan = null;
    setTimeout(() => subscribe(plan), 0);
  }
}

function logout() {
  state.user = null;
  state.adminVerified = false;
  saveState();
  render();
  showToast("Logged out.");
}

async function subscribe(plan) {
  if (!state.user?.email) {
    state.pendingSubscriptionPlan = plan;
    state.modal = "auth";
    state.authTab = "signup";
    render();
    showToast("Create an account before subscribing.");
    return;
  }
  try {
    const response = await fetch("/.netlify/functions/stripe-create-checkout-session", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ plan, email: state.user.email }),
    });
    const data = await response.json();
    if (data.url) {
      location.href = data.url;
      return;
    }
    showToast(data.error || "Stripe checkout is not configured yet.");
  } catch (error) {
    showToast("Stripe checkout is unavailable. Run with Netlify Functions or check Netlify setup.");
  }
}

async function confirmCheckoutSession(sessionId) {
  if (!state.user?.email || !sessionId) return false;
  try {
    const response = await fetch("/.netlify/functions/stripe-confirm-checkout-session", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ sessionId, email: state.user.email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Payment could not be confirmed yet.");
    if (data.member) {
      mergeMemberIntoCurrentUser(data.member);
      upsertAccount(data.member);
      saveState();
      render();
      return true;
    }
  } catch (error) {
    showToast(error.message || "Payment confirmation is pending.");
  }
  return false;
}

async function manageBilling() {
  if (!state.user?.email) {
    state.modal = "auth";
    state.authTab = "login";
    render();
    return;
  }
  try {
    const response = await fetch("/.netlify/functions/stripe-create-portal-session", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email: state.user.email }),
    });
    const data = await response.json();
    if (data.url) {
      location.href = data.url;
      return;
    }
    showToast(data.error || "Billing portal is not configured yet.");
  } catch (error) {
    showToast("Billing portal is unavailable. Check Stripe portal setup.");
  }
}

async function cancelSubscription() {
  if (!isSubscriber() || !state.user?.stripeCustomerId) return;
  const confirmed = window.confirm("Cancel future billing? Your paid access stays active until the end of the current billing period.");
  if (!confirmed) return;
  try {
    const response = await fetch("/.netlify/functions/stripe-cancel-subscription", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email: state.user.email }),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || "Subscription could not be cancelled.");
      return;
    }
    if (data.member) {
      mergeMemberIntoCurrentUser(data.member);
      upsertAccount(data.member);
      saveState();
      render();
    }
    showToast(data.alreadyCancelled ? "Subscription is already set to cancel." : "Subscription will not renew.");
  } catch (error) {
    showToast("Subscription cancellation is unavailable. Check Stripe setup.");
  }
}

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  document.getElementById("readingProgress").style.width = `${pct}%`;
  document.body.classList.toggle("scrolled", window.scrollY > 80);
  document.querySelector(".hero-video")?.style.setProperty("--hero-offset", `${window.scrollY * 0.18}px`);
});

const checkoutParams = new URLSearchParams(location.search);
if (checkoutParams.get("checkout") === "success") {
  const sessionId = checkoutParams.get("session_id");
  if (state.user?.email) {
    confirmCheckoutSession(sessionId).then((confirmed) => {
      if (!confirmed) syncMember();
    });
  }
  history.replaceState({}, "", location.pathname);
  setTimeout(() => showToast("Payment received. Your membership is being updated."), 300);
}

render();
loadRemoteArticles();
syncMember();
refreshAdminStatus();
