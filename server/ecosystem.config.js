module.exports = {
  apps: [
    {
      name: 'eretz-ir',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Set this to your Vercel frontend URL, e.g. https://cityLand.vercel.app
        CLIENT_URL: 'https://your-frontend.vercel.app',
      },
    },
  ],
};
