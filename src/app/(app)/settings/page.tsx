import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ThemeToggle"
import { createClient } from "@/lib/supabase/server"
import { sourceLabel } from "@/lib/labels"
import { ProfileForm } from "./ProfileForm"
import { TuggConnectForm } from "./TuggConnectForm"
import { PageHeader, PageShell } from "@/components/PageShell"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams
  const supabase = await createClient()

  const [{ data: accounts }, { data: profile }] = await Promise.all([
    supabase.from("integration_accounts").select("source, status, last_synced_at"),
    supabase.from("users").select("height_cm, birth_date, gender").maybeSingle(),
  ])

  const googleHealth = accounts?.find((a) => a.source === "google_health")
  const tugg = accounts?.find((a) => a.source === "tugg")

  return (
    <PageShell>
      <PageHeader title="Integrations" description="Connected data sources and sync status." />

      {connected && (
        <p className="rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
          Connected {sourceLabel(connected)}.
        </p>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected sources</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts && accounts.length > 0 ? (
            <ul className="flex flex-col divide-y text-sm">
              {accounts.map((a) => (
                <li key={a.source} className="flex items-center justify-between py-2">
                  <span className="font-medium">{sourceLabel(a.source)}</span>
                  <span className="text-muted-foreground">
                    {a.status}
                    {a.last_synced_at &&
                      ` - last synced ${new Date(a.last_synced_at).toLocaleString()}`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No sources connected yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Health</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Steps, sleep, weight, resting heart rate, and workouts synced from Google Health
            (Fitbit).
          </p>
          <a
            href="/api/integrations/google_health/authorize"
            className={cn(buttonVariants({ size: "sm" }), "w-fit")}
          >
            {googleHealth ? "Reconnect" : "Connect"} Google Health
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>TUGG</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {tugg?.status === "error" && (
            <p className="rounded-md border border-status-critical/50 bg-status-critical/10 p-3 text-sm text-status-critical">
              TUGG&apos;s session has expired. Its refresh tokens rotate on every use and are shared
              with the TUGG app itself, so signing in there can invalidate this one. Reconnect below.
            </p>
          )}
          <TuggConnectForm isConnected={tugg != null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={{
              height_cm: profile?.height_cm ?? null,
              birth_date: profile?.birth_date ?? null,
              gender: profile?.gender ?? null,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
    </PageShell>
  )
}
