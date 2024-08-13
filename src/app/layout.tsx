import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Earnest Dev",
    description: "Earnest AI Developer Assistant",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
            ></meta>
            <body className={inter.className}>
                <Header />
                {children}
            </body>
        </html>
    );
}
