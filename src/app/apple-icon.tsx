import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 80% 10%, #8a5238, #0C211A 60%)" }}>
        <svg width="180" height="180" viewBox="0 0 100 100" fill="none" stroke="#F6F1EA" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 50 50 26l28 24" /><path d="M30 46v26h40V46" /><path d="M44 72V56h12v16" />
        </svg>
      </div>
    ),
    size,
  );
}
