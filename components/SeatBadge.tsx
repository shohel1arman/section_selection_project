type Props = {
  taken: number;
  capacity: number;
};

export default function SeatBadge({ taken, capacity }: Props) {
  const remaining = capacity - taken;
  const isFull = remaining <= 0;
  const isLow = !isFull && remaining <= Math.max(2, Math.floor(capacity * 0.1));

  let cls = "bg-emerald-100 text-emerald-800";
  if (isFull) cls = "bg-red-100 text-red-800";
  else if (isLow) cls = "bg-amber-100 text-amber-800";

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${cls}`}
    >
      {isFull ? "FULL" : `${taken}/${capacity}`}
    </span>
  );
}
