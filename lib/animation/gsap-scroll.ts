import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "./gsap";

// The scroll plugin lives apart from the core: only the pages that scroll-animate load it.
gsap.registerPlugin(ScrollTrigger);
export { ScrollTrigger };
