# About This Project
I created this Node.js script to automatically rent my [Aavegotchis](https://aavegotchi.com) based on  predetermined lending terms.

# Production Use
If you're going to run this script in a full-time production setting, there are a few more things you may want to consider.

## Using PM2
To run the application in the background, you can use [PM2](https://pm2.keymetrics.io/) to daemonize it. An `ecosystem.config.js` file has been provided with some suggested settings. You can install PM2 globally using `npm install pm2 -g`.

To start the script, use `pm2 start`. To stop the script, you can use `pm2 stop gotchi-petter` or use `pm2 delete gotchi-petter`. You can monitor the script with `pm2 logs` or, the prettier version: `pm2 monit`

## Using Docker
A dockerfile is included if you want to run the script inside a Docker container. Here are some suggested commands:

Build the image (from project root):
```
docker build -t gotchi-petter .
```
Run the container
```
docker run -d --restart unless-stopped gotchi-petter
```