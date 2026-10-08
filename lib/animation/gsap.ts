import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { MOTION_DURATION } from "./motion";

// Single plugin registration (module evaluated once per client bundle).
gsap.registerPlugin(useGSAP, CustomEase);

CustomEase.create("smooth", "M0,0 C0.22,1 0.36,1 1,1");
gsap.defaults({ ease: "smooth", duration: MOTION_DURATION.entrance });

export { gsap, useGSAP };
// Motion conditions live in lib/animation/motion (the mascot uses them without loading GSAP).
export { MOTION_DURATION, MOTION_QUERIES, prefersReducedMotion } from "./motion";
