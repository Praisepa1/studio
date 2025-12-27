import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Aliasing async_hooks to false for the client-side bundle
    // to prevent Module Not Found errors with OpenTelemetry/Genkit.
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'async_hooks': false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
      }
    }
    return config;
  },
};

export default nextConfig;
