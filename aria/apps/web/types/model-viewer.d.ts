// Lets us use the @google/model-viewer custom element in JSX.
//
// model-viewer is a Web Component, not a React component; React 19 ships a
// passable runtime story for custom elements but TypeScript still needs to be
// told which attributes are valid on the element name.

import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerAttributes = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string;
  alt?: string;
  poster?: string;
  "auto-rotate"?: boolean | "";
  "auto-rotate-delay"?: string | number;
  "rotation-per-second"?: string;
  "camera-controls"?: boolean | "";
  "interaction-prompt"?: "auto" | "when-focused" | "none";
  "shadow-intensity"?: string | number;
  "shadow-softness"?: string | number;
  exposure?: string | number;
  "environment-image"?: string;
  "skybox-image"?: string;
  "camera-orbit"?: string;
  "field-of-view"?: string;
  ar?: boolean | "";
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}

export {};
