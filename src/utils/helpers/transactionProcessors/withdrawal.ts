import {
  Withdrawal,
  WithdrawalNFT,
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
  extractBigIntFromFloat
} from "../data";
import {
  createIfNewAccount,
  getToken,
  intToString,
  getOrCreateAccountTokenBalance,
  compoundIdToSortableDecimal,
  getAndUpdateAccountTokenBalanceDailyData,
  getAndUpdateAccountTokenBalanceWeeklyData,
  getOrCreateAccountNFTSlot
} from "../index";
import {
  TRANSACTION_WITHDRAWAL_TYPENAME,
  BIGINT_ONE,
  BIGINT_ZERO,
  TRANSACTION_WITHDRAWAL_NFT_TYPENAME,
  isNFT
} from "../../constants";

// interface Withdrawal {
//   type?: number;
//   from?: string;
//   fromAccountID?: number;
//   tokenID?: number;
//   amount?: BN;
//   feeTokenID?: number;
//   fee?: BN;
//   to?: string;
//   onchainDataHash?: string;
//   minGas?: number;
//   validUntil?: number;
//   storageID?: number;
// }
//
// /**
//  * Processes withdrawal requests.
//  */
// export class WithdrawalProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const withdrawal = this.extractData(txData);
//
//     const account = state.getAccount(withdrawal.fromAccountID);
//     account.getBalance(withdrawal.tokenID).balance.isub(withdrawal.amount);
//     account.getBalance(withdrawal.feeTokenID).balance.isub(withdrawal.fee);
//
//     if (
//       withdrawal.type === 2 ||
//       (Constants.isNFT(withdrawal.tokenID) &&
//         account.getBalance(withdrawal.tokenID).balance.eq(new BN(0)))
//     ) {
//       account.getBalance(withdrawal.tokenID).weightAMM = new BN(0);
//     }
//
//     const operator = state.getAccount(block.operatorAccountID);
//     operator.getBalance(withdrawal.feeTokenID).balance.iadd(withdrawal.fee);
//
//     if (withdrawal.type === 0 || withdrawal.type === 1) {
//       // Nonce
//       const storage = account
//         .getBalance(withdrawal.tokenID)
//         .getStorage(withdrawal.storageID);
//       storage.storageID = withdrawal.storageID;
//       storage.data = new BN(1);
//     }
//
//     return withdrawal;
//   }
//
//   public static extractData(data: Bitstream) {
//     const withdrawal: Withdrawal = {};
//     let offset = 1;
//
//     withdrawal.type = data.extractUint8(offset);
//     offset += 1;
//     withdrawal.from = data.extractAddress(offset);
//     offset += 20;
//     withdrawal.fromAccountID = data.extractUint32(offset);
//     offset += 4;
//     withdrawal.tokenID = data.extractUint16(offset);
//     offset += 2;
//     withdrawal.amount = data.extractUint96(offset);
//     offset += 12;
//     withdrawal.feeTokenID = data.extractUint16(offset);
//     offset += 2;
//     withdrawal.fee = fromFloat(
//       data.extractUint16(offset),
//       Constants.Float16Encoding
//     );
//     offset += 2;
//     withdrawal.storageID = data.extractUint32(offset);
//     offset += 4;
//     withdrawal.onchainDataHash = data.extractData(offset, 20);
//     offset += 20;
//
//     return withdrawal;
//   }
// }

export function processWithdrawal(
  id: String,
  data: String,
  block: Block,
  proxy: Proxy
): void {
  proxy.transactionCount = proxy.transactionCount + BIGINT_ONE;
  block.transactionCount = block.transactionCount + BIGINT_ONE;

  let transaction = new Withdrawal(id);
  transaction.typename = TRANSACTION_WITHDRAWAL_TYPENAME;
  transaction.internalID = compoundIdToSortableDecimal(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1;

  transaction.type = extractInt(data, offset, 1);
  offset += 1;
  transaction.from = extractData(data, offset, 20);
  offset += 20;
  transaction.fromAccountID = extractInt(data, offset, 4);
  offset += 4;
  transaction.tokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.amount = extractBigInt(data, offset, 12);
  offset += 12;
  transaction.feeTokenID = extractInt(data, offset, 2);
  offset += 2;
  transaction.fee = extractBigIntFromFloat(data, offset, 2, 5, 11, 10);
  offset += 2;
  transaction.storageID = extractInt(data, offset, 4);
  offset += 4;
  transaction.onchainDataHash = extractData(data, offset, 20);
  offset += 20;

  let accountId = intToString(transaction.fromAccountID);

  let accounts = new Array<String>();
  accounts.push(accountId);

  let feeToken = getToken(intToString(transaction.feeTokenID)) as Token;

  createIfNewAccount(
    transaction.fromAccountID,
    transaction.id,
    transaction.from
  );

  let tokenBalances = new Array<String>();

  let operatorTokenFeeBalance = getOrCreateAccountTokenBalance(
    intToString(block.operatorAccountID),
    feeToken.id
  );
  operatorTokenFeeBalance.balance = operatorTokenFeeBalance.balance.plus(
    transaction.fee
  );
  tokenBalances.push(operatorTokenFeeBalance.id);

  operatorTokenFeeBalance.save();

  getAndUpdateAccountTokenBalanceDailyData(
    operatorTokenFeeBalance,
    block.timestamp
  );
  getAndUpdateAccountTokenBalanceWeeklyData(
    operatorTokenFeeBalance,
    block.timestamp
  );

  transaction.fromAccount = accountId;
  transaction.feeToken = feeToken.id;
  transaction.accounts = accounts;

  if (isNFT(transaction.tokenID)) {
    proxy.withdrawalNFTCount = proxy.withdrawalNFTCount + BIGINT_ONE;
    block.withdrawalNFTCount = block.withdrawalNFTCount + BIGINT_ONE;

    let nfts = new Array<String>();
    let slots = new Array<String>();

    let coercedTransaction = changetype<WithdrawalNFT>(transaction);
    // NFT withdrawal
    // Pay fee
    let accountTokenFeeBalance = getOrCreateAccountTokenBalance(
      accountId,
      feeToken.id
    );
    accountTokenFeeBalance.balance = accountTokenFeeBalance.balance.minus(
      transaction.fee
    );

    accountTokenFeeBalance.save();
    tokenBalances.push(accountTokenFeeBalance.id);

    getAndUpdateAccountTokenBalanceDailyData(
      accountTokenFeeBalance,
      block.timestamp
    );
    getAndUpdateAccountTokenBalanceWeeklyData(
      accountTokenFeeBalance,
      block.timestamp
    );

    coercedTransaction.tokenBalances = tokenBalances;

    let slot = getOrCreateAccountNFTSlot(
      coercedTransaction.fromAccountID,
      coercedTransaction.tokenID,
      coercedTransaction.id
    );

    slots.push(slot.id)
    nfts.push(slot.nft as String)

    slot.balance = slot.balance.minus(coercedTransaction.amount);
    if (coercedTransaction.type == 2 || slot.balance <= BIGINT_ZERO) {
      slot.nft = null;
    }
    slot.save();

    coercedTransaction.slots = slots;
    coercedTransaction.nfts = nfts;
    coercedTransaction.slot = slot.id;
    coercedTransaction.typename = TRANSACTION_WITHDRAWAL_NFT_TYPENAME;
    coercedTransaction.save();
  } else {
    proxy.withdrawalCount = proxy.withdrawalCount + BIGINT_ONE;
    block.withdrawalCount = block.withdrawalCount + BIGINT_ONE;
    // ERC20 withdrawal
    let token = getToken(intToString(transaction.tokenID)) as Token;
    // Make sure we don't overwrite balance entities
    if (token.id == feeToken.id) {
      let accountTokenBalance = getOrCreateAccountTokenBalance(
        accountId,
        token.id
      );
      accountTokenBalance.balance = accountTokenBalance.balance.minus(
        transaction.amount.minus(transaction.fee)
      );

      accountTokenBalance.save();
      tokenBalances.push(accountTokenBalance.id);

      getAndUpdateAccountTokenBalanceDailyData(
        accountTokenBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceWeeklyData(
        accountTokenBalance,
        block.timestamp
      );
    } else {
      let accountTokenBalance = getOrCreateAccountTokenBalance(
        accountId,
        token.id
      );
      accountTokenBalance.balance = accountTokenBalance.balance.minus(
        transaction.amount
      );
      accountTokenBalance.save();

      let accountTokenFeeBalance = getOrCreateAccountTokenBalance(
        accountId,
        feeToken.id
      );
      accountTokenFeeBalance.balance = accountTokenFeeBalance.balance.minus(
        transaction.fee
      );

      accountTokenFeeBalance.save();

      tokenBalances.push(accountTokenBalance.id);
      tokenBalances.push(accountTokenFeeBalance.id);

      getAndUpdateAccountTokenBalanceDailyData(
        accountTokenBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceWeeklyData(
        accountTokenBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceDailyData(
        accountTokenFeeBalance,
        block.timestamp
      );
      getAndUpdateAccountTokenBalanceWeeklyData(
        accountTokenFeeBalance,
        block.timestamp
      );
    }

    transaction.token = token.id;
    transaction.tokenBalances = tokenBalances;
    transaction.save();
  }
}
