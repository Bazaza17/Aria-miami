"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SurgeValue, WindValue } from "@/components/walkthrough/variants";

type ScenarioCtx = {
  surge: SurgeValue;
  wind: WindValue;
  setSurge: (v: SurgeValue) => void;
  setWind: (v: WindValue) => void;
};

const Ctx = createContext<ScenarioCtx | null>(null);

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const [surge, setSurge] = useState<SurgeValue>(0);
  const [wind, setWind] = useState<WindValue>(0);

  const value = useMemo(
    () => ({ surge, wind, setSurge, setWind }),
    [surge, wind],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScenario(): ScenarioCtx {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error("useScenario must be used within <ScenarioProvider>");
  }
  return value;
}
