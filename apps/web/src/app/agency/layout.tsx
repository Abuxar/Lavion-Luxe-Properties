import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agency",
  robots: { index: false, follow: false, nocache: true },
};

export default function AgencyLayout({ children }: LayoutProps<"/agency">) {
  return <div className="flex min-h-full flex-col">{children}</div>;
}
