"use client";

import {
  easings,
  resolveSignatureMotion,
  signatureHoverTransition,
  signatureVariants,
  useSignatureMotionVariants,
} from "@/lib/motion";

export const adminEase = easings.signature;
export const sectionVariants = signatureVariants.section;
export const listItemVariants = signatureVariants.listItem;
export const statusBannerVariants = signatureVariants.status;
export const staggerContainerVariants = signatureVariants.stagger;
export const defaultHoverTransition = signatureHoverTransition;

export function useAdminMotionVariants() {
  return useSignatureMotionVariants();
}

export { resolveSignatureMotion as resolveAdminMotion };
