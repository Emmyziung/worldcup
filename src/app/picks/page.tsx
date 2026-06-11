import { Anton } from "next/font/google";

import {
  getBestTeamImage,
  getWorldCupPlayers,
  getWorldCupTeams,
} from "@/lib/worldcup-data";

import { PicksWizard } from "./picks-wizard";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default function PicksPage() {
  const teams = getWorldCupTeams().map((team) => ({
    id: team.id,
    name: team.name,
    badge: team.badge,
    logo: team.logo,
    image: getBestTeamImage(team),
  }));
  const players = getWorldCupPlayers().map((player) => ({
    id: player.id,
    name: player.name,
    image: player.image,
    teamId: player.teamId,
    teamName: player.teamName,
  }));

  return (
    <main className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-background text-foreground transition-colors duration-300 lg:overflow-hidden">
      <PicksWizard
        displayClassName={anton.className}
        players={players}
        teams={teams}
      />
    </main>
  );
}
