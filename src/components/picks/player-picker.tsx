"use client";

import { Check, Search, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ImageWithLoader } from "@/components/picks/image-with-loader";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PlayerPickerTeam = {
  id: string;
  name: string;
};

export type PlayerPickerOption = {
  id: string;
  name: string;
  image: string | null;
  teamId: string;
  teamName: string;
};

type PlayerPickerProps = {
  label?: string;
  onChange: (playerId: string) => void;
  players: PlayerPickerOption[];
  teams: PlayerPickerTeam[];
  value?: string;
};

const ALL_TEAMS = "all";

export function PlayerPicker({
  label = "Player",
  onChange,
  players,
  teams,
  value,
}: PlayerPickerProps) {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState(ALL_TEAMS);
  const selectedPlayer = players.find((player) => player.id === value);
  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return players.filter((player) => {
      const matchesTeam =
        teamFilter === ALL_TEAMS || player.teamId === teamFilter;
      const matchesQuery =
        !normalizedQuery ||
        player.name.toLowerCase().includes(normalizedQuery) ||
        player.teamName.toLowerCase().includes(normalizedQuery);

      return matchesTeam && matchesQuery;
    });
  }, [players, query, teamFilter]);

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {selectedPlayer ? (
            <p className="mt-1 text-sm font-semibold text-mauve">
              Selected: {selectedPlayer.name}
            </p>
          ) : null}
        </div>
        <p className="text-xs font-bold text-muted-foreground">
          {filteredPlayers.length} players
        </p>
      </div>

      <div className="grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search players"
            className="h-11 rounded-xl bg-background/70 pl-9 pr-9 font-semibold"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear player search"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="h-11 w-full rounded-xl bg-background/70 px-3 font-semibold">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            className="max-h-80 w-(--radix-select-trigger-width)"
          >
            <SelectItem value={ALL_TEAMS}>All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[22rem] w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background/35 p-2">
        {filteredPlayers.length ? (
          <div className="grid min-w-0 gap-2">
            {filteredPlayers.map((player) => {
              const isSelected = value === player.id;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onChange(player.id)}
                  className={cn(
                    "group flex min-h-20 w-full min-w-0 items-center gap-3 rounded-lg border bg-card/55 p-3 text-left transition hover:border-mauve/70 hover:bg-mauve/10",
                    isSelected
                      ? "border-mauve bg-mauve/15 text-foreground"
                      : "border-border"
                  )}
                >
                  <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                    {player.image ? (
                      <ImageWithLoader
                        src={player.image}
                        alt={player.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="size-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-foreground">
                      {player.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                      {player.teamName}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition",
                      isSelected
                        ? "border-mauve bg-mauve text-mauve-foreground"
                        : "border-border text-transparent group-hover:text-muted-foreground"
                    )}
                  >
                    <Check className="size-4" />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm font-semibold text-muted-foreground">
            No players found.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
