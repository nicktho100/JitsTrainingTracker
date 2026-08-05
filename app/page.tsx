import {
  cloudflareAccessSignOutPath,
  requireCloudflareAccessUser,
} from "./cloudflare-auth";
import { TrainingDashboard } from "./training-dashboard";
import { getOverview } from "../db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireCloudflareAccessUser();
  const overview = await getOverview(user.id);

  return (
    <TrainingDashboard
      initialOverview={overview}
      userName={user.displayName}
      signOutPath={cloudflareAccessSignOutPath()}
    />
  );
}
