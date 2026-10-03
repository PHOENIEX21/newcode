import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Morning Meeting Attendance",
  description: "Fast, accountable attendance for morning meetings"
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
