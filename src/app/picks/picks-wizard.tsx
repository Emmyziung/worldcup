"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CirclePlay,
  Download,
  Eye,
  Home,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import JSZip from "jszip";
import { toPng } from "html-to-image";
import {
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ImageWithLoader } from "@/components/picks/image-with-loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PlayerPicker } from "@/components/picks/player-picker";
import { Progress } from "@/components/ui/progress";
import { TeamPicker } from "@/components/picks/team-picker";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";

type TeamOption = {
  id: string;
  name: string;
  badge: string;
  logo: string;
  image: string;
};

type PlayerOption = {
  id: string;
  name: string;
  image: string | null;
  teamId: string;
  teamName: string;
};

type PicksState = {
  supportingTeamId?: string;
  favoritePlayerId?: string;
  goldenBootWinnerId?: string;
  predictedWinnerId?: string;
  predictedRunnerUpId?: string;
  predictedThirdPlaceId?: string;
  hatewatchTeamId?: string | null;
  hatewatchPlayerId?: string | null;
  hatewatchPlayerTrollName?: string;
};

type StoredPicksState = {
  picks: PicksState;
  stepIndex: number;
};

type StepId =
  | "supporting-team"
  | "favorite-player"
  | "golden-boot"
  | "predictions"
  | "hatewatch-team"
  | "hatewatch-player"
  | "review";

type Step = {
  id: StepId;
  eyebrow: string;
  title: string;
  description: string;
  optional?: boolean;
};

type PicksWizardProps = {
  displayClassName: string;
  players: PlayerOption[];
  teams: TeamOption[];
};

type PickCard = {
  category: string;
  filePrefix?: string;
  image?: string | null;
  imageOnly?: boolean;
  meta?: string;
  podium?: Array<{
    image?: string | null;
    label: string;
    title: string;
  }>;
  title: string;
};

type DownloadNotice = {
  message: string;
  status: "downloaded" | "downloading" | "error";
};

const STORAGE_KEY = "worldcup:picks:v2";
const EXPORT_CARD_WIDTH = 1080;
const EXPORT_CARD_HEIGHT = 1350;

const STEPS: Step[] = [
  {
    id: "supporting-team",
    eyebrow: "First allegiance",
    title: "What team are you rooting for?",
    description: "Pick the country you want to ride with through the tournament.",
  },
  {
    id: "favorite-player",
    eyebrow: "Main character",
    title: "Which player are you rooting for?",
    description: "Choose the player whose story you are backing.",
  },
  {
    id: "golden-boot",
    eyebrow: "Goal machine",
    title: "Who wins the Golden Boot?",
    description: "Pick the player you think will finish as top scorer.",
  },
  {
    id: "predictions",
    eyebrow: "The podium",
    title: "Predict the top three.",
    description: "Choose your winner, runner-up, and third-place team.",
  },
  {
    id: "hatewatch-team",
    eyebrow: "Optional drama",
    title: "Pick a hatewatch team.",
    description: "Choose a team you will be watching with suspicious energy.",
    optional: true,
  },
  {
    id: "hatewatch-player",
    eyebrow: "Optional spice",
    title: "Pick a hatewatch player.",
    description: "Choose a player you cannot look away from.",
    optional: true,
  },
  {
    id: "review",
    eyebrow: "Locked in",
    title: "Review your World Cup story.",
    description: "Check your picks before the share-card step arrives.",
  },
];

const emptyPicks: PicksState = {};

function clampStepIndex(value: number) {
  return Math.min(Math.max(value, 0), STEPS.length - 1);
}

function loadStoredState(): StoredPicksState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { picks: emptyPicks, stepIndex: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<StoredPicksState>;

    return {
      picks: parsed.picks ?? emptyPicks,
      stepIndex: clampStepIndex(parsed.stepIndex ?? 0),
    };
  } catch {
    return { picks: emptyPicks, stepIndex: 0 };
  }
}

function getPredictionIds(picks: PicksState) {
  return [
    picks.predictedWinnerId,
    picks.predictedRunnerUpId,
    picks.predictedThirdPlaceId,
  ].filter((id): id is string => Boolean(id));
}

function hasDuplicatePredictions(picks: PicksState) {
  const ids = getPredictionIds(picks);

  return ids.length > 1 && new Set(ids).size !== ids.length;
}

function getProxiedImageUrl(image?: string | null) {
  if (image?.startsWith("/")) {
    return image;
  }

  return image ? `/api/image?url=${encodeURIComponent(image)}` : null;
}

function slugifyFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPickCardId(card: PickCard) {
  return `${slugifyFileName(card.category)}-${slugifyFileName(card.title)}`;
}

function getPickCardFileName(card: PickCard) {
  const prefix = card.filePrefix ? `${card.filePrefix}-` : "";

  return `${prefix}${getPickCardId(card) || "world-cup-pick"}.png`;
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

async function exportPickCard(node: HTMLElement) {
  await waitForImages(node);

  const dataUrl = await toPng(node, {
    cacheBust: true,
    includeQueryParams: true,
    pixelRatio: 1,
  });

  const response = await fetch(dataUrl);

  return response.blob();
}

function scrollPicksPanelToEnd() {
  window.requestAnimationFrame(() => {
    const panel = document.querySelector<HTMLElement>("[data-picks-scroll-panel]");
    const footer = document.querySelector<HTMLElement>("[data-picks-footer]");

    if (panel && panel.scrollHeight > panel.clientHeight) {
      panel.scrollTo({
        behavior: "smooth",
        top: panel.scrollHeight,
      });
      return;
    }

    footer?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  });
}

function isStepComplete(stepId: StepId, picks: PicksState) {
  switch (stepId) {
    case "supporting-team":
      return Boolean(picks.supportingTeamId);
    case "favorite-player":
      return Boolean(picks.favoritePlayerId);
    case "golden-boot":
      return Boolean(picks.goldenBootWinnerId);
    case "predictions":
      return (
        Boolean(picks.predictedWinnerId) &&
        Boolean(picks.predictedRunnerUpId) &&
        Boolean(picks.predictedThirdPlaceId) &&
        !hasDuplicatePredictions(picks)
      );
    case "hatewatch-team":
    case "hatewatch-player":
    case "review":
      return true;
  }
}

function isStepIndicatorComplete(stepId: StepId, picks: PicksState) {
  switch (stepId) {
    case "supporting-team":
    case "favorite-player":
    case "golden-boot":
    case "predictions":
      return isStepComplete(stepId, picks);
    case "hatewatch-team":
      return Boolean(picks.hatewatchTeamId);
    case "hatewatch-player":
      return Boolean(picks.hatewatchPlayerId);
    case "review":
      return false;
  }
}

function canNavigateToStep(targetIndex: number, currentIndex: number, picks: PicksState) {
  if (targetIndex <= currentIndex) {
    return true;
  }

  return STEPS.slice(0, targetIndex).every((step) =>
    isStepComplete(step.id, picks)
  );
}

export function PicksWizard({
  displayClassName,
  players,
  teams,
}: PicksWizardProps) {
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [picks, setPicks] = useState<PicksState>(emptyPicks);
  const [stepIndex, setStepIndex] = useState(0);
  const stepLoadingTimeoutRef = useRef<number | null>(null);
  const currentStep = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  useEffect(() => {
    const storedState = loadStoredState();

    queueMicrotask(() => {
      setPicks(storedState.picks);
      setStepIndex(storedState.stepIndex);
      setHasLoadedStorage(true);
    });
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ picks, stepIndex })
    );
  }, [hasLoadedStorage, picks, stepIndex]);

  useEffect(() => {
    return () => {
      if (stepLoadingTimeoutRef.current) {
        window.clearTimeout(stepLoadingTimeoutRef.current);
      }
    };
  }, []);

  function showStepLoading() {
    if (stepLoadingTimeoutRef.current) {
      window.clearTimeout(stepLoadingTimeoutRef.current);
    }

    setIsStepLoading(true);
    stepLoadingTimeoutRef.current = window.setTimeout(() => {
      setIsStepLoading(false);
    }, 220);
  }

  function setActiveStep(nextStepIndex: number) {
    showStepLoading();
    setStepIndex(clampStepIndex(nextStepIndex));
  }

  function updatePick<Key extends keyof PicksState>(
    key: Key,
    value: PicksState[Key]
  ) {
    setPicks((currentPicks) => ({
      ...currentPicks,
      [key]: value,
    }));
  }

  function goNext() {
    if (!isStepComplete(currentStep.id, picks)) {
      return;
    }

    setActiveStep(stepIndex + 1);
  }

  function goBack() {
    setActiveStep(stepIndex - 1);
  }

  function skipOptionalStep() {
    if (currentStep.id === "hatewatch-team") {
      updatePick("hatewatchTeamId", null);
    }

    if (currentStep.id === "hatewatch-player") {
      updatePick("hatewatchPlayerId", null);
      updatePick("hatewatchPlayerTrollName", "");
    }

    setActiveStep(stepIndex + 1);
  }

  function resetPicks() {
    setPicks(emptyPicks);
    setActiveStep(0);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function editStep(stepId: StepId) {
    const nextStepIndex = STEPS.findIndex((step) => step.id === stepId);

    if (nextStepIndex >= 0) {
      setActiveStep(nextStepIndex);
    }
  }

  const canContinue = isStepComplete(currentStep.id, picks);
  const showNextButton = currentStep.id !== "review";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-14 rounded-none border-b border-border/70 bg-background/66 p-0 shadow-(--photo-shadow) backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
        <div className="grid h-full w-full grid-cols-[1fr_auto] items-center p-2">
          <Link
            href="/"
            aria-label="Home"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border-0 bg-card/70 text-foreground shadow-[var(--photo-shadow)] backdrop-blur transition-colors hover:bg-accent"
          >
            <Home className="size-4 " />
          </Link>
          <div className="flex gap-6 items-center">
          <p className="hidden truncate text-center text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:block">
            World Cup 2026 · USA
          </p>
          <div className="flex h-10 w-10 items-center justify-center">
            <ThemeToggle className="border-border bg-card/70 text-foreground scale-85 shadow-[var(--photo-shadow)] backdrop-blur hover:bg-accent" />
          </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-5 pt-20 sm:px-6 sm:pb-8 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--mauve)_20%,transparent),transparent_62%)]" />

      <section className="relative z-10 grid flex-1 items-center gap-8 py-8 lg:min-h-0 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:py-10">
        <aside className="space-y-7 lg:self-end">
          <div>
            <p className="mb-4 hidden rounded-full border border-(--hero-pill-border) bg-(--hero-pill-background) px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.24em] text-foreground sm:inline-flex">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h1
              className={cn(
                displayClassName,
                "relative top-4 mb-2 text-[clamp(2.7rem,12vw,4.8rem)] uppercase leading-[0.9] tracking-tight lg:text-[clamp(4.4rem,6vw,6.2rem)]"
              )}
            >
              Make your
              <span className="mt-2 block text-mauve lg:mt-3">picks</span>
            </h1>
            <p className="mt-5 max-w-md text-sm font-medium leading-7 text-muted-foreground sm:text-base md:text-lg">
              Move through each pick, build your football story, then review it before we turn it into share cards.

            </p>
          </div>

          <div className="space-y-3">
            <Progress
              value={progress}
              className="h-2 bg-muted/70 [&_[data-slot=progress-indicator]]:bg-mauve"
            />
            <ol className="flex items-center gap-2">
              {STEPS.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = isStepIndicatorComplete(step.id, picks);
                const canNavigate = canNavigateToStep(index, stepIndex, picks);

                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (canNavigate) {
                          setActiveStep(index);
                        }
                      }}
                      disabled={!canNavigate}
                      aria-label={`Go to step ${index + 1}: ${step.title}`}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border text-[0.68rem] font-black transition disabled:pointer-events-none disabled:opacity-35 sm:size-8",
                        isActive
                          ? "border-(--hero-pill-border) bg-(--hero-pill-background) text-foreground"
                          : "border-border bg-card/45 text-muted-foreground hover:bg-accent hover:text-foreground",
                        isDone &&
                          !isActive &&
                          "border-mauve bg-mauve text-mauve-foreground hover:bg-mauve hover:text-mauve-foreground"
                      )}
                    >
                      {isDone && !isActive ? (
                        <Check className="size-4" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        <div
          className="min-w-0 lg:min-h-0 lg:self-stretch lg:overflow-y-auto"
          data-picks-scroll-panel
        >
          <section className="relative min-w-0 rounded-2xl border border-border bg-card/70 p-4 shadow-(--photo-shadow) backdrop-blur sm:p-6 lg:p-7">
            {isStepLoading ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-bold text-muted-foreground shadow-(--photo-shadow)">
                  <Loader2 className="size-4 animate-spin" />
                  Loading
                </div>
              </div>
            ) : null}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.24em] text-mauve">
                  {currentStep.eyebrow}
                </p>
                <h2
                  className={cn(
                    displayClassName,
                    "text-2xl tracking-tight text-foreground sm:text-3xl"
                  )}
                >
                  {currentStep.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {currentStep.description}
                </p>
              </div>
              {currentStep.optional ? (
                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-bold text-muted-foreground">
                  Optional
                </span>
              ) : null}
            </div>

            <div className="min-h-[22rem]">
              {currentStep.id === "supporting-team" ? (
                <TeamStep
                  selectedTeam={teamById.get(picks.supportingTeamId ?? "")}
                  teams={teams}
                  value={picks.supportingTeamId}
                  onChange={(value) => updatePick("supportingTeamId", value)}
                />
              ) : null}

              {currentStep.id === "favorite-player" ? (
                <PlayerStep
                  players={players}
                  selectedPlayer={playerById.get(picks.favoritePlayerId ?? "")}
                  teams={teams}
                  value={picks.favoritePlayerId}
                  onChange={(value) => updatePick("favoritePlayerId", value)}
                />
              ) : null}

              {currentStep.id === "golden-boot" ? (
                <PlayerStep
                  players={players}
                  previewEyebrow="Golden Boot winner"
                  previewIcon={<Trophy className="size-5" />}
                  selectedPlayer={playerById.get(picks.goldenBootWinnerId ?? "")}
                  teams={teams}
                  value={picks.goldenBootWinnerId}
                  onChange={(value) => updatePick("goldenBootWinnerId", value)}
                />
              ) : null}

              {currentStep.id === "predictions" ? (
                <PredictionsStep
                  picks={picks}
                  teamById={teamById}
                  teams={teams}
                  onChange={updatePick}
                />
              ) : null}

              {currentStep.id === "hatewatch-team" ? (
                <TeamStep
                  icon="eye"
                  selectedTeam={teamById.get(picks.hatewatchTeamId ?? "")}
                  teams={teams}
                  value={picks.hatewatchTeamId ?? undefined}
                  onChange={(value) => updatePick("hatewatchTeamId", value)}
                />
              ) : null}

              {currentStep.id === "hatewatch-player" ? (
                <PlayerStep
                  icon="eye"
                  players={players}
                  selectedPlayer={playerById.get(picks.hatewatchPlayerId ?? "")}
                  teams={teams}
                  trollName={picks.hatewatchPlayerTrollName}
                  value={picks.hatewatchPlayerId ?? undefined}
                  onChange={(value) => updatePick("hatewatchPlayerId", value)}
                  onTrollNameChange={(value) =>
                    updatePick("hatewatchPlayerTrollName", value)
                  }
                />
              ) : null}

              {currentStep.id === "review" ? (
                <ReviewStep
                  displayClassName={displayClassName}
                  onEdit={editStep}
                  picks={picks}
                  playerById={playerById}
                  teamById={teamById}
                />
              ) : null}
            </div>

            {currentStep.id === "predictions" && hasDuplicatePredictions(picks) ? (
              <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                Your winner, runner-up, and third place need to be three different
                teams.
              </p>
            ) : null}

            <footer
              className="mt-7 flex items-center justify-between gap-2 border-t border-border pt-5"
              data-picks-footer
            >
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                  className="h-9 rounded-full px-3 text-xs sm:h-11 sm:px-5 sm:text-sm"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetPicks}
                  className="h-9 rounded-full px-3 text-xs text-muted-foreground sm:h-11 sm:px-4 sm:text-sm"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>

              <div className="flex gap-2">
                {currentStep.optional ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={skipOptionalStep}
                    className="h-9 rounded-full px-3 text-xs sm:h-11 sm:px-5 sm:text-sm"
                  >
                    Skip
                  </Button>
                ) : null}

                {showNextButton ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={!canContinue}
                    className="h-9 rounded-full bg-mauve px-4 text-xs text-mauve-foreground hover:bg-mauve/90 sm:h-11 sm:px-6 sm:text-sm"
                  >
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled
                    className="h-9 rounded-full bg-mauve px-4 text-xs text-mauve-foreground sm:h-11 sm:px-6 sm:text-sm"
                  >
                    Cards come next
                    <Sparkles className="size-4" />
                  </Button>
                )}
              </div>
            </footer>
          </section>
        </div>
      </section>
      </div>
    </>
  );
}

function TeamStep({
  icon = "shield",
  onChange,
  selectedTeam,
  teams,
  value,
}: {
  icon?: "eye" | "shield";
  onChange: (value: string) => void;
  selectedTeam?: TeamOption;
  teams: TeamOption[];
  value?: string;
}) {
  function handleTeamChange(teamId: string) {
    onChange(teamId);
    scrollPicksPanelToEnd();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <TeamPicker
        label="Team"
        onChange={handleTeamChange}
        teams={teams}
        value={value}
      />
      <SelectionPreview
        eyebrow={icon === "eye" ? "Hatewatch team" : "Rooting team"}
        icon={icon === "eye" ? <Eye className="size-5" /> : undefined}
        image={selectedTeam?.badge || selectedTeam?.logo}
        imageFit="contain"
        placeholder="No team selected"
        title={selectedTeam?.name}
        variant="team"
      />
    </div>
  );
}

function PlayerStep({
  icon = "star",
  onChange,
  onTrollNameChange,
  previewEyebrow,
  previewIcon,
  players,
  selectedPlayer,
  teams,
  trollName,
  value,
}: {
  icon?: "eye" | "star";
  onChange: (value: string) => void;
  onTrollNameChange?: (value: string) => void;
  previewEyebrow?: string;
  previewIcon?: React.ReactNode;
  players: PlayerOption[];
  selectedPlayer?: PlayerOption;
  teams: TeamOption[];
  trollName?: string;
  value?: string;
}) {
  const trimmedTrollName = trollName?.trim();

  function handlePlayerChange(playerId: string) {
    onChange(playerId);
    scrollPicksPanelToEnd();
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <PlayerPicker
        label="Player"
        onChange={handlePlayerChange}
        players={players}
        teams={teams}
        value={value}
      />
      <div className="space-y-3">
        <SelectionPreview
          eyebrow={
            previewEyebrow ??
            (icon === "eye" ? "Hatewatch player" : "Favorite player")
          }
          icon={
            previewIcon ??
            (icon === "eye" ? (
                <Eye className="size-5" />
              ) : (
                <Star className="size-5" />
              ))
          }
          image={selectedPlayer?.image}
          imageFit="cover"
          meta={selectedPlayer?.teamName}
          placeholder="No player selected"
          title={
            selectedPlayer
              ? icon === "eye"
                ? trimmedTrollName || selectedPlayer.name
                : selectedPlayer.name
              : undefined
          }
          variant="player"
        />
        {icon === "eye" && selectedPlayer && onTrollNameChange ? (
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <label
              className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="hatewatch-player-troll-name"
            >
              Troll-name?
            </label>
            <Input
              id="hatewatch-player-troll-name"
              value={trollName ?? ""}
              onChange={(event) => onTrollNameChange(event.target.value)}
              placeholder="e.g. penaldo"
              className="mt-3 h-11 rounded-xl bg-background/70 font-semibold"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PredictionsStep({
  onChange,
  picks,
  teamById,
  teams,
}: {
  onChange: <Key extends keyof PicksState>(
    key: Key,
    value: PicksState[Key]
  ) => void;
  picks: PicksState;
  teamById: Map<string, TeamOption>;
  teams: TeamOption[];
}) {
  const podium = [
    {
      key: "predictedWinnerId",
      label: "Winner",
      value: picks.predictedWinnerId,
    },
    {
      key: "predictedRunnerUpId",
      label: "Runner-Up",
      value: picks.predictedRunnerUpId,
    },
    {
      key: "predictedThirdPlaceId",
      label: "Third Place",
      value: picks.predictedThirdPlaceId,
    },
  ] as const;
  const predictionCarouselRef = useRef<HTMLDivElement>(null);

  function scrollToPrediction(index: number) {
    const safeIndex = Math.min(Math.max(index, 0), podium.length - 1);
    const panel = predictionCarouselRef.current?.querySelector<HTMLElement>(
      `[data-prediction-panel="${safeIndex}"]`
    );

    panel?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  function handlePredictionChange(
    item: (typeof podium)[number],
    index: number,
    value: string
  ) {
    onChange(item.key, value);

    window.requestAnimationFrame(() => {
      if (index < podium.length - 1) {
        scrollToPrediction(index + 1);
        return;
      }

      scrollPicksPanelToEnd();
    });
  }

  return (
    <div className="space-y-5">
      <div className="w-full max-w-full overflow-hidden">
        <div
          ref={predictionCarouselRef}
          className="flex w-full max-w-full snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {podium.map((item, index) => {
            const disabledTeamIds = podium
              .filter((disabledItem) => disabledItem.key !== item.key)
              .map((disabledItem) => disabledItem.value)
              .filter((teamId): teamId is string => Boolean(teamId));

            return (
              <div
                key={item.key}
                data-prediction-panel={index}
                className="w-full min-w-0 max-w-full flex-none snap-start rounded-xl border border-border bg-background/45 p-4 md:w-[calc((100%_-_1rem)*0.666667)]"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => scrollToPrediction(index - 1)}
                    disabled={index === 0}
                    aria-label="Previous prediction"
                    className="rounded-full"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-muted-foreground">
                    {index + 1} of {podium.length}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => scrollToPrediction(index + 1)}
                    disabled={index === podium.length - 1}
                    aria-label="Next prediction"
                    className="rounded-full"
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
                <TeamPicker
                  disabledTeamIds={disabledTeamIds}
                  gridClassName="sm:grid-cols-1"
                  label={item.label}
                  onChange={(value) => handlePredictionChange(item, index, value)}
                  scrollClassName="h-72"
                  teams={teams}
                  value={item.value}
                />
              </div>
          );
          })}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-background/45 p-3">
        <div className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {podium.map((item) => {
            const team = teamById.get(item.value ?? "");
            const image = team?.badge || team?.logo;

            return (
              <div
                key={item.key}
                className="flex items-center gap-3 px-2 py-3 first:pt-1 last:pb-1 md:flex-col md:px-4 md:py-2 md:text-center md:first:pt-2 md:last:pb-2"
              >
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card md:size-20">
                  {image ? (
                    <ImageWithLoader
                      src={image}
                      alt={`${team.name} badge`}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <Trophy className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-mauve md:justify-center">
                    <Trophy className="size-3.5" />
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-base font-black text-foreground md:whitespace-normal">
                    {team?.name || "Waiting for pick"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({
  displayClassName,
  onEdit,
  picks,
  playerById,
  teamById,
}: {
  displayClassName: string;
  onEdit: (stepId: StepId) => void;
  picks: PicksState;
  playerById: Map<string, PlayerOption>;
  teamById: Map<string, TeamOption>;
}) {
  const cardNodeRefs = useRef(new Map<string, HTMLDivElement>());
  const downloadNoticeTimeoutRef = useRef<number | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<DownloadNotice | null>(
    null
  );
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const supportingTeam = teamById.get(picks.supportingTeamId ?? "");
  const favoritePlayer = playerById.get(picks.favoritePlayerId ?? "");
  const goldenBootWinner = playerById.get(picks.goldenBootWinnerId ?? "");
  const predictedWinner = teamById.get(picks.predictedWinnerId ?? "");
  const predictedRunnerUp = teamById.get(picks.predictedRunnerUpId ?? "");
  const predictedThirdPlace = teamById.get(picks.predictedThirdPlaceId ?? "");
  const hatewatchTeam = teamById.get(picks.hatewatchTeamId ?? "");
  const hatewatchPlayer = playerById.get(picks.hatewatchPlayerId ?? "");
  const hatewatchPlayerTrollName = picks.hatewatchPlayerTrollName?.trim();
  const hatewatchPlayerDisplayName = hatewatchPlayer
    ? hatewatchPlayerTrollName || hatewatchPlayer.name
    : undefined;
  const predictedPodium = [
    predictedWinner
      ? {
          image: predictedWinner.image,
          label: "Winner",
          title: predictedWinner.name,
        }
      : null,
    predictedRunnerUp
      ? {
          image: predictedRunnerUp.image,
          label: "Runner-Up",
          title: predictedRunnerUp.name,
        }
      : null,
    predictedThirdPlace
      ? {
          image: predictedThirdPlace.image,
          label: "Third Place",
          title: predictedThirdPlace.name,
        }
      : null,
  ].filter((podiumItem): podiumItem is NonNullable<typeof podiumItem> =>
    Boolean(podiumItem)
  );
  const cardPreviewOptions: Array<PickCard | null> = [
    {
      category: "My Picks",
      image: "/assets/my_picks.png",
      imageOnly: true,
      title: "My Picks",
    },
    supportingTeam
      ? {
          category: "Rooting Team",
          image: supportingTeam.image,
          title: supportingTeam.name,
        }
      : null,
    favoritePlayer
      ? {
          category: "Favorite Player",
          image: favoritePlayer.image,
          title: favoritePlayer.name,
        }
      : null,
    goldenBootWinner
      ? {
          category: "Golden Boot Winner",
          image: goldenBootWinner.image,
          title: goldenBootWinner.name,
        }
      : null,
    predictedPodium.length
      ? {
          category: "Predicted Podium",
          podium: predictedPodium,
          title: "Predicted Top Three",
        }
      : null,
    hatewatchTeam
      ? {
          category: "Hatewatch Team",
          image: hatewatchTeam.image,
          title: hatewatchTeam.name,
        }
      : null,
    hatewatchPlayer
      ? {
          category: "Hatewatch Player",
          image: hatewatchPlayer.image,
          title: hatewatchPlayerDisplayName ?? hatewatchPlayer.name,
        }
      : null,
    {
      category: "World Cup Logo",
      image: "/assets/fifa_logo.png",
      imageOnly: true,
      title: "World Cup Logo",
    },
  ];
  const cardPreviews = cardPreviewOptions
    .filter((card): card is PickCard => Boolean(card))
    .map((card, index) => ({
      ...card,
      filePrefix: String(index + 1).padStart(2, "0"),
    }));
  const registerCardNode = useCallback(
    (cardId: string, node: HTMLDivElement | null) => {
      if (node) {
        cardNodeRefs.current.set(cardId, node);
        return;
      }

      cardNodeRefs.current.delete(cardId);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (downloadNoticeTimeoutRef.current) {
        window.clearTimeout(downloadNoticeTimeoutRef.current);
      }
    };
  }, []);

  function showDownloadNotice(notice: DownloadNotice) {
    if (downloadNoticeTimeoutRef.current) {
      window.clearTimeout(downloadNoticeTimeoutRef.current);
    }

    setDownloadNotice(notice);

    if (notice.status !== "downloading") {
      downloadNoticeTimeoutRef.current = window.setTimeout(() => {
        setDownloadNotice(null);
      }, 3200);
    }
  }

  async function downloadAllCards() {
    if (!cardPreviews.length || isDownloadingAll) {
      return;
    }

    setIsDownloadingAll(true);
    showDownloadNotice({
      message: "Preparing your ZIP...",
      status: "downloading",
    });

    try {
      const zip = new JSZip();

      for (const card of cardPreviews) {
        const cardId = getPickCardId(card);
        const node = cardNodeRefs.current.get(cardId);

        if (!node) {
          continue;
        }

        const blob = await exportPickCard(node);
        zip.file(getPickCardFileName(card), blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      downloadBlob(zipBlob, "your-world-cup-picks.zip");
      showDownloadNotice({
        message: "Download started: your-world-cup-picks.zip",
        status: "downloaded",
      });
    } catch {
      showDownloadNotice({
        message: "Download failed. Try again.",
        status: "error",
      });
    } finally {
      setIsDownloadingAll(false);
    }
  }
  const rows = [
    {
      label: "Rooting Team",
      value: supportingTeam?.name,
      image: supportingTeam?.badge || supportingTeam?.logo,
      imageFit: "contain",
      stepId: "supporting-team",
    },
    {
      label: "Favorite Player",
      value: favoritePlayer?.name,
      image: favoritePlayer?.image,
      imageFit: "cover",
      meta: favoritePlayer?.teamName,
      stepId: "favorite-player",
    },
    {
      label: "Golden Boot Winner",
      value: goldenBootWinner?.name,
      image: goldenBootWinner?.image,
      imageFit: "cover",
      meta: goldenBootWinner?.teamName,
      stepId: "golden-boot",
    },
    {
      label: "Predicted Winner",
      value: predictedWinner?.name,
      image: predictedWinner?.badge || predictedWinner?.logo,
      imageFit: "contain",
      stepId: "predictions",
    },
    {
      label: "Predicted Runner-Up",
      value: predictedRunnerUp?.name,
      image: predictedRunnerUp?.badge || predictedRunnerUp?.logo,
      imageFit: "contain",
      stepId: "predictions",
    },
    {
      label: "Predicted Third Place",
      value: predictedThirdPlace?.name,
      image: predictedThirdPlace?.badge || predictedThirdPlace?.logo,
      imageFit: "contain",
      stepId: "predictions",
    },
    {
      label: "Hatewatch Team",
      value: hatewatchTeam?.name,
      image: hatewatchTeam?.badge || hatewatchTeam?.logo,
      imageFit: "contain",
      optional: true,
      stepId: "hatewatch-team",
    },
    {
      label: "Hatewatch Player",
      value: hatewatchPlayerDisplayName,
      image: hatewatchPlayer?.image,
      imageFit: "cover",
      meta: hatewatchPlayer?.teamName,
      optional: true,
      stepId: "hatewatch-player",
    },
  ] satisfies {
    image?: string | null;
    imageFit: "contain" | "cover";
    label: string;
    meta?: string;
    optional?: boolean;
    stepId: StepId;
    value?: string;
  }[];

  return (
    <div className="space-y-8">
      <div className="-mx-4 overflow-hidden sm:-mx-6 lg:-mx-7">
        <div className="flex items-start gap-4 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => onEdit(row.stepId)}
              aria-label={`Edit ${row.label}`}
              className="group w-36 shrink-0 text-left outline-none sm:w-40"
            >
              <div className="relative flex size-36 items-center justify-center overflow-hidden rounded-xl border border-border bg-card transition group-hover:border-mauve/70 group-focus-visible:ring-3 group-focus-visible:ring-ring/50 sm:size-40">
                {row.image ? (
                  <ImageWithLoader
                    src={row.image}
                    alt={row.value || row.label}
                    width={160}
                    height={160}
                    className={cn(
                      "h-full w-full",
                      row.imageFit === "contain"
                        ? "object-contain p-4"
                        : "object-cover"
                    )}
                  />
                ) : (
                  <span className="px-3 text-center text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                    {row.optional ? "Skip" : "TBD"}
                  </span>
                )}
              </div>
              <div className="mt-3 min-w-0">
                <p className="truncate text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                  {row.label}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-base font-black leading-tight",
                    row.value ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {row.value || (row.optional ? "Skipped" : "Not selected")}
                </p>
                {row.meta ? (
                  <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                    {row.meta}
                  </p>
                ) : row.optional && !row.value ? (
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    You left this one open.
                  </p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      {cardPreviews.length ? (
        <section className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-mauve">
                Share card previews
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-foreground">
                Your selected picks as square posts
              </h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={downloadAllCards}
                disabled={isDownloadingAll}
                className="h-10 rounded-full bg-mauve px-4 text-mauve-foreground hover:bg-mauve/90"
              >
                {isDownloadingAll ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {isDownloadingAll ? "Downloading..." : "Download all"}
              </Button>
              <CapCutTemplateDialog />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 ">
            {cardPreviews.map((card) => (
              <PickCardPreview
                key={getPickCardId(card)}
                card={card}
                cardId={getPickCardId(card)}
                displayClassName={displayClassName}
                onDownloadNotice={showDownloadNotice}
                registerCardNode={registerCardNode}
              />
            ))}
          </div>
        </section>
      ) : null}

      {downloadNotice ? (
        <div
          className={cn(
            "fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-extrabold shadow-(--photo-shadow) backdrop-blur",
            downloadNotice.status === "downloaded"
              ? "border-mauve/40 bg-background/90 text-foreground"
              : downloadNotice.status === "error"
                ? "border-destructive/40 bg-background/90 text-destructive"
                : "border-border bg-background/90 text-muted-foreground"
          )}
          role="status"
        >
          {downloadNotice.status === "downloaded" ? (
            <Check className="size-4 text-mauve" />
          ) : downloadNotice.status === "error" ? (
            <Download className="size-4" />
          ) : (
            <Loader2 className="size-4 animate-spin" />
          )}
          {downloadNotice.message}
        </div>
      ) : null}
    </div>
  );
}

function PickCardPreview({
  card,
  cardId,
  displayClassName,
  onDownloadNotice,
  registerCardNode,
}: {
  card: PickCard;
  cardId: string;
  displayClassName: string;
  onDownloadNotice: (notice: DownloadNotice) => void;
  registerCardNode: (cardId: string, node: HTMLDivElement | null) => void;
}) {
  const exportCardRef = useRef<HTMLDivElement | null>(null);
  const downloadResetTimeoutRef = useRef<number | null>(null);
  const [downloadState, setDownloadState] = useState<
    "downloaded" | "downloading" | "idle"
  >("idle");
  const imageUrl = getProxiedImageUrl(card.image);
  const isDownloading = downloadState === "downloading";

  useEffect(() => {
    registerCardNode(cardId, exportCardRef.current);

    return () => registerCardNode(cardId, null);
  }, [cardId, registerCardNode]);

  useEffect(() => {
    return () => {
      if (downloadResetTimeoutRef.current) {
        window.clearTimeout(downloadResetTimeoutRef.current);
      }
    };
  }, []);

  async function downloadCard() {
    if (!exportCardRef.current || isDownloading) {
      return;
    }

    if (downloadResetTimeoutRef.current) {
      window.clearTimeout(downloadResetTimeoutRef.current);
    }

    setDownloadState("downloading");
    onDownloadNotice({
      message: `Preparing ${card.category}...`,
      status: "downloading",
    });

    const filename = getPickCardFileName(card);

    try {
      const blob = await exportPickCard(exportCardRef.current);

      downloadBlob(blob, filename);
      setDownloadState("downloaded");
      onDownloadNotice({
        message: `Download started: ${filename}`,
        status: "downloaded",
      });
      downloadResetTimeoutRef.current = window.setTimeout(() => {
        setDownloadState("idle");
      }, 2600);
    } catch {
      setDownloadState("idle");
      onDownloadNotice({
        message: "Download failed. Try again.",
        status: "error",
      });
    }
  }

  return (
    <div className="space-y-2">
      <PickCardArtwork
        card={card}
        displayClassName={displayClassName}
        imageUrl={imageUrl}
        variant="preview"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10000px] top-0 z-[-1] opacity-0"
      >
        <PickCardArtwork
          card={card}
          cardId={cardId}
          cardRef={exportCardRef}
          displayClassName={displayClassName}
          imageUrl={imageUrl}
          variant="export"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={downloadCard}
        disabled={isDownloading}
        className="h-9 w-full rounded-full text-xs font-extrabold"
      >
        {isDownloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : downloadState === "downloaded" ? (
          <Check className="size-3.5 text-mauve" />
        ) : (
          <Download className="size-3.5" />
        )}
        {isDownloading
          ? "Downloading..."
          : downloadState === "downloaded"
            ? "Downloaded"
            : "Download PNG"}
      </Button>
    </div>
  );
}

function CapCutTemplateDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label="Get template video"
          className="h-10 rounded-full bg-foreground px-4 text-background hover:bg-foreground/90 sm:w-10 sm:px-0"
        >
          <CirclePlay className="size-4" />
          <span className="sm:hidden">Get template video</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-5 rounded-2xl border border-border bg-card p-5 shadow-(--photo-shadow) sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            Convert your picks into a CapCut video
          </DialogTitle>
          <DialogDescription>
            Use the template after saving your card images.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm font-medium text-muted-foreground">
          <p>
            <span className="font-black text-foreground">1.</span> Download all
            pictures first.
          </p>
          <p>
            <span className="font-black text-foreground">2.</span> Open the
            CapCut template.
          </p>
          <p>
            <span className="font-black text-foreground">3.</span> Select the
            images in preview order: "My Picks" first, your selections next, and the
            World Cup logo last.
          </p>
          <p className="rounded-xl border border-border bg-background/45 p-3">
            The template works best if you also completed the optional picks.
          </p>
        </div>
        <DialogFooter className="-mx-5 -mb-5 p-5">
          <Button
            asChild
            className="h-10 rounded-full bg-mauve px-5 text-mauve-foreground hover:bg-mauve/90"
          >
            <a
              href="https://www.capcut.com/tv2/ZSQysWSNe/"
              rel="noreferrer"
              target="_blank"
            >
              Use CapCut template
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PickCardArtwork({
  card,
  cardId,
  cardRef,
  displayClassName,
  imageUrl,
  variant,
}: {
  card: PickCard;
  cardId?: string;
  cardRef?: Ref<HTMLDivElement>;
  displayClassName: string;
  imageUrl: string | null;
  variant: "export" | "preview";
}) {
  const isExport = variant === "export";
  const podium = card.podium ?? [];
  const imageOnlyUrl = card.imageOnly ? getProxiedImageUrl(card.image) : null;

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden bg-[linear-gradient(135deg,var(--mauve),var(--background))]",
        isExport
          ? "rounded-none"
          : "aspect-[4/5] rounded-xl border border-border"
      )}
      data-export-card={cardId}
      style={
        isExport
          ? {
              height: `${EXPORT_CARD_HEIGHT}px`,
              width: `${EXPORT_CARD_WIDTH}px`,
            }
          : undefined
      }
    >
      {imageOnlyUrl ? (
        <ImageWithLoader
          src={imageOnlyUrl}
          alt={card.title}
          fill
          loading={isExport ? "eager" : "lazy"}
          unoptimized
          sizes={
            isExport
              ? `${EXPORT_CARD_WIDTH}px`
              : "(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
          }
          className="object-cover"
        />
      ) : podium.length ? (
        <div className="absolute inset-0 flex flex-col">
          {podium.map((item) => {
            const podiumImageUrl = getProxiedImageUrl(item.image);

            return (
              <div
                key={`${item.label}-${item.title}`}
                className="relative min-h-0 flex-1 overflow-hidden border-b border-white/15 last:border-b-0"
              >
                {podiumImageUrl ? (
                  <ImageWithLoader
                    src={podiumImageUrl}
                    alt={item.title}
                    fill
                    loading={isExport ? "eager" : "lazy"}
                    unoptimized
                    sizes={
                      isExport
                        ? `${EXPORT_CARD_WIDTH}px`
                        : "(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
                    }
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 opacity-55"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 30%, var(--mauve), transparent 58%)",
                    }}
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black/88 via-black/42 to-transparent" />
                <div
                  className={cn(
                    "absolute inset-x-0 bottom-0 text-center text-white",
                    isExport ? "px-[46px] pb-[34px] pt-[46px]" : "px-4 pb-3 pt-4"
                  )}
                >
                  <p
                    className={cn(
                      displayClassName,
                      "mx-auto max-w-[88%] uppercase text-white/72",
                      isExport
                        ? "text-[28px] tracking-[0.22em]"
                        : "text-[0.68rem] tracking-[0.18em]"
                    )}
                  >
                    {item.label}
                  </p>
                  <p
                    className={cn(
                      displayClassName,
                      "mx-auto mt-2 max-w-[92%] break-words uppercase leading-[0.92]",
                      isExport ? "text-[76px]" : "text-2xl"
                    )}
                  >
                    {item.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {imageUrl ? (
            <ImageWithLoader
              src={imageUrl}
              alt={card.title}
              fill
              loading={isExport ? "eager" : "lazy"}
              unoptimized
              sizes={
                isExport
                  ? `${EXPORT_CARD_WIDTH}px`
                  : "(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
              }
              className="object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 opacity-55"
              style={{
                background:
                  "radial-gradient(circle at 50% 30%, var(--mauve), transparent 58%)",
              }}
            />
          )}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent",
              isExport ? "h-[45%]" : "h-1/2"
            )}
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 text-center text-white",
              isExport ? "p-[78px]" : "p-5"
            )}
          >
            <p
              className={cn(
                displayClassName,
                "mx-auto max-w-[88%] uppercase text-white/72",
                isExport
                  ? "text-[34px] tracking-[0.24em]"
                  : "text-[0.8rem] tracking-[0.2em]"
              )}
            >
              {card.category}
            </p>
            <p
              className={cn(
                displayClassName,
                "mx-auto max-w-[92%] break-words uppercase leading-[0.92]",
                isExport ? "mt-7 text-[112px]" : "mt-2 text-3xl"
              )}
            >
              {card.title}
            </p>
            {card.meta ? (
              <p
                className={cn(
                  displayClassName,
                  "mx-auto max-w-[88%] text-white/75",
                  isExport ? "mt-7 text-[44px]" : "mt-2 text-base"
                )}
              >
                {card.meta}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function SelectionPreview({
  compact,
  eyebrow,
  icon,
  image,
  imageFit,
  meta,
  placeholder,
  title,
  variant = "default",
}: {
  compact?: boolean;
  eyebrow: string;
  icon?: React.ReactNode;
  image?: string | null;
  imageFit: "contain" | "cover";
  meta?: string;
  placeholder: string;
  title?: string;
  variant?: "default" | "player" | "team";
}) {
  const isStackedPreview = variant !== "default" && !compact;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background/45",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-mauve">
        {icon ? icon : null}
        {eyebrow}
      </div>
      <div
        className={cn(
          "mt-4 flex items-center gap-4",
          compact && "mt-3 gap-3",
          isStackedPreview && "lg:flex-col lg:items-stretch lg:gap-3"
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-card",
            compact
              ? "size-14"
              : isStackedPreview
                ? "size-24 lg:h-44 lg:w-full"
                : "size-24"
          )}
        >
          {image ? (
            <ImageWithLoader
              src={image}
              alt={title || placeholder}
              width={compact ? 56 : 96}
              height={compact ? 56 : 96}
              className={cn(
                "h-full w-full",
                imageFit === "contain" ? "object-contain p-2" : "object-cover"
              )}
            />
          ) : (
            <span className="px-3 text-center text-xs font-bold text-muted-foreground">
              TBD
            </span>
          )}
        </div>
        <div className={cn("min-w-0", isStackedPreview && "lg:text-center")}>
          <p
            className={cn(
              "truncate font-black text-foreground",
              compact ? "text-base" : "text-xl",
              isStackedPreview &&
                "lg:overflow-visible lg:whitespace-normal lg:text-2xl"
            )}
          >
            {title || placeholder}
          </p>
          {meta ? (
            <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
