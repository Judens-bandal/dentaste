module.exports = {
  apps: [
    {
      name: 'dentaste-be',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
        STAGE: 'prod',
      },
    },
  ],
};
