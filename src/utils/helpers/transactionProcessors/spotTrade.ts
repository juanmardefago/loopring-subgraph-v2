import {
  Swap,
  OrderbookTrade,
  Pair,
  Block,
  Token,
  User,
  Pool,
  Proxy
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  extractData,
  extractBigInt,
  extractInt,
  extractBigIntFromFloat,
  stringBytesToI32,
  stringBytesToBigInt
} from "../data";
import {
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  getProtocolAccount,
  getOrCreatePair,
  getAndUpdateTokenDailyData,
  getAndUpdateTokenWeeklyData,
  getAndUpdatePairDailyData,
  getAndUpdatePairWeeklyData,
  calculatePrice,
  compoundIdToSortableDecimal,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData
} from "../index";
import {
  BIGINT_ZERO,
  TRANSACTION_AMM_SWAP_TYPENAME,
  TRANSACTION_ORDERBOOK_TRADE_TYPENAME,
  USER_ACCOUNT_THRESHOLD,
  BIGINT_ONE
} from "../../constants";

// interface SettlementValues {
//   fillSA: BN;
//   fillBA: BN;
//   feeA: BN;
//   protocolFeeA: BN;
//
//   fillSB: BN;
//   fillBB: BN;
//   feeB: BN;
//   protocolFeeB: BN;
// }
//
// /**
//  * Processes spot trade requests.
//  */
// export class SpotTradeProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     data: Bitstream
//   ) {
//     let offset = 1;
//
//     // Storage IDs
//     const storageIdA = data.extractUint32(offset);
//     offset += 4;
//     const storageIdB = data.extractUint32(offset);
//     offset += 4;
//
//     // Accounts
//     const accountIdA = data.extractUint32(offset);
//     offset += 4;
//     const accountIdB = data.extractUint32(offset);
//     offset += 4;
//
//     // Tokens
//     const tokenA = data.extractUint16(offset);
//     offset += 2;
//     const tokenB = data.extractUint16(offset);
//     offset += 2;
//
//     // Fills
//     const fFillSA = data.extractUint24(offset);
//     offset += 3;
//     const fFillSB = data.extractUint24(offset);
//     offset += 3;
//
//     // Order data
//     const orderDataA = data.extractUint8(offset);
//     offset += 1;
//     const orderDataB = data.extractUint8(offset);
//     offset += 1;
//
//     // Further extraction of packed data
//     const limitMaskA = orderDataA & 0b10000000;
//     const feeBipsA = orderDataA & 0b00111111;
//     const fillAmountBorSA = limitMaskA > 0;
//
//     const limitMaskB = orderDataB & 0b10000000;
//     const feeBipsB = orderDataB & 0b00111111;
//     const fillAmountBorSB = limitMaskB > 0;
//
//     // Decode the float values
//     const fillSA = fromFloat(fFillSA, Constants.Float24Encoding);
//     const fillSB = fromFloat(fFillSB, Constants.Float24Encoding);
//
//     const s = this.calculateSettlementValues(
//       block.protocolFeeTakerBips,
//       block.protocolFeeMakerBips,
//       fillSA,
//       fillSB,
//       feeBipsA,
//       feeBipsB
//     );
//
//     // Update accountA
//     {
//       const accountA = state.getAccount(accountIdA);
//       accountA.getBalance(tokenA).balance.isub(s.fillSA);
//       accountA
//         .getBalance(tokenB)
//         .balance.iadd(s.fillBA)
//         .isub(s.feeA);
//
//       const tradeHistoryA = accountA.getBalance(tokenA).getStorage(storageIdA);
//       if (tradeHistoryA.storageID !== storageIdA) {
//         tradeHistoryA.data = new BN(0);
//       }
//       tradeHistoryA.storageID = storageIdA;
//       tradeHistoryA.data.iadd(fillAmountBorSA ? s.fillBA : s.fillSA);
//     }
//     // Update accountB
//     {
//       const accountB = state.getAccount(accountIdB);
//       accountB.getBalance(tokenB).balance.isub(s.fillSB);
//       accountB
//         .getBalance(tokenA)
//         .balance.iadd(s.fillBB)
//         .isub(s.feeB);
//
//       const tradeHistoryB = accountB.getBalance(tokenB).getStorage(storageIdB);
//       if (tradeHistoryB.storageID !== storageIdB) {
//         tradeHistoryB.data = new BN(0);
//       }
//       tradeHistoryB.storageID = storageIdB;
//       tradeHistoryB.data.iadd(fillAmountBorSB ? s.fillBB : s.fillSB);
//     }
//
//     // Update protocol fee
//     const protocol = state.getAccount(0);
//     protocol.getBalance(tokenA).balance.iadd(s.protocolFeeB);
//     protocol.getBalance(tokenB).balance.iadd(s.protocolFeeA);
//
//     // Update operator
//     const operator = state.getAccount(block.operatorAccountID);
//     operator
//       .getBalance(tokenA)
//       .balance.iadd(s.feeB)
//       .isub(s.protocolFeeB);
//     operator
//       .getBalance(tokenB)
//       .balance.iadd(s.feeA)
//       .isub(s.protocolFeeA);
//
//     // Create struct
//     const trade: SpotTrade = {
//       exchange: state.exchange,
//       requestIdx: state.processedRequests.length,
//       blockIdx: /*block.blockIdx*/ 0,
//
//       accountIdA,
//       orderIdA: storageIdA,
//       fillAmountBorSA,
//       tokenA,
//       fillSA: s.fillSA,
//       feeA: s.feeA,
//       protocolFeeA: s.protocolFeeA,
//
//       accountIdB,
//       orderIdB: storageIdB,
//       fillAmountBorSB,
//       tokenB,
//       fillSB: s.fillSB,
//       feeB: s.feeB,
//       protocolFeeB: s.protocolFeeB
//     };
//
//     return trade;
//   }
//
//   private static calculateSettlementValues(
//     protocolFeeTakerBips: number,
//     protocolFeeMakerBips: number,
//     fillSA: BN,
//     fillSB: BN,
//     feeBipsA: number,
//     feeBipsB: number
//   ) {
//     const fillBA = fillSB;
//     const fillBB = fillSA;
//     const [feeA, protocolFeeA] = this.calculateFees(
//       fillBA,
//       protocolFeeTakerBips,
//       feeBipsA
//     );
//
//     const [feeB, protocolFeeB] = this.calculateFees(
//       fillBB,
//       protocolFeeMakerBips,
//       feeBipsB
//     );
//
//     const settlementValues: SettlementValues = {
//       fillSA,
//       fillBA,
//       feeA,
//       protocolFeeA,
//
//       fillSB,
//       fillBB,
//       feeB,
//       protocolFeeB
//     };
//     return settlementValues;
//   }
//
//   private static calculateFees(
//     fillB: BN,
//     protocolFeeBips: number,
//     feeBips: number
//   ) {
//     const protocolFee = fillB.mul(new BN(protocolFeeBips)).div(new BN(100000));
//     const fee = fillB.mul(new BN(feeBips)).div(new BN(10000));
//     return [fee, protocolFee];
//   }
// }

export function processSpotTrade(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  let transaction = new OrderbookTrade(id);
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  // Storage IDs
  transaction.storageIdA = extractInt(data, offset, 4);
  offset += 4;
  transaction.storageIdB = extractInt(data, offset, 4);
  offset += 4;

  // Accounts
  transaction.accountIdA = extractInt(data, offset, 4);
  offset += 4;
  transaction.accountIdB = extractInt(data, offset, 4);
  offset += 4;

  // Tokens
  transaction.tokenIDA = extractInt(data, offset, 2);
  offset += 2;
  transaction.tokenIDB = extractInt(data, offset, 2);
  offset += 2;

  // Fills
  transaction.fFillSA = extractInt(data, offset, 3);
  transaction.fillSA = extractBigIntFromFloat(data, offset, 3, 5, 19, 10);
  offset += 3;
  transaction.fFillSB = extractInt(data, offset, 3);
  transaction.fillSB = extractBigIntFromFloat(data, offset, 3, 5, 19, 10);
  offset += 3;

  // Order data
  transaction.orderDataA = extractInt(data, offset, 1);
  offset += 1;
  transaction.orderDataB = extractInt(data, offset, 1);
  offset += 1;

  // There's no need to create the accounts, they don't need to be updated
  // and they can't be created first during a SpotTrade transaction.
  let accountAID = intToString(transaction.accountIdA);
  let accountBID = intToString(transaction.accountIdB);

  let accounts = new Array<String>();
  accounts.push(accountAID);
  accounts.push(accountBID);

  let tokenA = getToken(intToString(transaction.tokenIDA)) as Token;
  let tokenB = getToken(intToString(transaction.tokenIDB)) as Token;

  transaction.tokenA = tokenA.id;
  transaction.tokenB = tokenB.id;

  // Further extraction of packed data
  transaction.limitMaskA =
    BigInt.fromI32(transaction.orderDataA) & stringBytesToBigInt("80");
  transaction.feeBipsA =
    BigInt.fromI32(transaction.orderDataA) & stringBytesToBigInt("3F");
  transaction.fillAmountBorSA = transaction.limitMaskA > BIGINT_ZERO;

  transaction.limitMaskB =
    BigInt.fromI32(transaction.orderDataB) & stringBytesToBigInt("80");
  transaction.feeBipsB =
    BigInt.fromI32(transaction.orderDataB) & stringBytesToBigInt("3F");
  transaction.fillAmountBorSB = transaction.limitMaskB > BIGINT_ZERO;

  // settlement values
  transaction.fillBA = transaction.fillSB;
  transaction.fillBB = transaction.fillSA;

  transaction.feeA = calculateFee(transaction.fillBA, transaction.feeBipsA);
  transaction.protocolFeeA = calculateProtocolFee(
    transaction.fillBA,
    block.protocolFeeTakerBips
  );

  transaction.feeB = calculateFee(transaction.fillBB, transaction.feeBipsB);
  transaction.protocolFeeB = calculateProtocolFee(
    transaction.fillBB,
    block.protocolFeeMakerBips
  );

  let tokenBalances = new Array<String>();

  // Update token balances for account A
  let accountTokenBalanceAA = getOrCreateAccountTokenBalance(
    accountAID,
    tokenA.id
  );
  accountTokenBalanceAA.balance = accountTokenBalanceAA.balance.minus(
    transaction.fillSA
  );
  accountTokenBalanceAA.save();
  tokenBalances.push(accountTokenBalanceAA.id);

  let accountTokenBalanceAB = getOrCreateAccountTokenBalance(
    accountAID,
    tokenB.id
  );
  accountTokenBalanceAB.balance = accountTokenBalanceAB.balance
    .plus(transaction.fillBA)
    .minus(transaction.feeA);
  accountTokenBalanceAB.save();
  tokenBalances.push(accountTokenBalanceAB.id);

  // Update token balances for account B
  let accountTokenBalanceBB = getOrCreateAccountTokenBalance(
    accountBID,
    tokenB.id
  );
  accountTokenBalanceBB.balance = accountTokenBalanceBB.balance.minus(
    transaction.fillSB
  );
  accountTokenBalanceBB.save();
  tokenBalances.push(accountTokenBalanceBB.id);

  let accountTokenBalanceBA = getOrCreateAccountTokenBalance(
    accountBID,
    tokenA.id
  );
  accountTokenBalanceBA.balance = accountTokenBalanceBA.balance
    .plus(transaction.fillBB)
    .minus(transaction.feeB);
  accountTokenBalanceBA.save();
  tokenBalances.push(accountTokenBalanceBA.id);

  // Should also update operator account balance
  let operatorId = intToString(block.operatorAccountID);

  let operatorTokenBalanceA = getOrCreateAccountTokenBalance(
    operatorId,
    tokenA.id
  );
  operatorTokenBalanceA.balance = operatorTokenBalanceA.balance
    .plus(transaction.feeB)
    .minus(transaction.protocolFeeB);
  operatorTokenBalanceA.save();
  tokenBalances.push(operatorTokenBalanceA.id);

  let operatorTokenBalanceB = getOrCreateAccountTokenBalance(
    operatorId,
    tokenB.id
  );
  operatorTokenBalanceB.balance = operatorTokenBalanceB.balance
    .plus(transaction.feeA)
    .minus(transaction.protocolFeeA);
  operatorTokenBalanceB.save();
  tokenBalances.push(operatorTokenBalanceB.id);

  // update protocol balance
  let protocolAccount = getProtocolAccount(transaction.id);

  let protocolTokenBalanceA = getOrCreateAccountTokenBalance(
    protocolAccount.id,
    tokenA.id
  );
  protocolTokenBalanceA.balance = protocolTokenBalanceA.balance.plus(
    transaction.protocolFeeB
  );
  protocolTokenBalanceA.save();
  tokenBalances.push(protocolTokenBalanceA.id);

  let protocolTokenBalanceB = getOrCreateAccountTokenBalance(
    protocolAccount.id,
    tokenB.id
  );
  protocolTokenBalanceB.balance = protocolTokenBalanceB.balance.plus(
    transaction.protocolFeeA
  );
  protocolTokenBalanceB.save();
  tokenBalances.push(protocolTokenBalanceB.id);

  // Update pair info
  transaction.tokenAPrice = calculatePrice(
    tokenA as Token,
    transaction.fillSA,
    transaction.fillSB
  );
  transaction.tokenBPrice = calculatePrice(
    tokenB as Token,
    transaction.fillSB,
    transaction.fillSA
  );

  let pair = getOrCreatePair(transaction.tokenIDA, transaction.tokenIDB);

  let token0Price =
    transaction.tokenIDA < transaction.tokenIDB
      ? transaction.tokenAPrice
      : transaction.tokenBPrice;
  let token1Price =
    transaction.tokenIDA < transaction.tokenIDB
      ? transaction.tokenBPrice
      : transaction.tokenAPrice;
  let token0Amount =
    transaction.tokenIDA < transaction.tokenIDB
      ? transaction.fillSA
      : transaction.fillSB;
  let token1Amount =
    transaction.tokenIDA < transaction.tokenIDB
      ? transaction.fillSB
      : transaction.fillSA;

  pair.token0Price = token0Price;
  pair.token1Price = token1Price;
  pair.tradedVolumeToken0 = pair.tradedVolumeToken0.plus(token0Amount);
  pair.tradedVolumeToken1 = pair.tradedVolumeToken1.plus(token1Amount);

  tokenA.tradedVolume = tokenA.tradedVolume.plus(transaction.fillSA);
  tokenB.tradedVolume = tokenB.tradedVolume.plus(transaction.fillSB);

  transaction.pair = pair.id;

  let tokenADailyData = getAndUpdateTokenDailyData(
    tokenA as Token,
    block.timestamp
  );
  let tokenAWeeklyData = getAndUpdateTokenWeeklyData(
    tokenA as Token,
    block.timestamp
  );
  let tokenBDailyData = getAndUpdateTokenDailyData(
    tokenB as Token,
    block.timestamp
  );
  let tokenBWeeklyData = getAndUpdateTokenWeeklyData(
    tokenB as Token,
    block.timestamp
  );
  let pairDailyData = getAndUpdatePairDailyData(
    pair as Pair,
    token0Amount,
    token1Amount,
    block.timestamp
  );
  let pairWeeklyData = getAndUpdatePairWeeklyData(
    pair as Pair,
    token0Amount,
    token1Amount,
    block.timestamp
  );

  tokenADailyData.tradedVolume = tokenADailyData.tradedVolume.plus(
    transaction.fillSA
  );
  tokenAWeeklyData.tradedVolume = tokenAWeeklyData.tradedVolume.plus(
    transaction.fillSA
  );
  tokenBDailyData.tradedVolume = tokenBDailyData.tradedVolume.plus(
    transaction.fillSB
  );
  tokenBWeeklyData.tradedVolume = tokenBWeeklyData.tradedVolume.plus(
    transaction.fillSB
  );

  transaction.tokenBalances = tokenBalances;
  transaction.accounts = accounts;

  // Coerce the type of the Trade at the end, so we can reuse most of the code with no changes.
  // This could be a lot cleaner if we could use interfaces in AssemblyScript
  // After that we also need to update the breakdowns for every statistic we track
  // on the various core, daily and weekly entities.
  if (
    transaction.accountIdA < USER_ACCOUNT_THRESHOLD ||
    transaction.accountIdB < USER_ACCOUNT_THRESHOLD
  ) {
    proxy.swapCount = proxy.swapCount.plus(BIGINT_ONE);
    block.swapCount = block.swapCount.plus(BIGINT_ONE);

    let coercedTransaction = transaction as Swap;
    coercedTransaction.pool =
      transaction.accountIdA < transaction.accountIdB ? accountAID : accountBID;
    coercedTransaction.account =
      transaction.accountIdA < transaction.accountIdB ? accountBID : accountAID;
    coercedTransaction.typename = TRANSACTION_AMM_SWAP_TYPENAME;
    coercedTransaction.save();

    tokenADailyData.tradedVolumeSwap = tokenADailyData.tradedVolumeSwap.plus(
      transaction.fillSA
    );
    tokenAWeeklyData.tradedVolumeSwap = tokenAWeeklyData.tradedVolumeSwap.plus(
      transaction.fillSA
    );
    tokenBDailyData.tradedVolumeSwap = tokenBDailyData.tradedVolumeSwap.plus(
      transaction.fillSB
    );
    tokenBWeeklyData.tradedVolumeSwap = tokenBWeeklyData.tradedVolumeSwap.plus(
      transaction.fillSB
    );

    tokenA.tradedVolumeSwap = tokenA.tradedVolumeSwap.plus(transaction.fillSA);
    tokenB.tradedVolumeSwap = tokenB.tradedVolumeSwap.plus(transaction.fillSB);

    pairDailyData.tradedVolumeToken0Swap = pairDailyData.tradedVolumeToken0Swap.plus(
      token0Amount
    );
    pairDailyData.tradedVolumeToken1Swap = pairDailyData.tradedVolumeToken1Swap.plus(
      token1Amount
    );
    pairWeeklyData.tradedVolumeToken0Swap = pairWeeklyData.tradedVolumeToken0Swap.plus(
      token0Amount
    );
    pairWeeklyData.tradedVolumeToken1Swap = pairWeeklyData.tradedVolumeToken1Swap.plus(
      token1Amount
    );

    pair.tradedVolumeToken0Swap = pair.tradedVolumeToken0Swap.plus(
      token0Amount
    );
    pair.tradedVolumeToken1Swap = pair.tradedVolumeToken1Swap.plus(
      token1Amount
    );
  } else {
    proxy.orderbookTradeCount = proxy.orderbookTradeCount.plus(BIGINT_ONE);
    block.orderbookTradeCount = block.orderbookTradeCount.plus(BIGINT_ONE);

    transaction.accountA = accountAID;
    transaction.accountB = accountBID;
    transaction.typename = TRANSACTION_ORDERBOOK_TRADE_TYPENAME;
    transaction.save();

    tokenADailyData.tradedVolumeOrderbook = tokenADailyData.tradedVolumeOrderbook.plus(
      transaction.fillSA
    );
    tokenAWeeklyData.tradedVolumeOrderbook = tokenAWeeklyData.tradedVolumeOrderbook.plus(
      transaction.fillSA
    );
    tokenBDailyData.tradedVolumeOrderbook = tokenBDailyData.tradedVolumeOrderbook.plus(
      transaction.fillSB
    );
    tokenBWeeklyData.tradedVolumeOrderbook = tokenBWeeklyData.tradedVolumeOrderbook.plus(
      transaction.fillSB
    );

    tokenA.tradedVolumeOrderbook = tokenA.tradedVolumeOrderbook.plus(
      transaction.fillSA
    );
    tokenB.tradedVolumeOrderbook = tokenB.tradedVolumeOrderbook.plus(
      transaction.fillSB
    );

    pairDailyData.tradedVolumeToken0Orderbook = pairDailyData.tradedVolumeToken0Orderbook.plus(
      token0Amount
    );
    pairDailyData.tradedVolumeToken1Orderbook = pairDailyData.tradedVolumeToken1Orderbook.plus(
      token1Amount
    );
    pairWeeklyData.tradedVolumeToken0Orderbook = pairWeeklyData.tradedVolumeToken0Orderbook.plus(
      token0Amount
    );
    pairWeeklyData.tradedVolumeToken1Orderbook = pairWeeklyData.tradedVolumeToken1Orderbook.plus(
      token1Amount
    );

    pair.tradedVolumeToken0Orderbook = pair.tradedVolumeToken0Orderbook.plus(
      token0Amount
    );
    pair.tradedVolumeToken1Orderbook = pair.tradedVolumeToken1Orderbook.plus(
      token1Amount
    );
  }

  getAndUpdateAccountTokenBalanceDailyData(
    accountTokenBalanceAA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    accountTokenBalanceAA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    accountTokenBalanceAB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    accountTokenBalanceAB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    accountTokenBalanceBB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    accountTokenBalanceBB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    accountTokenBalanceBA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    accountTokenBalanceBA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    operatorTokenBalanceA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    operatorTokenBalanceA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    operatorTokenBalanceB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    operatorTokenBalanceB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    protocolTokenBalanceA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    protocolTokenBalanceA,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceDailyData(
    protocolTokenBalanceB,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    protocolTokenBalanceB,
    block.timestamp
  );

  pairDailyData.save();
  pairWeeklyData.save();
  tokenADailyData.save();
  tokenAWeeklyData.save();
  tokenBDailyData.save();
  tokenBWeeklyData.save();
  tokenA.save();
  tokenB.save();
  pair.save();
  protocolAccount.save();
}

function calculateFee(fillB: BigInt, feeBips: BigInt): BigInt {
  return fillB.times(feeBips).div(BigInt.fromI32(10000));
}

function calculateProtocolFee(fillB: BigInt, protocolFeeBips: i32): BigInt {
  return fillB
    .times(BigInt.fromI32(protocolFeeBips))
    .div(BigInt.fromI32(100000));
}
