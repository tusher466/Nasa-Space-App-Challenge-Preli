import type { Metadata } from 'next';
export const metadata: Metadata = {title:'EarthLens — Earth Intelligence', description:'Real NASA data, refreshable environmental trends, and transparent statistical evidence.', icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
