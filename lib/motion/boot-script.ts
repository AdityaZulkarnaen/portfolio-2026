/** Shared by the client store and the server-rendered pre-paint script. */
export const MOTION_STORAGE_KEY = "az:motion";

/** Pre-paint mirror of `syncDom()` + the preloader quick path, for the layout's inline script. */
export const MOTION_BOOT_SCRIPT = `(function(){try{var r=document.documentElement;var red=matchMedia("(prefers-reduced-motion: reduce)").matches;var p=localStorage.getItem("${MOTION_STORAGE_KEY}")==="paused";r.dataset.motion=(red||p)?"off":"on";if(p)r.dataset.motionPaused="true";if(red){r.dataset.preload="skip"}else if(sessionStorage.getItem("az:seen")==="1"){r.dataset.preload="quick"}}catch(e){}})();`;
