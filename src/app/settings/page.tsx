import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

const SOURCE_LABEL: Record<string, string> = {
  tugg: "TUGG",
  google_health: "Google Health",
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams
  const supabase = await createClient()

  const { data: accounts } = await supabase
    .from("integration_accounts")
    .select("source, status, last_synced_at")

  const googleHealth = accounts?.find((a) => a.source === "google_health")

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-muted-foreground">Connected data sources and sync status.</p>
          {connected && (
            <p className="mt-2 rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
              Connected {SOURCE_LABEL[connected] ?? connected}.
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connected sources</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts && accounts.length > 0 ? (
              <ul className="flex flex-col divide-y text-sm">
                {accounts.map((a) => (
                  <li key={a.source} className="flex items-center justify-between py-2">
                    <span className="font-medium">{SOURCE_LABEL[a.source] ?? a.source}</span>
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
      </div>
    </div>
  )
}
