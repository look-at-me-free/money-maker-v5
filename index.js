:root{
  --bg:#07080d;
  --ink:rgba(255,255,255,.96);
  --muted:rgba(255,255,255,.68);
  --stroke:rgba(255,255,255,.11);
  --panel:rgba(255,255,255,.035);
  --panel2:rgba(255,255,255,.06);
  --shadow:0 20px 60px rgba(0,0,0,.52);
  --radius:20px;
  --railW:min(336px, 23vw);
  --readerW:min(760px, 100%);
}

*{
  box-sizing:border-box;
}

html,
body{
  margin:0;
  min-height:100%;
  background:var(--bg);
  color:var(--ink);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
}

body{
  background:
    radial-gradient(900px 500px at 14% 0%, rgba(255,255,255,.055), transparent 60%),
    radial-gradient(800px 520px at 86% 12%, rgba(255,255,255,.04), transparent 55%),
    linear-gradient(180deg, #0a0b10 0%, #07080d 100%);
  overflow-x:hidden;
}

a{
  color:inherit;
  text-decoration:none;
}

.meta,
.nav a,
.smallbtn,
.search input,
.works-strip-label,
.topworks-trigger,
.topworks-link,
.entry-traversal-link,
.entry-traversal-current,
.entry-traversal-ghost,
.floating-nav-btn,
.note{
  font-family:"Pangolin", cursive;
  font-weight:400;
}

/* Header */
.hero{
  text-align:center;
  padding:20px 16px 10px;
  border-bottom:1px solid var(--stroke);
  background:linear-gradient(to bottom, rgba(255,255,255,.05), transparent 75%);
  position:relative;
  z-index:500;
  overflow:visible;
}

.hero-title{
  font-family:"Bitcount Prop Double Ink", system-ui, sans-serif;
  font-weight:700;
  font-size:clamp(1.8rem,5.2vw,3.8rem);
  margin:0;
  letter-spacing:.5px;
  color:var(--ink);
}

.hero-sub{
  margin:10px 0 0;
  color:rgba(255,255,255,.88);
  font-size:clamp(1.1rem, 2.6vw, 2rem);
  font-family:"Rubik Broken Fax", system-ui, sans-serif;
  letter-spacing:1px;
  line-height:1.15;
}

/* Top works strip */
.works-strip-wrap{
  max-width:1200px;
  margin:14px auto 0;
  padding:0 16px;
  position:relative;
  z-index:700;
  overflow:visible;
}

.works-strip-label{
  text-align:center;
  color:var(--muted);
  font-size:13px;
  margin:0 0 8px;
}

.works-strip{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  justify-content:center;
  align-items:center;
  position:relative;
  overflow:visible;
}

.topworks-item{
  position:relative;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  overflow:visible;
}

.topworks-item::after{
  content:"";
  position:absolute;
  left:0;
  right:0;
  top:100%;
  height:18px;
}

.topworks-trigger{
  appearance:none;
  border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06);
  color:var(--ink);
  padding:8px 14px;
  border-radius:999px;
  cursor:pointer;
  font-size:14px;
  line-height:1;
  transition:transform .12s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-height:38px;
}

.topworks-trigger:hover,
.topworks-item.open .topworks-trigger{
  background:rgba(255,255,255,.12);
  transform:translateY(-1px);
}

.topworks-item.active .topworks-trigger{
  background:rgba(255,255,255,.18);
  border-color:rgba(255,255,255,.28);
  box-shadow:0 10px 30px rgba(0,0,0,.28);
}

.topworks-caret{
  display:inline-block;
  width:8px;
  height:8px;
  border-right:2px solid rgba(255,255,255,.74);
  border-bottom:2px solid rgba(255,255,255,.74);
  transform:rotate(45deg);
  margin-top:-2px;
  opacity:.9;
}

.topworks-flyout{
  position:absolute;
  top:100%;
  left:50%;
  transform:translateX(-50%);
  min-width:250px;
  max-width:360px;
  padding:12px 10px 10px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(10,10,14,.98);
  box-shadow:0 20px 60px rgba(0,0,0,.55);
  backdrop-filter:blur(8px);
  display:none;
  z-index:10000;
}

.topworks-item:hover .topworks-flyout,
.topworks-item.open .topworks-flyout{
  display:block;
}

.topworks-links{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.topworks-link{
  display:block;
  text-decoration:none;
  color:var(--ink);
  padding:8px 10px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.05);
  font-size:13px;
  text-align:left;
  transition:transform .12s ease, background .12s ease, border-color .12s ease;
}

.topworks-link:hover,
.topworks-link.active{
  background:rgba(255,255,255,.12);
  border-color:rgba(255,255,255,.18);
  transform:translateY(-1px);
}

/* Toolbar */
.toolbar{
  max-width:1100px;
  margin:12px auto 0;
  padding:0 16px;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  align-items:center;
  justify-content:center;
}

.smallbtn{
  border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.06);
  color:var(--ink);
  padding:8px 12px;
  border-radius:999px;
  cursor:pointer;
  font-size:13px;
  transition:transform .12s ease, background .12s ease;
}

.smallbtn:hover{
  background:rgba(255,255,255,.10);
  transform:translateY(-1px);
}

.meta{
  color:var(--muted);
  font-size:12px;
  text-align:center;
  margin:10px 0 0;
}

/* Search */
.search-zone{
  max-width:1100px;
  margin:12px auto 0;
  padding:0 16px 6px;
}

.search-label{
  text-align:center;
  margin:0 0 8px;
  font-family:"Press Start 2P", system-ui, sans-serif;
  font-size:16px;
  letter-spacing:1.2px;
  color:rgba(255,255,255,.92);
  text-transform:uppercase;
}

.search{
  width:100%;
  display:flex;
  gap:10px;
  align-items:center;
  padding:12px 14px;
  border-radius:16px;
  border:2px solid rgba(255,255,255,.18);
  background:#fff;
  box-shadow:0 16px 50px rgba(0,0,0,.45);
}

.search input{
  width:100%;
  background:transparent;
  border:0;
  outline:0;
  color:#111;
  font-size:16px;
  caret-color:#000;
}

.search:focus-within{
  box-shadow:0 20px 60px rgba(0,0,0,.55);
  transform:translateY(-1px);
  transition:transform .12s ease, box-shadow .12s ease;
}

.kbd{
  font-size:12px;
  color:#333;
  border:1px solid rgba(0,0,0,.18);
  padding:4px 8px;
  border-radius:999px;
  background:rgba(0,0,0,.04);
  font-family:"Pangolin", cursive;
}

.nav{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  padding:0 0 10px;
  justify-content:center;
}

.nav a{
  text-decoration:none;
  padding:6px 12px;
  background:rgba(255,255,255,.07);
  border-radius:999px;
  color:white;
  font-size:13px;
  border:1px solid rgba(255,255,255,.12);
  transition:transform .12s ease, background .12s ease, border-color .12s ease;
}

.nav a:hover{
  transform:translateY(-1px);
  background:rgba(255,255,255,.12);
  border-color:rgba(255,255,255,.20);
}

/* Top banner */
.top-banner-shell{
  max-width:1100px;
  margin:16px auto 10px;
  padding:0 16px;
}

.top-banner-bar{
  width:100%;
  min-height:108px;
  border:1px solid var(--stroke);
  border-radius:20px;
  background:
    linear-gradient(
      90deg,
      rgba(255,255,255,.025) 0%,
      rgba(255,255,255,.07) 18%,
      rgba(255,255,255,.10) 50%,
      rgba(255,255,255,.07) 82%,
      rgba(255,255,255,.025) 100%
    ),
    linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  box-shadow:var(--shadow);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:8px 10px;
  overflow:hidden;
  position:relative;
}

.top-banner-bar::before,
.top-banner-bar::after{
  content:"";
  position:absolute;
  top:0;
  bottom:0;
  width:90px;
  pointer-events:none;
}

.top-banner-bar::before{
  left:0;
  background:linear-gradient(90deg, rgba(0,0,0,.20), transparent);
}

.top-banner-bar::after{
  right:0;
  background:linear-gradient(270deg, rgba(0,0,0,.20), transparent);
}

.top-banner-inner{
  width:100%;
  max-width:728px;
  min-height:90px;
  display:flex;
  align-items:center;
  justify-content:center;
}

/* Main layout */
.layout{
  max-width:1550px;
  margin:0 auto;
  padding:14px;
  display:grid;
  grid-template-columns:var(--railW) minmax(0, 1fr) var(--railW);
  gap:14px;
  align-items:start;
}

.center{
  width:var(--readerW);
  margin:0 auto;
  min-width:0;
}

/* Side rails */
.rail{
  position:sticky;
  top:16px;
  height:max-content;
}

.rail-stack{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.rail-stack .slot{
  min-height:250px;
  padding:6px;
}

/* Shared surfaces */
.slot,
.image-wrap,
.note{
  border:1px solid var(--stroke);
  border-radius:var(--radius);
  overflow:hidden;
  box-shadow:var(--shadow);
}

.slot{
  min-height:250px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(180deg, var(--panel2), var(--panel));
  margin-bottom:0;
}

.image-wrap{
  background:#000;
  margin-bottom:8px;
}

.image-wrap img{
  display:block;
  width:100%;
  height:auto;
  background:#000;
}

.note{
  padding:12px 14px;
  line-height:1.45;
  color:var(--muted);
  background:linear-gradient(180deg, var(--panel2), var(--panel));
  margin-bottom:12px;
}

/* Traversal */
.entry-traversal{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:12px;
  flex-wrap:nowrap;
  overflow-x:auto;
  overflow-y:hidden;
  width:100%;
  margin:18px auto 14px;
  padding:14px 18px;
  border-radius:22px;
  border:1px solid rgba(255,255,255,.15);
  background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  backdrop-filter:blur(8px);
  box-shadow:0 20px 60px rgba(0,0,0,.45);
  -ms-overflow-style:none;
  scrollbar-width:none;
}

.entry-traversal::-webkit-scrollbar{
  display:none;
}

.entry-traversal-link,
.entry-traversal-current,
.entry-traversal-ghost{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  text-decoration:none;
  min-height:42px;
  padding:10px 16px;
  border-radius:999px;
  white-space:nowrap;
  font-size:14px;
  font-family:"Pangolin", cursive;
}

.entry-traversal-link{
  color:white;
  border:1px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.06);
  transition:background .15s ease, transform .15s ease, border-color .15s ease, box-shadow .15s ease;
}

.entry-traversal-link:hover{
  background:rgba(255,255,255,.14);
  border-color:rgba(255,255,255,.25);
  transform:translateY(-1px);
  box-shadow:0 10px 30px rgba(0,0,0,.22);
}

.entry-traversal-current{
  color:white;
  background:rgba(255,255,255,.20);
  border:1px solid rgba(255,255,255,.35);
  box-shadow:0 10px 30px rgba(0,0,0,.25);
}

.entry-traversal-ghost{
  color:rgba(255,255,255,.55);
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.10);
  cursor:default;
}

/* Between-image ads */
.between-ad{
  margin:14px 0;
  padding:10px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.35));
  box-shadow:0 18px 60px rgba(0,0,0,.45);
}

.between-grid{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:10px;
  width:100%;
}

.between-grid .slot,
.between-grid .exo-slot{
  min-height:250px;
}

/* End ads */
.end-ads{
  margin:18px 0 18px;
  padding:16px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.35));
  box-shadow:0 18px 60px rgba(0,0,0,.45);
}

.end-ads-title{
  text-align:center;
  color:var(--muted);
  margin:0 0 12px;
  font-size:13px;
  font-family:"Pangolin", cursive;
}

.end-ads-grid{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:14px;
  align-items:stretch;
}

.end-ads-grid .exo-slot{
  width:100%;
  min-height:250px;
}

/* ExoClick centering */
.exo-slot ins,
.slot ins,
.top-banner-inner ins{
  display:block !important;
  margin:0 auto !important;
}

/* Floating nav */
.floating-nav{
  position:fixed;
  right:18px;
  bottom:18px;
  z-index:12000;
  display:flex;
  flex-direction:column;
  gap:10px;
  align-items:flex-end;
}

.floating-nav-btn{
  appearance:none;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(10,10,14,.88);
  color:rgba(255,255,255,.94);
  padding:10px 14px;
  min-height:42px;
  border-radius:999px;
  cursor:pointer;
  font-size:13px;
  line-height:1;
  box-shadow:0 18px 40px rgba(0,0,0,.38);
  backdrop-filter:blur(10px);
  transition:transform .12s ease, background .12s ease, border-color .12s ease;
  font-family:"Pangolin", cursive;
}

.floating-nav-btn:hover{
  transform:translateY(-1px);
  background:rgba(255,255,255,.14);
  border-color:rgba(255,255,255,.28);
}

/* Responsive */
@media (max-width: 1280px){
  .layout{
    grid-template-columns:1fr;
  }

  .rail{
    position:relative;
    top:auto;
  }

  .rail-stack{
    display:grid;
    grid-template-columns:repeat(3, minmax(0, 1fr));
    gap:10px;
  }

  .center{
    width:min(820px, 100%);
  }
}

@media (max-width: 860px){
  .between-grid{
    grid-template-columns:1fr;
  }

  .rail-stack{
    grid-template-columns:1fr;
  }

  .layout{
    padding:12px;
    gap:12px;
  }

  .top-banner-shell{
    padding:0 12px;
  }

  .top-banner-bar{
    min-height:102px;
    border-radius:18px;
    padding:8px 10px;
  }

  .hero{
    padding:22px 12px 10px;
  }

  .hero-title{
    font-size:clamp(1.9rem, 7vw, 3rem);
  }

  .hero-sub{
    font-size:1rem;
  }

  .end-ads-grid{
    grid-template-columns:repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px){
  .entry-traversal{
    gap:8px;
    padding:12px;
    border-radius:16px;
  }

  .entry-traversal-link,
  .entry-traversal-current,
  .entry-traversal-ghost{
    min-height:38px;
    padding:9px 12px;
    font-size:13px;
  }

  .floating-nav{
    right:12px;
    bottom:12px;
    gap:8px;
  }

  .floating-nav-btn{
    padding:9px 12px;
    min-height:38px;
    font-size:12px;
  }
}

@media (max-width: 600px){
  .search{
    flex-wrap:wrap;
    border-radius:18px;
  }

  .kbd{
    display:none;
  }

  .hero{
    padding:18px 12px 8px;
  }

  .layout{
    padding:8px 12px 18px;
  }

  .works-strip{
    gap:8px;
  }

  .topworks-trigger{
    font-size:13px;
    padding:8px 12px;
  }

  .hero-sub{
    font-size:clamp(1rem, 6vw, 1.5rem);
  }

  .end-ads-grid{
    grid-template-columns:1fr;
  }
}
