import React from 'react';

const blogPosts = [
    {
        id: 'precio-como-coordinador',
        series: 'Serie 01',
        time: 'Lectura breve',
        title: 'El precio como coordinador',
        excerpt:
            'El precio resume informacion dispersa: escasez, costos y valoraciones. Es el numero que permite que millones de decisiones descentralizadas se coordinen sin un plan central.',
        href: '/blog/el-precio-como-coordinador'
    }
];

const BlogSection = () => (
    <section id="blog" className="blog-section">
        <div className="blog-hero">
            <div className="blog-kicker">CHILECONOMICS</div>
            <h1 className="blog-title">Blog de divulgacion</h1>
            <p className="blog-subtitle">
                Ideas economicas claras, visuales y directas. Primer paso: entender el precio como el
                gran coordinador.
            </p>
        </div>

        <div className="blog-list">
            {blogPosts.map((post) => (
                <a key={post.id} className="blog-link" href={post.href}>
                    <div className="blog-link-meta">
                        <span className="blog-tag">{post.series}</span>
                        <span className="blog-time">{post.time}</span>
                    </div>
                    <h2 className="blog-link-title">{post.title}</h2>
                    <p className="blog-link-excerpt">{post.excerpt}</p>
                    <span className="blog-link-cta">Leer articulo</span>
                </a>
            ))}
        </div>
    </section>
);

export default BlogSection;
