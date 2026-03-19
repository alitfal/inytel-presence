module.exports = {
  apps: [{
    name: 'inytel-api',
    script: 'server.js',
    cwd: '/Users/benderserver/inytel-presence/backend',
    wait_ready: true,
    listen_timeout: 10000,
    restart_delay: 5000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
      DB_HOST: '127.0.0.1',
      DB_PORT: '3307',
      DB_USER: 'root',
      DB_PASS: 'root_password',
      DB_NAME: 'inytel_db'
    }
  }]
}
