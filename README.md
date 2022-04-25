# About This Project
I created this Node.js script to automatically loan my [Aavegotchis](https://aavegotchi.com) based on predetermined lending terms. This script is provided for educational purposes only for others to learn how to build their own automated lending scripts to suit their own needs. I do not recommend that anybody without sufficient knowledge and experience to review and understand the code behind this script to run it in production for themselves.

# How It Works
This script is designed to utilize a dedicated lending wallet. It will seek to lend out **all** gotchis held by the wallet at the terms specified in the `.env` file. When a gotchi loan has ended, the script claims and ends the lending, and then relists at the terms set in the configuration file. To stop lending a gotchi, the script must be stopped and the gotchi transferred out of the lending wallet. The script can then be restarted as needed.

## Installing the Script
I am assuming you already have [Node.js](https://nodejs.org/en/) installed. The script was developed and tested with v17.4.0. To install, run the following from the root directory of the project:
```
npm install
```

## Creating the Configuration File
The script needs a file named `.env` with configuration details specified. You can copy the example file (.env.example) provided as a starting template (ie: `cp .env.example .env`). See below for documentation on the various configuration parameters.
- LENDER_WALLET_ADDRESS - (require) the address of the wallet holding the gotchis to be lent out
- LENDER_WALLET_KEY - (required) the private key of the lender wallet
- WHITELIST_ID - (optional)
- ORIGINAL_OWNER_WALLET_ADDRESS - (optional) address to send owner's share of earnings - same as lender's address if not specified
- THIRD_PARTY_WALLET_ADDRESS - (optional) required if THIRD_PARTY_SPLIT > 0
- UPFRONT_COST - (required) upfront cost, in GHST
- PERIOD_HRS - (required) loan duration, in hours
- BORROWER_SPLIT - (required) borrower's share of the earnings, in % * 100 terms (ie: 70 means 70 percent share)
- OWNER_SPLIT - (required) similar to borrower split, but for owner
- THIRD_PARTY_SPLIT - (required) similar to borrower split, but for owner, if greater than 0, must also specify a THIRD_PARTY_WALLET_ADDRESS

## Running the Script
The script can be run with the command:
```
npm start
```

# Production Use
Simply put, do not use this script in production if you do not know what you're doing. I strongly urge you to implement a more secure method than plaintext for giving a script private keys. In production, a secure secret storage solution (ie: Docker secrets) is highly advisable.

## Using PM2
To run the application in the background, you can use [PM2](https://pm2.keymetrics.io/) to daemonize it. An `ecosystem.config.js` file has been provided with some suggested settings. You can install PM2 globally using `npm install pm2 -g`.

To start the script, use `pm2 start`. To stop the script, you can use `pm2 stop gotchi-petter` or use `pm2 delete gotchi-petter`. You can monitor the script with `pm2 logs` or, the prettier version: `pm2 monit`

## Using Docker
A dockerfile is included if you want to run the script inside a Docker container. Here are some suggested commands:

Build the image (from project root):
```
docker build -t gotchi-lender .
```
Run the container
```
docker run -d --restart unless-stopped gotchi-lender
```
Please note that the configuration file is part of the docker image, so the image would need to be rebuilt anytime the lending terms or other configuration has changed.