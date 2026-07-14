import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowLeft,
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import "./styles.css";

const sourceData = window.INSPIRATION_DATA || { items: [], generatedAt: "" };
const imageMeta = window.IMAGE_META || {};
const allItems = (sourceData.items || []).map((item, index) => {
  const imagePath = item.imageUrl || item.relativePath || "";
  const thumbPath = imagePath
    ? imagePath.replace(/^image\//, "thumbs/").replace(/\.[^.]+$/, ".jpg")
    : "";
  const meta = imageMeta[imagePath];

  return {
    ...item,
    id: item.id || `${item.fileName}-${index}`,
    imageSrc: `/${imagePath}`,
    thumbSrc: thumbPath ? `/${thumbPath}` : `/${imagePath}`,
    width: meta?.width,
    height: meta?.height,
    aspectRatio: meta?.width && meta?.height ? `${meta.width} / ${meta.height}` : "4 / 3",
    aiTags: item.aiTags || {},
    aiKeywords: Array.isArray(item.aiKeywords) ? item.aiKeywords : [],
    tags: Array.isArray(item.tags) ? item.tags : []
  };
});

const tagDimensions = ["建筑类型", "设计风格", "材料元素", "色彩特征", "场景用途"];

function App() {
  const [view, setView] = useState(() => (window.location.hash === "#profile" ? "profile" : "home"));
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("全部");
  const [favorites, setFavorites] = useState(() => readStoredList("architect-react-favorites"));
  const [likes, setLikes] = useState(() => readStoredList("architect-react-likes"));
  const [comments, setComments] = useState(() => readStoredObject("architect-react-comments"));
  const [selectedItem, setSelectedItem] = useState(null);

  const heroItems = useMemo(() => allItems.slice(0, 7), []);
  const tagOptions = useMemo(() => getTopTags(allItems), []);
  const favoriteItems = useMemo(
    () => allItems.filter((item) => favorites.includes(itemKey(item))),
    [favorites]
  );
  const commentEntries = useMemo(() => {
    return Object.entries(comments).flatMap(([key, values]) => {
      const item = allItems.find((candidate) => itemKey(candidate) === key);
      return (values || []).map((comment) => ({ comment, item }));
    });
  }, [comments]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalize(query);
    return allItems.filter((item) => {
      const tags = getAllTags(item);
      const tagMatched = activeTag === "全部" || tags.includes(activeTag);
      const textMatched = !normalizedQuery || normalize(getSearchText(item)).includes(normalizedQuery);
      return tagMatched && textMatched;
    });
  }, [activeTag, query]);

  function toggleFavorite(item) {
    const key = itemKey(item);
    const next = favorites.includes(key)
      ? favorites.filter((value) => value !== key)
      : [key, ...favorites];
    setFavorites(next);
    localStorage.setItem("architect-react-favorites", JSON.stringify(next));
  }

  function toggleLike(item) {
    const key = itemKey(item);
    const next = likes.includes(key)
      ? likes.filter((value) => value !== key)
      : [key, ...likes];
    setLikes(next);
    localStorage.setItem("architect-react-likes", JSON.stringify(next));
  }

  function addComment(item, text) {
    const content = text.trim();
    if (!content) return;
    const key = itemKey(item);
    const nextComments = {
      ...comments,
      [key]: [
        {
          id: `${Date.now()}`,
          author: "Allen",
          time: new Date().toLocaleString("zh-CN", { hour12: false }),
          text: content
        },
        ...(comments[key] || [])
      ]
    };
    setComments(nextComments);
    localStorage.setItem("architect-react-comments", JSON.stringify(nextComments));
  }

  function openHome() {
    setView("home");
    window.history.replaceState(null, "", "#top");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openProfile() {
    setView("profile");
    window.history.replaceState(null, "", "#profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="site-shell">
      {view === "profile" ? (
        <PersonalSpacePage
          items={allItems}
          favoriteItems={favoriteItems}
          commentEntries={commentEntries}
          onBack={openHome}
          onSelect={setSelectedItem}
        />
      ) : (
        <>
          <Header onHome={openHome} onProfile={openProfile} />
          <Hero items={heroItems} onProfile={openProfile} />

          <main>
            <section className="section gallery-section" id="gallery">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Material library</p>
                  <h2>灵感素材流</h2>
                </div>
                <div className="section-tools">
                  <label className="search-box">
                    <Search size={18} strokeWidth={1.8} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索标题、AI 标签、材料、场景"
                    />
                  </label>
                </div>
              </div>

              <div className="filter-row" aria-label="素材筛选">
                {["全部", ...tagOptions].map((tag) => (
                  <button
                    key={tag}
                    className={`filter-chip ${activeTag === tag ? "is-active" : ""}`}
                    onClick={() => setActiveTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="gallery-summary">
                <span>{filteredItems.length} 张可见素材</span>
                <span>数据更新 {sourceData.generatedAt || "未记录"}</span>
              </div>

              <MasonryGallery items={filteredItems} onSelect={setSelectedItem} />
            </section>
          </main>
        </>
      )}

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          isFavorite={favorites.includes(itemKey(selectedItem))}
          isLiked={likes.includes(itemKey(selectedItem))}
          comments={comments[itemKey(selectedItem)] || []}
          onClose={() => setSelectedItem(null)}
          onFavorite={() => toggleFavorite(selectedItem)}
          onLike={() => toggleLike(selectedItem)}
          onComment={(text) => addComment(selectedItem, text)}
        />
      )}
    </div>
  );
}

function Header({ onHome, onProfile }) {
  return (
    <header className="nav">
      <button className="brand" onClick={onHome} aria-label="返回首页">
        <span className="brand-mark">
          <Building2 size={22} strokeWidth={1.7} />
        </span>
        <span>建筑师灵感库</span>
      </button>
      <nav>
        <a href="#gallery">素材</a>
        <button onClick={onProfile}>个人空间</button>
      </nav>
      <button className="nav-user" onClick={onProfile} aria-label="进入 Allen 的个人空间">
        <img src="/avatar-small.jpg" alt="" onError={(event) => fallbackImage(event, "/avatar.jpg")} />
        <span>Allen</span>
      </button>
    </header>
  );
}

function Hero({ items, onProfile }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const featured = items[activeIndex] || items[0];
  const showcaseItems = items.slice(0, 5);
  const moveShowcase = (direction) => {
    if (!showcaseItems.length) return;
    setActiveIndex((current) => (current + direction + showcaseItems.length) % showcaseItems.length);
  };

  return (
    <section className="hero" id="top">
      <div className="hero-background" />

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow">AI Product Manager Workspace</p>
          <h1>让建筑灵感，自动被看见</h1>
          <p className="hero-lede">
            从散落的图像、标题、作者与网页链接中，沉淀一座可搜索、可筛选、可收藏的建筑灵感库。
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="#gallery">
              浏览素材
              <ArrowDown size={17} strokeWidth={1.8} />
            </a>
            <button className="ghost-link" onClick={onProfile}>个人空间</button>
          </div>
        </div>

        <div className="hero-stage" aria-label="精选建筑灵感切换">
          <div className="hero-preview-stack">
            {showcaseItems.map((item, index) => (
              <button
                key={item.id}
                className={`hero-preview hero-preview-${index + 1} ${activeIndex === index ? "is-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`展示 ${item.title || "建筑灵感图片"}`}
              >
                <ThumbImage item={item} eager={index < 2} />
              </button>
            ))}
          </div>

          {featured && (
            <article className="featured-card" key={featured.id}>
              <ThumbImage item={featured} alt={featured.title} eager />
              <div className="featured-controls">
                <button onClick={() => moveShowcase(-1)} aria-label="上一张精选图片">
                  <ChevronLeft size={20} strokeWidth={1.9} />
                </button>
                <button onClick={() => moveShowcase(1)} aria-label="下一张精选图片">
                  <ChevronRight size={20} strokeWidth={1.9} />
                </button>
              </div>
              <div className="featured-caption">
                <span>今日精选</span>
                <strong>{featured.title}</strong>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

function PersonalSpacePage({ items, favoriteItems, commentEntries, onBack, onSelect }) {
  const [activePanel, setActivePanel] = useState("boards");
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [customBoards, setCustomBoards] = useState([]);
  const visibleItems = favoriteItems.length ? favoriteItems : items.slice(0, 16);
  const baseBoards = useMemo(() => buildBoards(visibleItems), [visibleItems]);
  const boards = useMemo(() => [...customBoards, ...baseBoards], [customBoards, baseBoards]);

  function switchPanel(panel) {
    setSelectedBoard(null);
    setActivePanel(panel);
  }

  function createBoard() {
    const newBoard = {
      title: `我的画板 ${customBoards.length + 1}`,
      items: visibleItems.slice(0, Math.min(6, visibleItems.length))
    };
    setCustomBoards([newBoard, ...customBoards]);
    setActivePanel("boards");
  }

  if (selectedBoard) {
    return (
      <main className="profile-page">
        <div className="profile-topbar">
          <button className="profile-back" onClick={() => setSelectedBoard(null)} aria-label="返回画板列表">
            <ArrowLeft size={19} />
            返回画板
          </button>
          <label className="profile-search">
            <Search size={19} />
            <input placeholder="搜索当前画板图片" />
        </label>
        <button className="profile-avatar-button" aria-label="Allen">
          <img src="/avatar-small.jpg" alt="" onError={(event) => fallbackImage(event, "/avatar.jpg")} />
        </button>
        </div>

        <section className="profile-hero profile-hero-simple">
          <div>
            <p className="eyebrow">灵感画板</p>
            <h1>{selectedBoard.title}</h1>
            <p className="profile-hero-note">{selectedBoard.items.length} 张灵感图片</p>
          </div>
        </section>

        <section className="profile-content">
          <MasonryGallery items={selectedBoard.items} onSelect={onSelect} />
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-topbar">
        <button className="profile-back" onClick={onBack} aria-label="返回灵感库">
          <ArrowLeft size={19} />
          灵感库
        </button>
        <label className="profile-search">
          <Search size={19} />
          <input placeholder="搜索收藏、画板、AI 标签" />
        </label>
        <button className="profile-avatar-button" aria-label="Allen">
          <img src="/avatar-small.jpg" alt="" onError={(event) => fallbackImage(event, "/avatar.jpg")} />
        </button>
      </div>

      <section className="profile-hero">
        <div>
          <p className="eyebrow">灵感工作台</p>
          <h1>Allen 的灵感空间</h1>
        </div>
      </section>

      <section className="profile-content">
        <div className="profile-tabs">
          <button className={activePanel === "all" ? "is-active" : ""} onClick={() => switchPanel("all")}>
            全部收藏
          </button>
          <button className={activePanel === "boards" ? "is-active" : ""} onClick={() => switchPanel("boards")}>
            灵感画板
          </button>
          <button className={activePanel === "comments" ? "is-active" : ""} onClick={() => switchPanel("comments")}>
            评论记录
          </button>
        </div>

        <div className="profile-tools">
          <button aria-label="筛选">
            <SlidersHorizontal size={22} />
          </button>
          <button onClick={() => switchPanel("boards")}>按类型分组</button>
          <button className="create-board" onClick={createBoard}>
            <Plus size={18} />
            新建画板
          </button>
        </div>

        {activePanel === "all" && (
          <MasonryGallery items={visibleItems} onSelect={onSelect} />
        )}

        {activePanel === "boards" && (
          <div className="boards-grid">
            {boards.map((board) => (
              <button className="board-card" key={board.title} onClick={() => setSelectedBoard(board)}>
                <div className="board-cover">
                  {board.items.slice(0, 4).map((item, index) => (
                  <ThumbImage key={`${item.id}-${index}`} item={item} />
                  ))}
                </div>
                <strong>{board.title}</strong>
                <span>{board.items.length} 张灵感</span>
              </button>
            ))}
          </div>
        )}

        {activePanel === "comments" && (
          <div className="comment-records">
            {commentEntries.length ? (
              commentEntries.map(({ comment, item }) => (
                <button
                  className="comment-record"
                  key={comment.id}
                  onClick={() => item && onSelect(item)}
                >
                  {item && <ThumbImage item={item} />}
                  <div>
                    <strong>{item?.title || "已评论图片"}</strong>
                    <p>{comment.text}</p>
                    <span>{comment.time}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="profile-empty">还没有评论记录。</div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function MasonryGallery({ items, onSelect }) {
  if (!items.length) {
    return <div className="empty-state">没有匹配的素材，换一个关键词试试。</div>;
  }

  return (
    <div className="masonry">
      {items.map((item) => (
        <article className="inspiration-card image-only-card" key={item.id}>
          <button
            className="card-open"
            style={{ aspectRatio: item.aspectRatio }}
            onClick={() => onSelect(item)}
            aria-label={`查看 ${item.title || "素材"} 的详情`}
          >
            <ThumbImage item={item} alt={item.title} />
            <span className="card-title-overlay">{item.title || "未命名素材"}</span>
          </button>
          {item.link && (
            <a
              className="card-source-jump"
              href={item.link}
              target="_blank"
              rel="noreferrer"
              aria-label="前往原文地址"
              title="前往原文地址"
            >
              <ExternalLink size={17} strokeWidth={1.9} />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}

function DetailModal({
  item,
  isFavorite,
  isLiked,
  comments,
  onClose,
  onFavorite,
  onLike,
  onComment
}) {
  const [draft, setDraft] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const allTags = unique([...item.aiKeywords, ...getAllTags(item)]).slice(0, 18);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <article className="detail-modal" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={onClose} aria-label="关闭详情">
            <X size={20} strokeWidth={1.8} />
          </button>

          <button
            className="detail-image-panel"
            onClick={() => setViewerOpen(true)}
            aria-label="查看大图"
          >
            <img src={item.imageSrc} alt={item.title} decoding="async" />
            <span>点击查看大图</span>
          </button>

          <div className="detail-content">
            <div className="detail-kicker">
              <span>{item.user || "未知作者"}</span>
              <span>{formatDate(item.crawlTime || item.lastModified)}</span>
            </div>
            <h2>{item.title || "未命名素材"}</h2>
            <p className="detail-summary">
              {item.aiSummary || "这张素材正在等待 AI 完成空间语义分析。"}
            </p>

            <div className="detail-actions">
              <button className={isLiked ? "action-pill is-active" : "action-pill"} onClick={onLike}>
                <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
                点赞
              </button>
              <button className={isFavorite ? "action-pill is-active" : "action-pill"} onClick={onFavorite}>
                <Bookmark size={17} fill={isFavorite ? "currentColor" : "none"} />
                收藏
              </button>
              {item.link && (
                <a className="action-pill" href={item.link} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  原始链接
                </a>
              )}
            </div>

            <section className="detail-block">
              <h3>AI 打标</h3>
              <div className="tag-matrix">
                {tagDimensions.map((dimension) => (
                  <div className="tag-row-detail" key={dimension}>
                    <strong>{dimension}</strong>
                    <TagLine tags={item.aiTags?.[dimension] || []} />
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-block">
              <h3>关键词</h3>
              <TagLine tags={allTags} />
            </section>

            <section className="detail-block meta-block">
              <h3>来源信息</h3>
              <dl>
                <div>
                  <dt>本地文件</dt>
                  <dd>{item.relativePath || item.fileName || "未记录"}</dd>
                </div>
                <div>
                  <dt>图片来源</dt>
                  <dd>{item.imageSource || item.link || "未记录"}</dd>
                </div>
              </dl>
            </section>

            <section className="detail-block comments-block">
              <div className="comments-title">
                <h3>评论</h3>
                <span>{comments.length}</span>
              </div>
              <div className="comment-form">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="记录这张图带来的想法"
                />
                <button
                  onClick={() => {
                    onComment(draft);
                    setDraft("");
                  }}
                >
                  <Send size={16} />
                  发送
                </button>
              </div>
              <div className="comment-list">
                {comments.length ? (
                  comments.map((comment) => (
                    <article className="comment-item" key={comment.id}>
                      <div>
                        <strong>{comment.author}</strong>
                        <span>{comment.time}</span>
                      </div>
                      <p>{comment.text}</p>
                    </article>
                  ))
                ) : (
                  <p className="comment-empty">
                    <MessageCircle size={16} />
                    还没有评论。
                  </p>
                )}
              </div>
            </section>
          </div>
        </article>
      </div>

      {viewerOpen && (
        <ImageViewer
          item={item}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

function ImageViewer({ item, onClose }) {
  const [zoom, setZoom] = useState(1);
  const normalizedZoom = Math.round(zoom * 100);

  function changeZoom(nextZoom) {
    setZoom(Math.min(4, Math.max(0.5, Number(nextZoom.toFixed(2)))));
  }

  function handleWheel(event) {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY > 0 ? -0.12 : 0.12));
  }

  return (
    <div className="image-viewer-backdrop" onClick={onClose}>
      <div className="image-viewer" onClick={(event) => event.stopPropagation()}>
        <div className="image-viewer-toolbar">
          <span>{normalizedZoom}%</span>
          <button onClick={() => changeZoom(zoom - 0.2)} aria-label="缩小">
            <ZoomOut size={18} />
          </button>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.05"
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            aria-label="缩放比例"
          />
          <button onClick={() => changeZoom(zoom + 0.2)} aria-label="放大">
            <ZoomIn size={18} />
          </button>
          <button onClick={() => changeZoom(1)} aria-label="重置缩放">
            <RotateCcw size={17} />
          </button>
          <button onClick={onClose} aria-label="关闭大图">
            <X size={19} />
          </button>
        </div>
        <div className="image-viewer-stage" onWheel={handleWheel}>
          <img
            src={item.imageSrc}
            alt={item.title}
            className={zoom === 1 ? "is-fit" : ""}
            style={
              zoom === 1
                ? undefined
                : { width: `${zoom * 100}%` }
            }
          />
        </div>
      </div>
    </div>
  );
}

function TagLine({ tags }) {
  const values = unique(tags);
  if (!values.length) return <span className="muted-text">未识别</span>;
  return (
    <div className="tag-line">
      {values.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function ThumbImage({ item, alt = "", eager = false }) {
  return (
    <img
      src={item.thumbSrc}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      onError={(event) => fallbackImage(event, item.imageSrc)}
    />
  );
}

function fallbackImage(event, fallbackSrc) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = fallbackSrc;
}

function buildBoards(items) {
  const grouped = new Map();
  items.forEach((item) => {
    const label = getAllTags(item)[0] || "灵感收藏";
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(item);
  });

  const boards = [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .map(([title, boardItems]) => ({ title, items: boardItems }));

  if (boards.length >= 8) return boards;

  return [
    ...boards,
    ...["空间", "分析图", "场馆", "学校", "平面", "图标", "植物", "人物"]
      .slice(0, 8 - boards.length)
      .map((title, index) => ({
        title,
        items: items.slice(index, index + 4).length ? items.slice(index, index + 4) : items.slice(0, 4)
      }))
  ];
}

function getAllTags(item) {
  return unique([
    ...item.tags,
    ...tagDimensions.flatMap((dimension) => item.aiTags?.[dimension] || [])
  ]);
}

function getSearchText(item) {
  return [
    item.title,
    item.user,
    item.aiSummary,
    item.fileName,
    ...item.aiKeywords,
    ...getAllTags(item)
  ].join(" ");
}

function getTopTags(items) {
  const counts = new Map();
  items.forEach((item) => {
    getAllTags(item).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([tag]) => tag);
}

function itemKey(item) {
  return item.relativePath || item.fileName || item.id;
}

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function readStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s"'“”‘’｜|·.,，。:：;；!?！？()[\]【】{}<>《》_\-—/\\]+/g, "");
}

function formatDate(value) {
  const text = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  if (/^\d{8}/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  return "未记录";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

createRoot(document.getElementById("root")).render(<App />);
