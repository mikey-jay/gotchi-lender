require('dotenv').config();

// Can be 'safeLow', 'standard', or 'fast' - see: https://gasstation-mainnet.matic.network/v2
const GAS_SPEED = 'standard'

// In offline mode, no transactions are sent to the blockchain
const OFFLINE_MODE = false

// Abort the operation if estimated gas exceeds this limit, specified in MATIC
const GAS_COST_LIMIT_MATIC = 0.05

const ABI = require('./abi.js')
const POLYGON_RPC_HOST = "https://polygon-rpc.com/"
const POLYGON_GAS_STATION_HOST = "https://gasstation-mainnet.matic.network/v2"
const AAVEGOTCHI_DIAMOND_ADDRESS = "0x86935F11C86623deC8a25696E1C19a8659CbF95d"

const LENDER_WALLET_ADDRESS = process.env.LENDER_WALLET_ADDRESS
const LENDER_WALLET_KEY = process.env.LENDER_WALLET_KEY
const WHITELIST_ID = parseInt(process.env.WHITELIST_ID) || 0
const ORIGINAL_OWNER_WALLET_ADDRESS = process.env.ORIGINAL_OWNER_WALLET_ADDRESS || LENDER_WALLET_ADDRESS
const THIRD_PARTY_WALLET_ADDRESS = process.env.THIRD_PARTY_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000"
const OWNER_SPLIT = parseFloat(process.env.OWNER_SPLIT) || 0
const BORROWER_SPLIT = parseFloat(process.env.BORROWER_SPLIT) || 0
const THIRD_PARTY_SPLIT = parseFloat(process.env.THIRD_PARTY_SPLIT) || 0
const UPFRONT_COST_GHST = process.env.UPFRONT_COST || "0"
const PERIOD_HRS = parseFloat(process.env.PERIOD_HRS)
const PERIOD_SECS = PERIOD_HRS * 60 * 60
const ALCHEMICA_FUD_ADDRESS = '0x403E967b044d4Be25170310157cB1A4Bf10bdD0f'
const ALCHEMICA_FOMO_ADDRESS = '0x44A6e0BE76e1D9620A7F76588e4509fE4fa8E8C8'
const ALCHEMICA_ALPHA_ADDRESS = '0x6a3E7C3c6EF65Ee26975b12293cA1AAD7e1dAeD2'
const ALCHEMICA_KEK_ADDRESS = '0x42E5E06EF5b90Fe15F853F59299Fc96259209c5C'
const REVENUE_TOKENS = [ALCHEMICA_FUD_ADDRESS, ALCHEMICA_FOMO_ADDRESS, ALCHEMICA_ALPHA_ADDRESS, ALCHEMICA_KEK_ADDRESS]

const MAX_LENDINGS = 2

const MILLISECONDS_BETWEEN_RETRIES = 1000 * 60 * 2 // 2 minutes

const getLogTimestamp = () => (new Date()).toISOString().substring(0,19)
const log = (message) => console.log(`${getLogTimestamp()}: ${message}`)

const Web3 = require('web3')
const web3 = new Web3(POLYGON_RPC_HOST)
const contract = new web3.eth.Contract(ABI, AAVEGOTCHI_DIAMOND_ADDRESS)

const STATUS_AGREED = web3.utils.asciiToHex("agreed")
const STATUS_LISTED = web3.utils.asciiToHex("listed")
const UPFRONT_COST_WEI = web3.utils.toWei(UPFRONT_COST_GHST)

const convertGweiToWei = (gwei) => gwei * (10 ** 9)
const convertWeiToMatic = (wei) => wei / (10 ** 18)

const getCurrentGasPrices = () => new Promise((resolve, reject) => {
  const https = require('https')
  https.get(POLYGON_GAS_STATION_HOST, (res) =>{
    const { statusCode } = res
    let rawData = ''
    res.on('data', (chunk) => rawData += chunk)
    res.on('end', () => {
      const gasData = JSON.parse(rawData)
      if (gasData['error'])
        reject(new Error(`Polygon gas station error: ${gasData.error.message}`))
      else if (typeof gasData[GAS_SPEED] == 'undefined')
        reject(new Error(`Polygon gas station response does not include any data for gas speed '${GAS_SPEED}' (rawData=${rawData})`))
      else
        resolve(gasData)
    })
  })
})

const createAddLendingTransaction = async (tokenId, initialCost = UPFRONT_COST_WEI, periodSeconds = PERIOD_SECS, revenueSplit = [OWNER_SPLIT, BORROWER_SPLIT, THIRD_PARTY_SPLIT], originalOwner = ORIGINAL_OWNER_WALLET_ADDRESS, thirdParty = THIRD_PARTY_WALLET_ADDRESS, whitelistId = WHITELIST_ID, revenueTokens = REVENUE_TOKENS) => ({
  from: LENDER_WALLET_ADDRESS,
  to: AAVEGOTCHI_DIAMOND_ADDRESS,
  data: contract.methods.addGotchiLending(tokenId, initialCost, periodSeconds, revenueSplit, originalOwner, thirdParty, whitelistId, revenueTokens).encodeABI()
})

const createEndLendingTransaction = async (tokenId) => ({
  from: LENDER_WALLET_ADDRESS,
  to: AAVEGOTCHI_DIAMOND_ADDRESS,
  data: contract.methods.claimAndEndGotchiLending(tokenId).encodeABI()
})

const setTransactionGasToMarket = async (tx) => Object.assign({
    gasLimit: await web3.eth.estimateGas(tx),
    maxPriorityFeePerGas: Math.ceil(convertGweiToWei((await getCurrentGasPrices())[GAS_SPEED].maxPriorityFee)) 
  }, tx)

const signTransaction = (unsignedTransaction) => web3.eth.accounts.signTransaction(unsignedTransaction, LENDER_WALLET_KEY)
const sendTransaction = (signedTransaction) => web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)

const notifySending = (payload) => log('Sending transaction...')
const notifySent = (payload) => log('Transaction sent.')
const notifyHash = (hash) => log('Transaction hash is ' + hash)
const notifyReceipt = (receipt) => log(`Obtained receipt for transaction (blockNumber=${receipt.blockNumber}, gasUsed=${receipt.gasUsed}, effectiveGasPrice=${receipt.effectiveGasPrice})`)
const notifyComplete = (receipt) => log('Transaction complete.')
const notifyError = (error) => Promise.reject(error)

const getGotchisByOwner = (ownerAddress = LENDER_WALLET_ADDRESS) => contract.methods.allAavegotchisOfOwner(ownerAddress).call()
const getIdsFromGotchis = (gotchis) => gotchis.map((g) => g.tokenId)

const getGotchiLendings = (ownerAddress = LENDER_WALLET_ADDRESS, status = STATUS_AGREED) => contract.methods.getOwnerGotchiLendings(ownerAddress, status, MAX_LENDINGS).call()
const getGotchiLendingListings = (ownerAddress = LENDER_WALLET_ADDRESS) => getGotchiLendings(LENDER_WALLET_ADDRESS, STATUS_LISTED)
const getGotchiIdsFromLendings = (lendings) => lendings.map((l) => l.erc721TokenId)

const isLoanPeriodExpired = (lending) => Math.floor(Date.now() / 1000) > parseInt(lending['timeAgreed']) + parseInt(lending['period'])

async function submitTransaction(tokenId, transactionFactory) {
  if (tokenId.length == 0) {
    log("tokenId is empty.")
    return
  }
  log(`Submitting ${transactionFactory.name} gotchi with id: ${tokenId}`)

  try {
    var transaction = await setTransactionGasToMarket(await transactionFactory(tokenId))
  } catch (err) {
    return Promise.reject(err)
  }
  log(`Creating ${transactionFactory.name} transaction: (tokenId=${tokenId}, from=${transaction.from}, to=${transaction.to}, gasLimit=${transaction.gasLimit}, maxPriorityFeePerGas=${transaction.maxPriorityFeePerGas})`)
  const estimatedGasCostMatic = convertWeiToMatic(transaction.gasLimit * (transaction.maxPriorityFeePerGas + convertGweiToWei((await getCurrentGasPrices()).estimatedBaseFee)))
  log("Estimated gas cost is ~" + estimatedGasCostMatic.toFixed(6) + " MATIC")
  if (estimatedGasCostMatic > GAS_COST_LIMIT_MATIC) {
    log('ABORTED: Estimated gas cost exceeds limit. GAS_COST_LIMIT_MATIC=' + GAS_COST_LIMIT_MATIC)
  } else {
    return sendTransaction(await signTransaction(transaction))
      .once('sending', notifySending)
      .once('sent', notifySent)
      .once('transactionHash', notifyHash)
      .once('receipt', notifyReceipt)
      .on('error', notifyError)
      .then(notifyComplete).catch(notifyError)
  }
}

const listGotchiLending = (tokenId) => submitTransaction(tokenId, createAddLendingTransaction).catch((err) => log(`Error creating listing for gotchi ID ${tokenId}: ${err.message}`))
const endGotchiLending = (tokenId) => submitTransaction(tokenId, createEndLendingTransaction).catch((err) => log(`Error ending lending for gotchi ID ${tokenId}: ${err.message}`))

const loop = async () => {
  log(`Getting gotchis owned by ${LENDER_WALLET_ADDRESS}`)
  const gotchiIds = await getGotchisByOwner(LENDER_WALLET_ADDRESS).then(getIdsFromGotchis)
  log(`gotchiIds=${gotchiIds}`)
  const lendings = await getGotchiLendings(LENDER_WALLET_ADDRESS)
  const idsOfLoanedGotchis = getGotchiIdsFromLendings(lendings)
  log(`idsOfLoanedGotchis=${idsOfLoanedGotchis}`)
  const idsOfListedGotchis = await getGotchiLendingListings(LENDER_WALLET_ADDRESS).then(getGotchiIdsFromLendings)
  log(`idsOfListedGotchis=${idsOfListedGotchis}`)
  const idsOfGotchisWithLoanPeriodExpired = getGotchiIdsFromLendings(lendings.filter(isLoanPeriodExpired))
  log(`idsOfGotchisWithLoanPeriodExpired=${idsOfGotchisWithLoanPeriodExpired}`)
  lendings.forEach((l)=>log(`tokenId=${l['erc721TokenId']}, timeAgreed=${l['timeAgreed']}, period=${l['period']}, expireTime=${parseInt(l['timeAgreed']) + parseInt(l['period'])}, now=${Math.floor(Date.now() / 1000)}, expired=${isLoanPeriodExpired(l)}`))
  const idsOfUnlistedGotchis = gotchiIds.filter((id) => !(idsOfListedGotchis.includes(id)) && !(idsOfLoanedGotchis.includes(id)))
  log(`idsOfUnlistedGotchis=${idsOfUnlistedGotchis}`)
  
  if (OFFLINE_MODE) {
    log('Offline mode is enabled, no transactions will be sent.')
    return
  }

  // list the unlisted gotchis
  idsOfUnlistedGotchis.forEach(listGotchiLending)
  // claim and end the expired gotchis
  idsOfGotchisWithLoanPeriodExpired.forEach(endGotchiLending)

}
loop().then(() => setInterval(loop, MILLISECONDS_BETWEEN_RETRIES))