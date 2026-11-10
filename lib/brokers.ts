export const IB_BROKERS = {
  exness: { name: "Exness", link: "https://one.exnessonelink.com/a/vkmgfauvyh" },
  valetax: { name: "Valetax", link: "https://ma.valetax.com/p/6542265" },
} as const;

export type IbBroker = keyof typeof IB_BROKERS;
export const IB_BROKER_KEYS = Object.keys(IB_BROKERS) as IbBroker[];

export function isIbBroker(v: unknown): v is IbBroker {
  return typeof v === "string" && v in IB_BROKERS;
}

export function brokerName(v: string | null | undefined): string {
  return isIbBroker(v) ? IB_BROKERS[v].name : "Exness";
}
