(function () {
  'use strict';

  const PROTOTYPE_KEY = 'masofishPrototypeForumV1';
  const FORUM_BUCKET = 'forum-images';
  const byId = id => document.getElementById(id);
  const list = byId('dashboardCommunityList');

  if (!list) return;

  const categoryLabels = {
    catch: 'Catch Story',
    question: 'Question',
    tip: 'Fishing Tip',
    safety: 'Safety',
    market: 'Market',
    general: 'General'
  };

  const categoryClasses = {
    catch: 'bg-secondary-container/45 text-on-secondary-container',
    question: 'bg-blue-100 text-blue-900',
    tip: 'bg-emerald-100 text-emerald-900',
    safety: 'bg-amber-100 text-amber-950',
    market: 'bg-violet-100 text-violet-900',
    general: 'bg-slate-100 text-slate-800'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function readPrototypeStore() {
    try {
      const stored = JSON.parse(localStorage.getItem(PROTOTYPE_KEY) || 'null');
      if (
        stored &&
        Array.isArray(stored.posts) &&
        Array.isArray(stored.comments) &&
        Array.isArray(stored.likes)
      ) {
        return stored;
      }
    } catch (error) {
      console.warn('Could not read prototype community data:', error);
    }

    return { posts: [], comments: [], likes: [] };
  }

  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  function excerpt(value, maximum = 145) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maximum ? `${text.slice(0, maximum - 1).trim()}…` : text;
  }

  function imageUrl(post, client) {
    if (post.image_url) return post.image_url;

    if (post.image_path && client) {
      return client.storage
        .from(FORUM_BUCKET)
        .getPublicUrl(post.image_path)
        .data
        .publicUrl;
    }

    return null;
  }

  function enrich(posts, comments, likes, client) {
    return posts.map(post => ({
      ...post,
      displayImageUrl: imageUrl(post, client),
      commentCount: comments.filter(comment => comment.post_id === post.id).length,
      likeCount: likes.filter(like => like.post_id === post.id).length
    }));
  }

  async function loadSupabase(client) {
    const { data: posts, error: postsError } = await client
      .from('forum_posts')
      .select('id,user_id,author_name,title,content,category,catch_name,catch_location,catch_date,image_path,image_url,created_at')
      .order('created_at', { ascending: false })
      .limit(4);

    if (postsError) throw postsError;
    if (!posts?.length) return [];

    const postIds = posts.map(post => post.id);

    const [commentsResult, likesResult] = await Promise.all([
      client
        .from('forum_comments')
        .select('id,post_id')
        .in('post_id', postIds),
      client
        .from('forum_likes')
        .select('post_id,user_id')
        .in('post_id', postIds)
    ]);

    if (commentsResult.error) {
      console.warn('Recent community comment counts unavailable:', commentsResult.error);
    }
    if (likesResult.error) {
      console.warn('Recent community appreciation counts unavailable:', likesResult.error);
    }

    return enrich(
      posts,
      commentsResult.data || [],
      likesResult.data || [],
      client
    );
  }

  function loadPrototype() {
    const store = readPrototypeStore();
    const posts = [...store.posts]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 4);

    return enrich(posts, store.comments || [], store.likes || [], null);
  }

  function render(posts) {
    const loading = byId('dashboardCommunityLoading');
    const emptyState = byId('dashboardCommunityEmpty');

    loading.hidden = true;
    loading.classList.add('hidden');

    const hasPosts = posts.length > 0;
    emptyState.hidden = hasPosts;
    emptyState.classList.toggle('hidden', hasPosts);

    byId('dashboardCommunityStatus').textContent = posts.length
      ? `${posts.length} recent ${posts.length === 1 ? 'discussion' : 'discussions'}`
      : 'No discussions have been posted yet.';

    list.innerHTML = posts.map(post => {
      const image = post.displayImageUrl;
      const category = categoryLabels[post.category] || categoryLabels.general;
      const categoryClass = categoryClasses[post.category] || categoryClasses.general;
      const details = [post.catch_name, post.catch_location].filter(Boolean).join(' • ');

      return `
        <a href="forum.html?post=${encodeURIComponent(post.id)}"
           class="block bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:bg-surface-container-low active:scale-[0.99] transition">
          <article class="${image ? 'grid grid-cols-[96px_1fr]' : 'block'}">
            ${image ? `
              <div class="min-h-[132px] bg-surface-container-high">
                <img src="${escapeHtml(image)}"
                     alt="${escapeHtml(post.title)}"
                     class="w-full h-full min-h-[132px] object-cover"/>
              </div>` : ''}

            <div class="p-4 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <span class="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${categoryClass}">
                  ${escapeHtml(category)}
                </span>
                <span class="text-[11px] font-bold text-on-surface-variant shrink-0">
                  ${escapeHtml(relativeTime(post.created_at))}
                </span>
              </div>

              <h4 class="font-body-md text-body-md font-bold leading-tight text-primary mt-2 line-clamp-2">
                ${escapeHtml(post.title)}
              </h4>

              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                ${escapeHtml(excerpt(post.content))}
              </p>

              ${details ? `
                <p class="text-[11px] font-bold text-secondary mt-2 truncate">
                  ${escapeHtml(details)}
                </p>` : ''}

              <div class="flex items-center justify-between gap-3 mt-3 text-[11px] text-on-surface-variant">
                <span class="truncate">By ${escapeHtml(post.author_name || 'MASOFISH User')}</span>
                <span class="flex items-center gap-3 shrink-0">
                  <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">favorite</span>
                    ${post.likeCount}
                  </span>
                  <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">chat_bubble</span>
                    ${post.commentCount}
                  </span>
                </span>
              </div>
            </div>
          </article>
        </a>`;
    }).join('');
  }

  function showUnavailable(error) {
    console.error('Recent community posts could not be loaded:', error);
    const loading = byId('dashboardCommunityLoading');
    const emptyState = byId('dashboardCommunityEmpty');

    loading.hidden = true;
    loading.classList.add('hidden');
    byId('dashboardCommunityStatus').textContent = 'Community feed unavailable.';
    emptyState.hidden = false;
    emptyState.classList.remove('hidden');
    byId('dashboardCommunityEmpty').querySelector('p.font-bold').textContent =
      'Community feed unavailable';
    byId('dashboardCommunityEmpty').querySelector('p.font-body-sm').textContent =
      'Open the forum to view discussions or check the Supabase forum setup.';
  }

  async function initialize() {
    const ready = await window.masofishAuthReady;
    if (!ready) return;

    if (ready.mode === 'supabase') {
      try {
        const posts = await loadSupabase(window.MASOFISH_AUTH.client);
        render(posts);
      } catch (error) {
        const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();

        if (
          message.includes('forum_posts') ||
          message.includes('does not exist') ||
          message.includes('relation')
        ) {
          render(loadPrototype());
          byId('dashboardCommunityStatus').textContent =
            'Prototype discussions shown — run the forum Supabase schema.';
        } else {
          throw error;
        }
      }
    } else {
      render(loadPrototype());
    }
  }

  initialize().catch(showUnavailable);
})();