import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell page">
      <p className="eyebrow">404</p>
      <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginTop: "0.5rem" }}>
        지도에 없는 자리입니다
      </h1>
      <p className="hero__lead" style={{ marginTop: "0.75rem" }}>
        주소가 바뀌었거나 아직 만들지 않은 화면입니다. 전체 지도에서 다시 찾아 보세요.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link className="button" href="/">
          전체 지도로 가기
        </Link>
      </p>
    </div>
  );
}
