import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review queue",
  // The queue must never be indexed — it is internal and it can publish.
  robots: { index: false, follow: false, nocache: true },
};

// No `dynamic`/`revalidate` segment config here — Cache Components rejects
// both. Request-time rendering comes from `await connection()` inside
// admin-auth, which runs before any auth decision on every admin route.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-col">{children}</div>;
}
