import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.jsx'
import BlogPostPriceCoordinator from './features/blog-posts/BlogPostPriceCoordinator.jsx'
import './styles/global.css'

const Root = () => {
    const rawPath = window.location.pathname
    const path = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath
    if (path === '/blog/el-precio-como-coordinador') {
        return <BlogPostPriceCoordinator />
    }
    return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Root />
    </React.StrictMode>,
)
