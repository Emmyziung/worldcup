import worldCupData from "@/data/worldcup.json";

export type WorldCupRawPlayer = {
  name: string;
  image: string | null;
};

export type WorldCupRawTeam = {
  name: string;
  badge: string;
  logo: string;
  banner: string;
  fanarts: string[];
  players: WorldCupRawPlayer[];
};

export type WorldCupRawData = {
  teams: WorldCupRawTeam[];
};

export type WorldCupPlayer = {
  id: string;
  name: string;
  image: string | null;
  teamId: string;
  teamName: string;
};

export type WorldCupTeam = {
  id: string;
  name: string;
  badge: string;
  logo: string;
  banner: string;
  fanarts: string[];
  players: WorldCupPlayer[];
};

const rawWorldCupData = worldCupData as WorldCupRawData;

let cachedTeams: WorldCupTeam[] | null = null;
let cachedPlayers: WorldCupPlayer[] | null = null;

export function decodeName(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function slugifyId(value: string) {
  const slug = decodeName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "item";
}

export function getBestTeamImage(team: Pick<WorldCupTeam, "fanarts" | "banner" | "badge" | "logo">) {
  return team.fanarts[0] || team.banner || team.badge || team.logo;
}

export function getWorldCupTeams() {
  if (cachedTeams) {
    return cachedTeams;
  }

  const playerIdCounts = new Map<string, number>();
  const usedPlayerIds = new Set<string>();

  function getUniquePlayerId(teamName: string, playerName: string) {
    const baseId = slugifyId(`${teamName}-${playerName}`);
    let count = (playerIdCounts.get(baseId) ?? 0) + 1;
    let playerId = count === 1 ? baseId : `${baseId}-${count}`;

    while (usedPlayerIds.has(playerId)) {
      count += 1;
      playerId = `${baseId}-${count}`;
    }

    playerIdCounts.set(baseId, count);
    usedPlayerIds.add(playerId);

    return playerId;
  }

  cachedTeams = rawWorldCupData.teams.map((team) => {
    const teamName = decodeName(team.name);
    const teamId = slugifyId(teamName);

    return {
      id: teamId,
      name: teamName,
      badge: team.badge,
      logo: team.logo,
      banner: team.banner,
      fanarts: team.fanarts,
      players: team.players.map((player) => {
        const playerName = decodeName(player.name);

        return {
          id: getUniquePlayerId(teamName, playerName),
          name: playerName,
          image: player.image,
          teamId,
          teamName,
        };
      }),
    };
  });

  return cachedTeams;
}

export function getWorldCupPlayers() {
  if (cachedPlayers) {
    return cachedPlayers;
  }

  cachedPlayers = getWorldCupTeams().flatMap((team) => team.players);

  return cachedPlayers;
}

export function getTeamById(id: string) {
  return getWorldCupTeams().find((team) => team.id === id);
}

export function getPlayerById(id: string) {
  return getWorldCupPlayers().find((player) => player.id === id);
}
