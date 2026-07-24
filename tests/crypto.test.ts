import { describe, expect, it } from "vitest"
import { encrypt, decrypt } from "@/lib/crypto"

describe("crypto", () => {
  it("round-trips a value", () => {
    const plaintext = "some-refresh-token-value"
    const encrypted = encrypt(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })
})
