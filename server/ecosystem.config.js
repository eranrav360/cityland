module.exports = {
  apps: [
    {
      name: 'eretz-ir',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3333,
        CLIENT_URL: 'https://cityland.vercel.app',
      },
    },
  ],
};
