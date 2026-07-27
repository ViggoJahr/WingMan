"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Field, FormAlert, SubmitButton } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { connectTugg } from "./actions"

export function TuggConnectForm({ isConnected }: { isConnected: boolean }) {
  const [state, formAction] = useActionState(connectTugg, idleState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <p className="text-sm text-muted-foreground">
        TUGG signs in with your normal account details. Your password is used once to obtain a
        session and is never stored - only the resulting tokens are kept, encrypted.
      </p>

      <Field name="email" label="TUGG email" state={state}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          // Deliberately not repopulated from state: nothing typed here is
          // echoed back by the action.
        />
      </Field>

      <Field name="password" label="TUGG password" state={state}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton className="w-fit" pendingLabel="Connecting...">
        {isConnected ? "Reconnect TUGG" : "Connect TUGG"}
      </SubmitButton>
    </form>
  )
}
