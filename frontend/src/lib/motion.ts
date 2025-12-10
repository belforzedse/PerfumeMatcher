import { useMemo, type DependencyList } from "react";
import { type Transition, type Variants, useReducedMotion } from "framer-motion";

export const easings = {
  luxury: [0.19, 0.76, 0.32, 1] as const,
  soft: [0.22, 0.61, 0.36, 1] as const,
  signature: [0.16, 1, 0.3, 1] as const,
};

export const durations = {
  quick: 0.55,
  moderate: 0.78,
  relaxed: 0.9,
};

export const transitions = {
  page: {
    duration: durations.relaxed,
    ease: easings.luxury,
  } satisfies Transition,
  surface: {
    duration: durations.moderate,
    ease: easings.luxury,
  } satisfies Transition,
  gentleSpring: {
    type: "spring",
    stiffness: 160,
    damping: 24,
    mass: 1.05,
    restDelta: 0.001,
    restSpeed: 0.001,
  } satisfies Transition,
};

export const signatureHoverTransition: Transition = {
  duration: 0.45,
  ease: easings.signature,
};

export const signatureTransitions = {
  page: {
    duration: (durations.relaxed + 0.74) / 2,
    ease: easings.signature,
  } satisfies Transition,
  surface: {
    duration: (durations.moderate + 0.6) / 2,
    ease: easings.signature,
  } satisfies Transition,
  section: {
    duration: 0.6,
    ease: easings.signature,
  } satisfies Transition,
  listItem: {
    duration: 0.45,
    ease: easings.signature,
  } satisfies Transition,
  listItemExit: {
    duration: 0.3,
    ease: easings.signature,
  } satisfies Transition,
  status: {
    duration: 0.4,
    ease: easings.signature,
  } satisfies Transition,
  statusExit: {
    duration: 0.25,
    ease: easings.signature,
  } satisfies Transition,
  hover: signatureHoverTransition,
};

const signatureSectionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: signatureTransitions.section,
  },
};

const signatureListItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: signatureTransitions.listItem,
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: signatureTransitions.listItemExit,
  },
};

const signatureStatusVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: signatureTransitions.status,
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: signatureTransitions.statusExit,
  },
};

const signatureStaggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const signatureDisabledSectionVariants: Variants = {
  hidden: {
    opacity: 1,
    y: 0,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

const signatureDisabledVariants: Variants = {
  hidden: {
    opacity: 1,
    y: 0,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
  exit: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

const signatureDisabledStaggerVariants: Variants = {
  hidden: {},
  visible: {},
};

export const signatureVariants = {
  section: signatureSectionVariants,
  listItem: signatureListItemVariants,
  status: signatureStatusVariants,
  stagger: signatureStaggerVariants,
} as const;

const signatureDisabledVariantSet = {
  section: signatureDisabledSectionVariants,
  listItem: signatureDisabledVariants,
  status: signatureDisabledVariants,
  stagger: signatureDisabledStaggerVariants,
} as const;

function buildSignatureMotionVariants(shouldReduceMotion: boolean) {
  if (shouldReduceMotion) {
    return {
      ...signatureDisabledVariantSet,
      transition: NOOP_TRANSITION,
      ease: easings.signature,
    } as const;
  }

  return {
    ...signatureVariants,
    transition: signatureHoverTransition,
    ease: easings.signature,
  } as const;
}

export function resolveSignatureMotion(shouldReduceMotion: boolean) {
  return {
    ...buildSignatureMotionVariants(shouldReduceMotion),
    shouldReduce: shouldReduceMotion,
  } as const;
}

export function useSignatureMotionVariants() {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return useMemo(
    () => resolveSignatureMotion(shouldReduceMotion),
    [shouldReduceMotion]
  );
}

const NOOP_TRANSITION: Transition = { duration: 0 };

const NOOP_LIST_VARIANTS: Variants = {
  hidden: {},
  show: {},
  exit: {},
};

const NOOP_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1, filter: "none" },
  show: { opacity: 1, y: 0, scale: 1, filter: "none", transition: { duration: 0 } },
  exit: { opacity: 1, y: 0, scale: 1, filter: "none", transition: { duration: 0 } },
};

export const useMotionPreference = useReducedMotion;

export function useMotionSafeTransition<T extends Transition>(
  factory: () => T,
  deps: DependencyList = []
): Transition {
  const shouldReduceMotion = useReducedMotion();

  return useMemo(
    () => (shouldReduceMotion ? NOOP_TRANSITION : factory()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shouldReduceMotion, ...deps]
  );
}

export function useStaggeredListVariants({
  delayChildren = 0.16,
  staggerChildren = 0.08,
  direction = "forward",
}: {
  delayChildren?: number;
  staggerChildren?: number;
  direction?: "forward" | "reverse";
} = {}): Variants {
  const shouldReduceMotion = useReducedMotion();

  return useMemo(
    () =>
      shouldReduceMotion
        ? NOOP_LIST_VARIANTS
        : ({
            hidden: {},
            show: {
              transition: {
                delayChildren,
                staggerChildren,
                staggerDirection: direction === "reverse" ? -1 : 1,
              },
            },
            exit: {
              transition: {
                staggerChildren,
                staggerDirection: direction === "reverse" ? 1 : -1,
              },
            },
          } satisfies Variants),
    [shouldReduceMotion, delayChildren, staggerChildren, direction]
  );
}

export function useFadeScaleVariants({
  y = 22,
  scale = 0.97,
  blur,
  duration = signatureTransitions.surface.duration ?? durations.moderate,
  delay = 0,
  ease = signatureTransitions.surface.ease ?? easings.signature,
  exitY = -16,
}: {
  y?: number;
  scale?: number;
  blur?: number;
  duration?: number;
  delay?: number;
  ease?: Transition["ease"];
  exitY?: number;
} = {}): Variants {
  const shouldReduceMotion = useReducedMotion();

  return useMemo(
    () =>
      shouldReduceMotion
        ? NOOP_ITEM_VARIANTS
        : ({
            hidden: {
              opacity: 0,
              y,
              scale,
              ...(typeof blur === "number" && blur > 0
                ? { filter: `blur(${blur}px)` as const }
                : {}),
            },
            show: {
              opacity: 1,
              y: 0,
              scale: 1,
              ...(typeof blur === "number" && blur > 0
                ? { filter: "blur(0px)" as const }
                : {}),
              transition: {
                duration,
                ease,
                delay,
              },
            },
            exit: {
              opacity: 0,
              y: exitY,
              scale: 0.985,
              ...(typeof blur === "number" && blur > 0
                ? {
                    filter: `blur(${Math.max(blur - 2, 2)}px)` as const,
                  }
                : {}),
              transition: {
                duration: Math.max(duration * 0.75, 0.2),
                ease,
              },
            },
          } satisfies Variants),
    [shouldReduceMotion, y, scale, blur, duration, delay, ease, exitY]
  );
}
