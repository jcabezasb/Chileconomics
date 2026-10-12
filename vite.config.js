import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        sourcemap: false,
        rollupOptions: {
            output: {
                // Librerías grandes en archivos propios: cambian poco y el navegador las mantiene en caché.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
                    if (/react-simple-maps|topojson|d3-geo|d3-zoom|d3-selection|d3-drag|d3-dispatch|d3-transition/.test(id)) return 'map';
                    if (/recharts|victory-vendor|d3-|lodash|eventemitter3|react-smooth|decimal\.js/.test(id)) return 'charts';
                    return undefined;
                }
            }
        }
    },
    test: {
        include: ['src/**/*.test.js']
    }
});
