export type NameLengthCount = {
  label: string;
  /** Email-confirmed names that are not reserved. */
  waitlist: number;
  /** Paid reservations, whether or not the email is confirmed. */
  reserved: number;
};

export type PressStats = {
  names: number;
  reserved: number;
  protectedNames: number;
  /** Every row on /protected, the same count as that page's "names" figure. */
  protectedListCount: number;
  emailVerified: number;
  betaRegistered: number;
  betaForSale: number;
  asOf: string;
  namesLive: boolean;
  emailVerifiedLive: boolean;
  betaLive: boolean;
  /** Null when the live length query did not return. */
  nameLengths: NameLengthCount[] | null;
};
