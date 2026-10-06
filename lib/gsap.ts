"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

// Registro único dos plugins (módulo avaliado uma vez por bundle de cliente).
gsap.registerPlugin(useGSAP, Flip, CustomEase);

CustomEase.create("smooth", "M0,0 C0.16,1 0.3,1 1,1");
gsap.defaults({ ease: "smooth", duration: 0.6 });

export { gsap, useGSAP, Flip };
// As condições de movimento ficam em lib/motion (o mascote as usa sem carregar o GSAP).
export { MOTION_QUERIES, prefersReducedMotion } from "./motion";
