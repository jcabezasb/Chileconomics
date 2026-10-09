// Rutas del sitio. Vercel redirige todo a index.html (ver vercel.json) y la app elige la vista.

export const SECTION_PATHS = {
    landing: '/',
    datos: '/datos',
    blog: '/blog',
    videos: '/videos',
    contacto: '/contacto',
    desarrollo: '/desarrollo'
};

// Artículos del blog con página propia (sin la navegación del sitio).
export const BLOG_POST_PATHS = {
    'el-precio-como-coordinador': '/blog/el-precio-como-coordinador'
};

export const normalizePath = (pathname) => (
    pathname && pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname || '/'
);

// '/datos' -> { section: 'datos' }; '/blog/<slug>' -> { section: 'blogPost', slug }; desconocida -> landing.
export const resolveRoute = (pathname) => {
    const path = normalizePath(pathname);
    const post = Object.entries(BLOG_POST_PATHS).find(([, postPath]) => postPath === path);
    if (post) return { section: 'blogPost', slug: post[0] };
    const section = Object.entries(SECTION_PATHS).find(([, sectionPath]) => sectionPath === path);
    return { section: section ? section[0] : 'landing' };
};
