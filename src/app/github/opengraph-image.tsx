import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Bantera on GitHub. One product. Three codebases: Frontend, Backend, iOS and Android.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function GitHubImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/github-lockup-white.svg"));
  const logoUrl = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(120deg, #101113, #24202c)", padding: "54px 66px", color: "#f5f3ee", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>Bantera<span style={{ color: "#ffb886" }}>.</span></div>
        {/* Official GitHub lockup, embedded locally so image generation needs no network. */}
        <img src={logoUrl} width={115} height={32} alt="GitHub" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 56, fontSize: 76, letterSpacing: -3, lineHeight: 1.06, fontWeight: 700 }}>
        <span>One product.</span><span style={{ color: "#ffb886" }}>Three codebases.</span>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
        {[{ title: "01  Frontend", stack: "Next.js · React · TypeScript", color: "#ffab76" }, { title: "02  Backend", stack: "C# / .NET · PostgreSQL", color: "#baabff" }, { title: "03  iOS & Android", stack: "Flutter · Dart · CallKit", color: "#80d7c6" }].map((item) => (
          <div key={item.title} style={{ display: "flex", flexDirection: "column", flex: 1, border: "1px solid #ffffff24", borderRadius: 12, padding: "20px 22px", background: "#ffffff05" }}>
            <span style={{ fontSize: 24, color: item.color }}>{item.title}</span>
            <span style={{ fontSize: 16, color: "#b3b0bd", marginTop: 12 }}>{item.stack}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", fontSize: 17, color: "#aaa7b5" }}><span>Explore the code behind Bantera</span><span>bantera.app/github</span></div>
    </div>,
    size,
  );
}
