import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

// Single plugin registration (module evaluated once per client bundle).
gsap.registerPlugin(useGSAP, CustomEase);

CustomEase.create("smooth", "M0,0 C0.16,1 0.3,1 1,1");
gsap.defaults({ ease: "smooth", duration: 0.6 });

export { gsap, useGSAP };
// Motion conditions live in lib/animation/motion (the mascot uses them without loading GSAP).
export { MOTION_QUERIES, prefersReducedMotion } from "./motion";
