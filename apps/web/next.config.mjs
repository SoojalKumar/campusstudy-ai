/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@campusstudy/ui", "@campusstudy/types"]
};

export default nextConfig;

