import {
  DataNFT,
  Block,
  Token,
  User,
  Pool
} from "../../../../generated/schema";
import { BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import { extractData, extractBigInt, extractInt } from "../data";
import {
  createIfNewAccount,
  getToken,
  intToString,
  getOrCreateAccountTokenBalance
} from "../index";

// interface NftData {
//   type?: number;
//   accountID?: number;
//   tokenID?: number;
//   minter?: string;
//   nftID?: string;
//   nftType?: number;
//   tokenAddress?: string;
//   creatorFeeBips?: number;
// }
//
// /**
//  * Processes nft data requests.
//  */
// export class NftDataProcessor {
//   public static process(
//     state: ExchangeState,
//     block: BlockContext,
//     txData: Bitstream
//   ) {
//     const nftData = this.extractData(txData);
//     return nftData;
//   }
//
//   public static extractData(data: Bitstream, offset: number = 1) {
//     const nftData: NftData = {};
//
//     nftData.type = data.extractUint8(offset);
//     offset += 1;
//
//     nftData.accountID = data.extractUint32(offset);
//     offset += 4;
//     nftData.tokenID = data.extractUint16(offset);
//     offset += 2;
//     nftData.nftID = "0x" + data.extractBytes32(offset).toString("hex");
//     offset += 32;
//     nftData.creatorFeeBips = data.extractUint8(offset);
//     offset += 1;
//     nftData.nftType = data.extractUint8(offset);
//     offset += 1;
//     if (nftData.type === 0) {
//       nftData.minter = data.extractAddress(offset);
//       offset += 20;
//     } else {
//       nftData.tokenAddress = data.extractAddress(offset);
//       offset += 20;
//     }
//
//     return nftData;
//   }
// }

export function processNFTData(id: String, data: String, block: Block): void {
  let transaction = new DataNFT(id);
  transaction.data = data;
  transaction.block = block.id;

  let offset = 1; // First byte is tx type

  // TODO: Implement nft data decoding, using the example code above.
}
