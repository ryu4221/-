import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'支援ファイル｜利用者・支援書類管理',description:'就労継続支援B型事業所の利用者情報と支援書類を保管',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
