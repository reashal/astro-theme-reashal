import { defineConfig } from 'astro/config';
import pagefindIntegration from './src/integrations/pagefind.mjs';

export default defineConfig({
    integrations: [pagefindIntegration()],
});
