gsap.set(".box", {opacity: 1})

const mm = gsap.matchMedia();

mm.add({
  isSmall: "(max-width: 800px)",
  isLarge: "(min-width: 801px)"
}, (c) => {
  if (c.conditions.isSmall) {
     gsap.set(".large", { display: "none"});
     gsap.from(".small", { scale: 0, ease: "back.out"});
     gsap.to(".small img", { rotation: 360, repeat: -1, ease: "none", duration: 1});
  };
  if (c.conditions.isLarge) {
    gsap.set(".small", { display: "none"});
    gsap.from(".large", { scale: 0, ease: "back.out"});
    gsap.to(".large img", { rotation: -360, repeat: -1, ease: "none", duration: 1})
  };
})
















// Alternative syntax

// mm.add("(max-width: 800px)", () => {
//   gsap.set(".large", { display: "none"});
//     gsap.from(".small", { scale: 0, ease: "back.out"});
//    gsap.to(".small img", { rotation: 360, repeat: -1, ease: "none", duration: 1});
// });

// mm.add("(min-width: 801px)", () => {
//  gsap.set(".small", { display: "none"});
//    gsap.from(".large", { scale: 0, ease: "back.out"});
//   gsap.to(".large img", { rotation: -360, repeat: -1, ease: "none", duration: 1})
// });