import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import {TanStackRouterVite} from '@tanstack/router-plugin/vite';
import tailwindcss from "@tailwindcss/vite";
import path from 'path';

export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [
        TanStackRouterVite(),
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@lib': path.resolve(__dirname, './src/lib'),
            '@components': path.resolve(__dirname, './src/components'),
            '@types': path.resolve(__dirname, './src/types'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@stores': path.resolve(__dirname, './src/stores'),
            '@contexts': path.resolve(__dirname, './src/contexts'),
            '@config': path.resolve(__dirname, './src/config'),
            '@utils': path.resolve(__dirname, './src/utils'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-router': ['@tanstack/react-router'],
                    'vendor-xyflow': ['@xyflow/react', '@dagrejs/dagre'],
                    'vendor-base-ui': [
                        '@base-ui/react/button',
                        '@base-ui/react/checkbox',
                        '@base-ui/react/collapsible',
                        '@base-ui/react/dialog',
                        '@base-ui/react/menu',
                        '@base-ui/react/navigation-menu',
                        '@base-ui/react/popover',
                        '@base-ui/react/scroll-area',
                        '@base-ui/react/separator',
                        '@base-ui/react/tabs',
                        '@base-ui/react/tooltip',
                    ],
                    'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'zustand'],
                },
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
});
