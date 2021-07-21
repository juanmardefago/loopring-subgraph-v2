import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export function intToString(value: i32): String {
  return BigInt.fromI32(value).toString();
}

export function compoundId(a: String, b: String): String {
  return a.concat("-").concat(b);
}

export function compoundIdToSortableDecimal(
  compoundId: String,
  secondPartPadding: i32 = 5
): BigDecimal {
  let splittedString = compoundId.split("-");
  return BigDecimal.fromString(
    splittedString[0]
      .concat(".")
      .concat(splittedString[1].padStart(secondPartPadding, "0"))
  );
}
