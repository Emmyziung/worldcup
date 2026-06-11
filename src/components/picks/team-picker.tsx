"use client";

import { Check, Search, Shield, X } from "lucide-react";
import { useMemo, useState } from "react";

import { ImageWithLoader } from "@/components/picks/image-with-loader";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type TeamPickerOption = {
  id: string;
  name: string;
  badge: string;
  logo: string;
};

type TeamPickerProps = {
  disabledTeamIds?: string[];
  gridClassName?: string;
  label?: string;
  onChange: (teamId: string) => void;
  scrollClassName?: string;
  teams: TeamPickerOption[];
  value?: string;
};

export function TeamPicker({
  disabledTeamIds = [],
  gridClassName,
  label = "Team",
  onChange,
  scrollClassName,
  teams,
  value,
}: TeamPickerProps) {
  const [query, setQuery] = useState("");
  const selectedTeam = teams.find((team) => team.id === value);
  const disabledTeamIdSet = useMemo(
    () => new Set(disabledTeamIds),
    [disabledTeamIds]
  );
  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return teams;
    }

    return teams.filter((team) =>
      team.name.toLowerCase().includes(normalizedQuery)
    );
  }, [query, teams]);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          {selectedTeam ? (
            <p className="mt-1 text-sm font-semibold text-mauve">
              Selected: {selectedTeam.name}
            </p>
          ) : null}
        </div>
        <p className="text-xs font-bold text-muted-foreground">
          {filteredTeams.length} teams
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search teams"
          className="h-11 rounded-xl bg-background/70 pl-9 pr-9 font-semibold"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear team search"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <ScrollArea
        className={cn(
          "h-[22rem] w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background/35 p-2",
          scrollClassName
        )}
      >
        {filteredTeams.length ? (
          <div className={cn("grid min-w-0 gap-2", gridClassName)}>
            {filteredTeams.map((team) => {
              const isSelected = value === team.id;
              const isDisabled =
                !isSelected && disabledTeamIdSet.has(team.id);
              const image = team.badge || team.logo;

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onChange(team.id)}
                  disabled={isDisabled}
                  className={cn(
                    "group flex min-h-20 w-full min-w-0 items-center gap-3 rounded-lg border bg-card/55 p-3 text-left transition hover:border-mauve/70 hover:bg-mauve/10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:bg-card/55",
                    isSelected
                      ? "border-mauve bg-mauve/15 text-foreground"
                      : "border-border"
                  )}
                >
                  <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                    {image ? (
                      <ImageWithLoader
                        src={image}
                        alt={`${team.name} badge`}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <Shield className="size-5 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-foreground">
                      {team.name}
                    </span>
                    {isDisabled ? (
                      <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                        Already picked
                      </span>
                    ) : null}
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
            No teams found.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
