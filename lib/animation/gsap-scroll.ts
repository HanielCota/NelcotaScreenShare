import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { gsap } from "./gsap";

// Scroll plugins live apart from the core: only the pages that scroll-animate load them.
gsap.registerPlugin(ScrollTrigger, SplitText);
export { ScrollTrigger, SplitText };
