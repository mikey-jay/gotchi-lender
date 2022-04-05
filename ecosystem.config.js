// configuration for running in production with PM2
// see: https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
  apps : [{
    name   : "gotchi-lender",
    script : "./app.js",
    restart_delay : 900000 // wait 15 minutes to restart if process exits - to prevent network spamming
  }]
}