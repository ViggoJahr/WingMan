"use client"

// Last-resort boundary: catches errors thrown in the root layout itself, so
// it has to render its own <html>/<body>. Kept dependency-free and inline-styled
// because the failure may well be in the styling or providers above it.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Training Hub failed to load</h1>
          <p style={{ color: "#a1a1a1", fontSize: "0.875rem", margin: "0 0 1rem" }}>
            {error.message || "Unknown error"}
          </p>
          <button
            onClick={reset}
            style={{
              background: "#fafafa",
              color: "#0a0a0a",
              border: 0,
              borderRadius: "0.375rem",
              padding: "0.5rem 0.875rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
