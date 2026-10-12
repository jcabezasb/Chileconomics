import { Suspense, lazy, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import HeroHeader from './shell/HeroHeader';
import LandingRibbons from './shell/LandingRibbons';
import TopNav from './shell/TopNav';
import useRoute from './hooks/useRoute';
import useTheme from './hooks/useTheme';
import useRevealOnScroll from './hooks/useRevealOnScroll';
import PlaceholderSection from '../shared/components/PlaceholderSection';
import ContactSection from '../features/contact/ContactSection';
import DevelopmentSection from '../features/development/DevelopmentSection';
import BlogSection from '../features/blog/BlogSection';

// Las vistas pesadas (gráficos, mapa, artículos) se descargan solo cuando se visitan.
const DatosPage = lazy(() => import('../features/datos/DatosPage'));
const BlogPostPriceCoordinator = lazy(() => import('../features/blog-posts/BlogPostPriceCoordinator'));

const VIDEO_ITEMS = [
    {
        title: 'Videos explicativos',
        badge: 'PROXIMAMENTE',
        description: 'Series cortas y entrevistas para explicar datos con claridad.'
    }
];

const DEVELOPMENT_ITEMS = [
    { id: 'dev-1', label: 'Detalles en graficos', done: true },
    { id: 'dev-2', label: 'Descarga de datos', done: true },
    { id: 'dev-3', label: 'Correcciones y mejoras visuales', done: true },
    { id: 'dev-4', label: 'Correo oficial', done: true }
];

const useHasScrolled = () => {
    const [hasScrolled, setHasScrolled] = useState(false);
    useEffect(() => {
        const handleScroll = () => setHasScrolled(window.scrollY > 20);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    return hasScrolled;
};

const Tracking = () => (
    <>
        <Analytics />
        <SpeedInsights />
    </>
);

function App() {
    const { route, navigate } = useRoute();
    const { theme, toggleTheme } = useTheme();
    const hasScrolled = useHasScrolled();
    const section = route.section;
    const registerLandingReveal = useRevealOnScroll(0.2, section === 'landing');

    // Los artículos tienen diseño propio, sin la navegación del sitio.
    if (section === 'blogPost') {
        return (
            <>
                <Suspense fallback={null}>
                    <BlogPostPriceCoordinator />
                </Suspense>
                <Tracking />
            </>
        );
    }

    return (
        <div className={`container ${hasScrolled ? 'has-scrolled' : 'intro-only'} ${section === 'landing' ? 'is-landing' : ''}`}>
            <TopNav
                theme={theme}
                onToggleTheme={toggleTheme}
                activeSection={section}
                onSelectSection={navigate}
                isVisible={section !== 'landing'}
            />

            {section === 'landing' ? (
                <>
                    <HeroHeader />
                    <LandingRibbons
                        activeSection={section}
                        onSelectSection={navigate}
                        sectionRef={registerLandingReveal(0)}
                    />
                </>
            ) : null}

            {section === 'datos' ? (
                <Suspense fallback={null}>
                    <DatosPage theme={theme} />
                </Suspense>
            ) : null}

            {section === 'blog' ? <BlogSection /> : null}

            {section === 'videos' ? (
                <PlaceholderSection
                    title="Videos"
                    subtitle="Contenido audiovisual para explicar los datos con claridad y contexto."
                    items={VIDEO_ITEMS}
                />
            ) : null}

            {section === 'contacto' ? <ContactSection /> : null}

            {section === 'desarrollo' ? <DevelopmentSection items={DEVELOPMENT_ITEMS} /> : null}

            <Tracking />
        </div>
    );
}

export default App;
