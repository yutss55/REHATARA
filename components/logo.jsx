import Image from "next/image";

export default function Logo({ size = 32 }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/images/logo-icon.png" alt="" width={size} height={size} priority />
      <span className="font-display font-bold tracking-wide text-white" style={{ fontSize: size * 0.6 }}>
        REHATARA
      </span>
    </div>
  );
}