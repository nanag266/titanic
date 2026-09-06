import crypto from "node:crypto";

export const makeOrderCode = () =>
  `TCV-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

export const makePaystackReference = () =>
  `TCV-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
