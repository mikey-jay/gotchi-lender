# About This Project
I created this Node.js script to automatically loan my [Aavegotchis](https://aavegotchi.com) based on predetermined lending terms. This script is provided for educational purposes only for others to learn how to build their own automated lending scripts to suit their own needs. I do not recommend that anybody without sufficient knowledge and experience to review and understand the code behind this script to run it in production for themselves.

# How It Works
This script is designed to utilize a dedicated lending wallet. It will seek to lend out gotchis by the IDs specified in the `.env` file. It supports using a separate wallet as a lending operator wallet (highly recommended!). When a gotchi loan has ended, the script relists at the same terms specified in the config file. To stop lending a gotchi, the script must be stopped (CTRL-C). The script can then be restarted as needed.

## Installing the Script
I am assuming you already have [Node.js](https://nodejs.org/en/) installed. The script was developed and tested with v17.4.0. To install, run the following from the root directory of the project:
```
npm install
```

## Creating the Configuration File
The script needs a file named `.env` with configuration details specified. You can copy the example file (.env.example) provided as a starting template (ie: `cp .env.example .env`). See below for documentation on the various configuration parameters.
- LENDER_WALLET_ADDRESS - (require) the address of a wallet with lending operator permissions to the gotchis to be lent out
- LENDER_WALLET_KEY - (required) the private key of the lender wallet
- GOTCHI_IDS - (required) a comma separated list of gotchi ID's (ie: `12736,827,19873`)
- WHITELIST_ID - (optional)
- ORIGINAL_OWNER_WALLET_ADDRESS - (optional) address of the gotchi owner (can be same as lender wallet, but not recommended)
- THIRD_PARTY_WALLET_ADDRESS - (optional) required if THIRD_PARTY_SPLIT > 0
- UPFRONT_COST - (required) upfront cost, in GHST
- PERIOD_HRS - (required) loan duration, in hours
- BORROWER_SPLIT - (required) borrower's share of the earnings, in % * 100 terms (ie: 70 means 70 percent share)
- OWNER_SPLIT - (required) similar to borrower split, but for owner
- THIRD_PARTY_SPLIT - (required) similar to borrower split, but for owner, if greater than 0, must also specify a THIRD_PARTY_WALLET_ADDRESS
- POLYGON_RPC_HOST - (optional) use a different polygon RPC host (defaults to https://polygon-rpc.com)

## Running the Script
The script can be run with the command:
```
node app.js
```
### Additional Command Line Options
The follow command line arguments can be added to the end of `node app.js` to further customize the script's behavior:
- `node app.js --once` - run the script only once (don't run repeatedly)
- `node app.js --end` - just claim and end any listings where the term has completed (don't create new listings)
- `node app.js --cancel` - just cancel any existing listings (don't create new listings)
- `node app.js --offline` - run in offline mode for testing purposes - shows information but doesn't send transactions to the blockchain


# Production Use
Simply put, do not use this script in production if you do not know what you're doing. I strongly urge you to implement a more secure method than plaintext for giving a script private keys. In production, a secure secret storage solution (ie: Docker secrets) is highly advisable.

If you do use the script as is in production with a plaintext private key in the configuration file, it is highly recommended that you use dedicated lending hot wallet with only a few MATIC to cover gas costs. Do not keep valuable assets in this wallet. You'll need to set your lending hot wallet as a lending operator. This can be done using [Louper.dev](https://louper.dev/diamond/0x86935F11C86623deC8a25696E1C19a8659CbF95d?network=polygon) or some similar tool to call the `setLendingOperator`  method of the Aavegotchi LendingGetterAndSetterFacet smart contract.

## Using PM2
To run the application in the background, you can use [PM2](https://pm2.keymetrics.io/) to daemonize it. An `ecosystem.config.js` file has been provided with some suggested settings. You can install PM2 globally using `npm install pm2 -g`.

To start the script, use `pm2 start`. To stop the script, you can use `pm2 stop gotchi-lender` or use `pm2 delete gotchi-lender`. You can monitor the script with `pm2 logs` or, the prettier version: `pm2 monit`

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