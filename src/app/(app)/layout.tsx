import { TimeZoneSync } from "@/components/TimeZoneSync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <TimeZoneSync />
    </>
  );
}
