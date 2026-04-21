/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // better-sqlite3 e sharp são módulos nativos; pdfkit tem arquivos estáticos
    // (.afm para fontes Helvetica/Times/Courier) que se perdem se forem bundlados.
    serverComponentsExternalPackages: ['better-sqlite3', 'sharp', 'pdfkit'],
    // O tracer do Next.js só copia arquivos JS detectados. Os AFMs do pdfkit
    // são lidos em runtime via fs.readFileSync — não são detectados. Forçamos inclusão.
    outputFileTracingIncludes: {
      '/api/contratos/**/*': ['./node_modules/pdfkit/js/data/**/*'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'buscaracing.com' },
    ],
  },
};

export default nextConfig;
