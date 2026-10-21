/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: false,
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['@volti/contracts'],
};
export default nextConfig;
