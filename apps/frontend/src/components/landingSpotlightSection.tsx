'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { useLanguage, useTranslation } from '@/contexts/LanguageContext';
import { getStableViewportHeight } from '@/utils/viewport';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type LandingSpotlightSlide = {
  stat: string;
  featureTitle: string;
  description: string;
  videoSrc: string;
  videoLabel: string;
  scribbleMain?: string;
  scribbleSub?: string;
};

const SPOTLIGHT_BASE = 'homepage.studio.spotlight';

function parseSlides(raw: unknown): LandingSpotlightSlide[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: LandingSpotlightSlide[] = [];
  for (const x of raw) {
    if (
      x !== null &&
      typeof x === 'object' &&
      'stat' in x &&
      'featureTitle' in x &&
      'description' in x &&
      'videoSrc' in x &&
      'videoLabel' in x
    ) {
      const s = x as LandingSpotlightSlide;
      if (
        typeof s.stat === 'string' &&
        typeof s.featureTitle === 'string' &&
        typeof s.description === 'string' &&
        typeof s.videoSrc === 'string' &&
        typeof s.videoLabel === 'string'
      ) {
        out.push({
          stat: s.stat,
          featureTitle: s.featureTitle,
          description: s.description,
          videoSrc: s.videoSrc,
          videoLabel: s.videoLabel,
          scribbleMain: s.scribbleMain,
          scribbleSub: s.scribbleSub,
        });
      }
    }
  }
  return out;
}

const SPOTLIGHT_COLORS = ['#F15942', '#C2F600', '#FF7EE9', '#FFFFFF'] as const;

function scribbleStrokesForSlideIndex(idx: number): {
  main: string;
  sub: string;
} {
  const color = SPOTLIGHT_COLORS[idx % SPOTLIGHT_COLORS.length] ?? '#FFFFFF';
  return { main: color, sub: color };
}

const FAN_DEG_PER_SLOT = 32;
const FAN_MAX_DEG = 96;
const FAN_ORIGIN_X = '260%';
const FAN_ORIGIN_Y = '50%';
let spotlightRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const CARD_TINT_RAMP_END = 0.72;

function cardBackTintOpacity(depthAway: number): number {
  if (depthAway <= 0) {
    return 0;
  }
  if (depthAway >= CARD_TINT_RAMP_END) {
    return 1;
  }
  const t = depthAway / CARD_TINT_RAMP_END;
  // smoothstep — мягкий вход в сплошной цвет
  return t * t * (3 - 2 * t);
}

function scheduleSpotlightLayoutRefresh() {
  if (typeof window === 'undefined') {
    return;
  }
  if (spotlightRefreshTimer !== null) {
    clearTimeout(spotlightRefreshTimer);
  }
  spotlightRefreshTimer = setTimeout(() => {
    spotlightRefreshTimer = null;
    ScrollTrigger.refresh();
  }, 300);
}

function SpotlightLoopVideo({
  src,
  label,
  className,
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const didScheduleRefreshRef = useRef(false);

  setTimeout(() => {
    ScrollTrigger.refresh();
  }, 3000);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.muted = true;
    el.loop = true;
    const p = el.play();
    if (p !== undefined) {
      p.catch(() => {
        /* autoplay policies — ignore */
      });
    }
  }, [src]);

  useEffect(() => {
    didScheduleRefreshRef.current = false;
  }, [src]);

  const handleVideoReady = () => {
    // One refresh per source is enough to recalc pinned sections.
    if (didScheduleRefreshRef.current) {
      return;
    }
    didScheduleRefreshRef.current = true;
    scheduleSpotlightLayoutRefresh();
  };

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      autoPlay
      muted
      playsInline
      loop
      preload="auto"
      aria-label={label}
      onLoadedMetadata={handleVideoReady}
      onCanPlay={handleVideoReady}
    />
  );
}

function StatScribbleOval({
  className,
  strokeMain,
  strokeSub,
}: {
  className?: string;
  strokeMain: string;
  strokeSub: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) {
      return;
    }

    const length = path.getTotalLength();
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
      fillOpacity: 0,
    });

    const tl = gsap.timeline();
    tl.to(path, {
      strokeDashoffset: 0,
      duration: 0.7,
      ease: 'power2.out',
    });

    return () => {
      tl.kill();
    };
  }, [strokeMain, strokeSub]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 279 114"
      fill="none"
    >
      <path
        ref={pathRef}
        d="M210.102 2.62755C205.528 2.61423 199.456 2.6441 194.858 2.70829C193.43 2.7279 194.153 2.62719 193.163 2.63781C191.235 2.65922 189.353 2.76321 187.472 2.79712C186.841 2.80797 187.623 2.63968 186.961 2.65372C183.327 2.7315 179.827 2.93594 176.146 3.11843C157.885 4.03134 140.003 5.79853 121.732 8.56754C115.699 9.48197 108.375 10.5778 102.224 11.9171C101.504 12.0738 101.973 12.178 101.839 12.2217C99.7385 12.9055 100.375 12.3715 98.9657 12.6127C93.3786 13.5739 87.2057 14.9975 81.9485 16.4681C79.7266 17.0933 82.0698 16.891 79.764 17.2738C79.6014 17.3018 80.1199 16.9337 79.492 17.0798C78.0645 17.4096 75.433 18.1948 74.3641 18.4919C72.3056 19.0601 71.956 19.1678 69.9904 19.7717C67.31 20.5973 64.1644 21.5137 61.3324 22.5733C60.7357 22.7978 61.6068 22.7341 60.6654 23.113C59.7209 23.4893 57.2298 24.396 56.3359 24.6867C55.4623 24.9655 55.7595 24.6531 55.5932 24.6722C54.2104 24.8185 51.5436 26.4496 51.1982 26.6162C44.5319 29.6773 38.8121 32.2241 33.0864 35.859C28.7307 38.6361 24.4934 42.0499 21.1617 45.5476C21.1346 45.5758 21.1076 45.6041 21.0807 45.6323C17.1172 49.8366 14.2787 53.9531 12.7202 59.2587C12.5639 59.8195 13.0175 59.2411 12.8352 59.9221C12.2596 62.1385 11.9748 64.3569 11.9686 66.6694C11.9334 71.7263 14.6724 76.2814 18.3953 80.0504C18.9174 80.5771 18.0515 80.0943 18.5705 80.6336C21.9101 84.202 28.1422 88.4167 31.1693 88.7097C34.1842 90.3222 37.4703 91.8168 40.2361 93.1521C41.9821 93.9899 40.1705 93.5744 42.314 94.2752C42.7975 94.4304 42.2628 93.978 42.9826 94.2264C45.9903 95.2648 49.5642 96.5366 52.5814 97.3226C53.215 97.4883 53.105 97.235 53.2936 97.2523C54.8674 97.4103 57.2874 98.6166 57.85 98.8051C61.9091 100.194 65.0582 100.847 69.0409 101.742C69.9431 101.942 68.9362 101.433 69.807 101.616C74.3193 102.563 79.2148 103.521 83.6598 104.392C84.6643 104.589 83.6968 104.669 84.1754 104.775C86.2928 105.235 86.8404 104.867 88.8984 105.28C89.3335 105.366 89.0565 105.53 89.1332 105.564C90.298 106.094 91.4309 105.755 91.7468 105.789C95.7343 106.203 98.3213 107.052 102.19 107.421C102.653 107.464 101.639 107.093 102.94 107.228C111.655 108.133 120.932 108.908 129.576 109.488C130.924 109.578 129.953 109.725 130.037 109.752C131.407 110.176 132.325 109.72 132.766 109.718C136.255 109.714 139.48 110.191 141.852 109.646C156.57 110.055 171.204 109.191 185.763 108.204C185.949 108.19 185.641 108.456 186.012 108.428C190.475 108.08 189.579 107.807 192.429 107.02C193.134 106.824 195.453 107.052 195.664 107.06C196.413 107.102 195.703 107.545 195.951 107.539C198.002 107.472 197.519 106.401 200.206 105.997C200.29 105.986 199.969 106.246 200.197 106.232C200.908 106.189 201.586 105.999 202.278 105.96C203.87 105.869 204.463 106.33 206.858 105.581C207.155 105.484 206.585 104.948 208.991 104.53C209.959 104.371 214.127 103.519 215.274 103.3C216.462 103.082 215.696 103.458 215.781 103.449C219.052 102.992 217.856 103.372 219.544 103.384C221.224 103.386 220.558 102.574 221.173 102.314C221.792 102.056 224.116 101.683 224.684 101.605C225.256 101.53 224.601 101.84 225.103 101.749C228.524 101.098 226.45 100.892 227.51 100.439C230.004 99.3543 232.172 99.4023 234.459 98.7046C235.079 98.5137 234.512 98.5406 235.077 98.332C237.316 97.4994 238.726 97.2154 241.091 96.0706C241.496 95.8775 243.211 94.738 244.671 94.4226C244.871 94.3815 244.42 94.7679 245.361 94.393C246.771 93.8359 249.191 92.7189 250.533 91.9511C251.534 91.3806 250.211 91.7634 251.571 91.1399C252.185 90.8527 251.159 91.5928 252.305 91.0384C253.458 90.4932 256.162 88.8777 257.121 88.2303C258.093 87.5902 257.443 87.7629 257.514 87.6998C257.903 87.3619 259.818 85.9009 259.957 85.7857C266.843 80.7304 272.641 74.5654 275.086 66.5532C275.533 65.0812 275.831 63.6394 275.978 62.2277C276.049 61.4842 275.784 61.9582 275.793 61.8445C275.874 59.3444 276.34 61.3706 276.557 59.4929C276.117 59.7738 276.253 58.6445 275.937 56.8308C275.771 55.9618 275.684 56.4675 275.655 56.3902C275.183 55.1743 275.216 54.2356 275.209 53.9848C275.182 53.0735 274.554 52.2855 274.454 51.6759C274.341 51.0572 275.173 52.2308 274.366 50.5802C273.997 50.1967 274.263 51.5687 273.571 50.3863C271.238 45.8545 263.959 39.588 260.201 37.4985C256.732 35.4082 255.498 34.8814 253.258 33.7409C249.39 31.8672 250.729 32.7941 248.185 31.8627C245.587 30.9561 247.072 30.8148 246.759 30.5291C246.444 30.2477 245.985 30.2343 245.548 29.9826C245.112 29.7318 246.156 30.0159 245.07 29.5767C244.075 29.1644 241.125 28.4137 240.69 28.4359C239.784 28.4781 241.011 29.2321 238.195 28.1895C238.032 28.1298 238.624 28.1315 237.995 27.9115C233.102 26.205 227.755 24.7652 222.857 23.4893C222.172 23.311 222.833 23.2676 222.434 23.1619C218.246 22.074 219.674 22.7395 217.252 22.5767C217.901 22.2302 216.575 21.6315 213.439 21.0007C211.521 20.6189 211.809 20.8881 210.531 20.7899C210.148 20.7604 208.795 20.3632 208.525 20.4124C207.637 20.5716 208.893 21.1518 205.537 20.4067C205.389 20.3738 205.893 20.2885 205.38 20.1873C202.125 19.5518 201.727 19.815 198.175 19.2857C195.371 18.867 190.459 17.9538 187.306 17.5092C187.442 17.0136 184.42 16.7389 183.146 16.932C181.044 16.6558 178.863 16.4173 176.874 16.1454C176.191 16.0523 176.657 15.9603 176.572 15.9352C175.274 15.5457 174.338 15.7791 173.891 15.7436C169.008 15.3465 165.128 14.7297 160.475 14.5649C160.31 14.5595 160.016 14.8661 158.797 14.5199C158.718 14.4968 160.263 14.4748 158.082 14.2806C155.881 14.0836 151.828 13.5946 148.786 13.5344C148.051 13.5191 146.183 13.6513 144.708 13.3515C144.511 13.3111 144.734 13.2335 144.451 13.1641C143.535 12.9426 143.011 13.2322 141.942 12.8926C140.873 12.5533 138.624 12.2176 135.56 12.2424C135.463 12.2428 134.727 12.4545 133.767 12.4011C132.236 12.3155 130.065 12.159 128.458 12.0886C127.689 12.0549 128.174 12.2296 128.041 12.2264C122.862 12.0811 119.26 11.8086 113.69 11.5841C112.674 11.5431 109.757 11.6597 107.811 11.4582C105.663 11.2401 107.929 10.5759 102.934 10.6535C100.92 10.6895 98.3677 11.5202 94.8141 11.0301C87.8033 11.0661 81.4797 10.8394 74.4078 11.0503C74.0942 11.0597 73.1077 11.2937 72.3773 11.2977C71.2926 11.3034 70.7 11.2061 69.932 11.2089C66.6428 11.2197 63.5692 11.3608 60.4683 11.4143C59.2891 11.4355 59.6966 11.3224 58.3002 11.3502C56.8565 11.3805 55.8614 11.54 53.9113 11.5307C52.438 11.5236 50.9708 11.2988 49.0718 11.3351C49.001 11.6023 47.7426 11.6379 45.2824 11.8007C44.8184 11.8319 45.3199 11.9031 45.1007 11.9225C44.209 12.003 43.3875 11.961 42.5578 12.0455C42.356 12.0659 42.3502 12.154 42.1859 12.1755C40.7831 12.3608 38.5236 12.2657 38.1432 12.2509C36.5883 12.1959 35.8294 12.3458 34.6451 12.3565C33.461 12.3685 35.2225 12.2138 33.8436 12.2565C31.03 12.3434 27.422 12.5744 24.4964 12.7738C23.3611 12.8517 24.1432 12.9058 23.9807 12.9194C21.7176 13.1023 19.2309 13.1847 17.9068 13.5058C16.192 13.1107 16.551 13.6628 13.1645 13.8746C12.8811 13.8936 12.4882 13.681 13.5856 13.5366C14.6305 13.3978 16.032 13.348 17.4737 13.1668C17.7991 13.1244 19.7676 12.7201 20.0547 12.6831C22.1905 12.3975 22.3742 12.779 22.5105 12.7899C23.7071 12.9336 26.0578 12.508 26.7037 12.4471C29.7767 12.1606 31.8523 12.0974 34.3147 11.9007C35.8891 11.7758 36.036 11.496 37.3037 11.4387C41.3026 11.263 42.6732 11.5977 46.5948 11.0985C47.4216 10.9937 46.651 10.7084 49.5149 10.8468C49.6938 10.8547 51.8505 11.0063 53.1147 10.8218C53.273 10.7984 53.2652 10.7057 53.4748 10.6911C54.8814 10.595 55.8312 10.6404 57.3958 10.5601C58.95 10.4802 60.6968 10.3794 62.4434 10.371C63.4873 10.3656 64.8439 10.5175 65.352 10.5523C66.7823 10.6523 68.338 10.415 69.2319 10.5575C70.1028 10.7025 68.4051 10.9648 70.6884 11.037C70.77 10.7787 70.9617 10.5118 71.0952 10.2507C76.1087 10.1847 81.2637 10.2333 86.2976 10.222C86.9309 10.2203 86.2834 10.0743 86.963 10.0687C89.8193 10.0457 92.4139 10.1624 95.3274 10.1439C97.6121 10.1294 100.138 9.99721 102.562 9.99149C104.052 10.3388 107.6 10.2919 110.188 10.3823C111.095 10.4138 111.032 10.5018 111.677 10.5468C114.114 10.717 112.98 10.3913 113.65 10.3615C116.528 10.2375 116.779 10.9222 120.137 11.0185C120.314 11.0238 122.512 10.7333 122.815 10.7213C124.734 10.6413 123.126 10.8608 124.323 10.933C126.51 11.0665 128.028 11.2184 130.607 11.2237C131.356 11.2248 133.161 11.0713 134.605 11.3259C134.795 11.3593 134.683 11.4795 134.836 11.4946C137.613 11.7588 137.708 11.3689 139.308 11.3187C140.909 11.2685 143.348 11.6884 143.845 11.8002C145.143 12.0874 142.835 11.8278 142.764 11.8448C141.917 12.0371 143.711 12.1011 145.082 12.2082C145.255 12.6164 147.172 12.7179 146.502 12.3184C146.425 12.2745 145.356 12.2434 145.082 12.2082C146.31 11.895 148.424 11.9753 150.719 12.5056C151.792 12.7558 150.753 12.8801 154.053 13.0502C155.549 13.1297 154.992 12.8063 156.318 12.8313C159.372 12.8894 163.281 13.4833 166.38 13.7294C167.505 13.8182 166.425 13.5599 167.194 13.6153C169.218 13.7605 171.058 14.0601 173.119 14.2103C173.307 14.2237 172.868 14.0106 173.509 14.0743C178.361 14.5568 182.543 15.1437 187.617 15.8023C190.057 16.1161 194.371 16.6183 196.942 17.0289C201.334 17.7155 206.582 18.8659 210.356 19.5151C212.78 19.9319 212.28 19.6564 213.332 19.7349C215.318 19.8726 218.835 21.0556 219.294 21.23C219.311 21.2343 217.195 20.825 218.299 21.1574C218.911 21.4887 219.27 21.2258 219.294 21.23C219.612 21.3355 223.732 22.313 224.531 22.4778C224.972 22.5639 224.769 22.3351 224.998 22.3832C230.626 23.5831 235.968 25.0022 241.56 26.967C241.655 27.0028 241.446 27.1449 241.669 27.2268C244.734 28.3649 246.869 28.9014 249.524 29.8195C252.156 30.7382 254.014 31.6491 255.441 32.7387C257.429 33.6503 259.845 35.1495 261.321 36.1698C262.805 37.1922 263.207 36.9958 263.347 37.073C267.379 39.4947 269.626 41.5161 272.837 45.4081C274.451 47.2738 276.901 51.5255 277.54 54.1943C278.109 56.245 278.172 57.5278 278.288 59.5221C278.3 59.7935 278.484 59.5172 278.493 59.6002C278.69 61.8915 278.231 60.7424 278.138 61.1953C277.715 62.7419 277.511 63.6347 276.929 66.4167C276.895 66.5706 276.874 66.8038 276.854 67.089C276.812 67.9414 276.758 69.2869 276.446 70.1214C275.902 71.5368 275.92 70.9179 275.287 72.3679C275.229 72.4903 275.384 72.5358 274.917 73.4021C272.775 77.354 269.585 81.0816 266.124 84.2279C265.646 84.6609 266.419 84.2907 265.732 84.9114C262.661 87.6845 258.694 90.4045 255.129 92.3241C254.23 92.8087 254.701 92.3411 254.484 92.4075C253.148 92.8226 251.657 94.1087 251.407 94.2448C244.892 97.8058 239.326 99.5162 232.268 101.995C231.893 102.133 229 103.533 227.491 103.516C227.39 103.517 225.895 103.492 224.824 104.083C224.755 104.12 225.639 104.115 224.191 104.477C222.743 104.839 220.419 105.578 218.308 105.814C217.645 105.89 215.985 105.826 214.19 106.56C214.078 106.612 211.284 107.99 210.109 107.66C209.917 107.604 210 107.012 207.734 107.731C207.299 107.869 208.131 107.848 206.971 108.14C205.148 108.594 202.869 108.823 200.702 109.42C200.329 109.525 198.756 110.164 197.394 110.056C197.181 110.039 197.547 109.792 196.847 109.869C193.475 110.24 190.164 110.781 186.769 111.011C185.573 111.09 186.15 110.713 184.899 110.756C183.633 110.802 181.163 110.951 179.889 111.205C178.613 111.459 180.065 111.845 178.132 112.046C169.664 112.913 161.288 112.994 152.862 113.072C151.609 113.082 152.65 113.255 150.803 113.278C143.993 113.395 132.226 113.303 126.356 112.574C121.666 112.009 127.599 112.082 124.015 111.759C122.282 111.6 120.348 112.086 119.927 112.078C115.788 111.998 113.026 111.504 109.29 111.247C108.523 111.193 109.251 111.51 108.598 111.461C106.369 111.296 104.057 110.946 101.959 110.732C101.017 110.637 101.169 110.845 100.307 110.731C98.215 110.456 96.3547 110.144 94.3518 109.698C94.1693 109.658 95.4466 109.587 93.9094 109.374C91.4176 109.027 88.4199 108.416 85.4806 108.132C84.6204 108.049 84.5114 108.479 82.741 107.877C82.3714 107.749 82.9408 107.316 80.76 107.4C80.395 107.417 76.7672 107.392 75.0506 106.648C74.6051 106.456 73.5093 105.799 72.4857 105.659C72.3464 105.642 72.8482 105.986 72.0058 105.837C69.0601 105.31 65.9794 104.6 62.9063 103.928C62.0939 103.751 63.2376 104.284 62.0297 104.01C58.7668 103.275 54.5913 102.074 51.4417 101.032C50.2855 100.65 51.1504 100.7 51.0719 100.653C49.8212 99.8924 48.8919 100.104 48.4401 99.9893C45.4792 99.2103 43.3863 98.2305 40.8627 97.3397C40.1676 97.0916 40.5728 97.4958 40.4282 97.4628C38.9334 97.1028 40.1598 97.1299 39.2288 96.7153C36.5639 95.5221 33.8357 94.3567 31.2532 93.1284C30.2818 92.6632 31.2466 93.4415 30.3784 93.0189C25.3547 90.5477 20.4869 87.6017 16.2832 83.5533C15.5399 82.8203 16.1642 83.1165 16.039 82.9336C15.2409 81.7473 13.3349 80.2821 12.9852 79.8896C11.3409 78.1158 11.0228 77.2976 9.94711 75.3211C8.64934 72.8482 7.76019 69.856 7.7576 66.6694C7.56382 58.2609 11.882 49.9982 16.4576 44.8933C17.0683 44.1849 17.7311 43.4656 18.3303 42.8499C26.0046 35.1831 33.7362 30.9078 43.0107 26.3181C43.6652 26.0035 42.8929 26.0651 43.439 25.8C50.6 22.3589 57.9055 19.7399 65.4293 17.2443C66.0408 17.0432 65.0774 17.0833 66.0587 16.7533C68.0563 16.0792 70.7399 15.2891 72.7838 14.791C73.7991 14.5419 72.5113 15.1315 73.5322 14.8769C75.8965 14.2896 78.5266 13.6001 80.9165 12.9511C81.9489 12.6711 80.3202 12.824 81.6691 12.4803C90.912 10.1324 100.071 8.23395 109.575 6.91821C110.229 6.8285 110.88 7.19425 112.248 6.87544C112.329 6.73026 112.298 6.5806 112.319 6.43635C125.938 4.13875 139.554 2.70617 153.34 1.63034C153.92 1.58582 152.9 1.45908 154.022 1.37324C160.551 0.876028 166.896 0.462356 173.567 0.374469C174.234 0.365884 173.912 0.690516 175.867 0.567115C176.214 0.54316 179.143 0.401073 179.89 0.317246C179.992 0.304743 179.456 0.179364 180.393 0.14992C185.945 -0.0215298 191.721 -0.0439148 197.186 0.0725762C198.087 0.0915929 197.129 0.209712 197.77 0.223932C202.265 0.318274 207.184 0.349391 211.39 0.623751C214.307 0.811457 213.217 0.945205 214.739 1.18304C214.956 1.21563 216.71 1.30322 216.792 1.40455C217.012 1.65619 216.157 1.88699 216.491 2.16045C216.548 2.20492 217.944 2.23162 217.94 2.27916C217.94 2.27917 217.94 2.27918 217.94 2.27919C217.939 2.29306 217.818 2.30828 217.505 2.32699C217.412 2.33124 215.723 2.31859 215.297 2.3547C215.003 2.37893 215.527 2.49313 214.928 2.51922C214.327 2.54636 213.671 2.44482 212.66 2.4756C211.663 2.50996 212.041 2.63174 210.102 2.62755ZM267.464 41.0489C268.584 42.2672 269.249 41.895 267.775 40.8506C267.702 40.8011 267.405 40.9865 267.464 41.0489ZM81.2 10.6039C83.2287 10.8072 84.633 10.4974 83.1909 10.3369C81.7513 10.1789 80.5827 10.5434 81.2 10.6039ZM59.8185 11.0422C62.1925 11.1416 62.5569 10.5033 60.015 10.6923C59.8678 10.7032 59.6802 11.0366 59.8185 11.0422ZM207.682 0.993805C207.704 0.999085 208.972 1.03676 209.001 1.03301C209.679 0.929615 207.144 0.849438 207.682 0.993805ZM38.6603 11.9312C39.3837 11.9743 41.5067 11.7896 40.5851 11.7333C39.8376 11.6881 37.7523 11.8779 38.6603 11.9312ZM234.644 99.0515C234.618 99.0485 233.767 99.3217 233.805 99.3793C233.932 99.5658 235.091 99.111 234.644 99.0515ZM2.73516 14.9924C7.76966 14.2027 11.5482 14.2546 5.44342 14.9585C4.38622 15.0927 7.72399 14.5232 6.35335 14.6678C5.0768 14.8029 4.19498 14.9807 3.25262 15.1711C2.0787 15.4012 1.03831 15.6228 0.0373193 15.7922C-0.137862 15.8228 0.32423 15.6392 0.998518 15.4379C1.66059 15.2369 2.56659 15.0192 2.7456 14.9901C2.74215 14.9908 2.73859 14.9916 2.73516 14.9924ZM267.612 42.3176C267.635 42.3443 268.568 43.2073 268.591 43.2228C269.259 43.5229 267.372 41.772 267.612 42.3176ZM182.402 108.761C182.333 108.747 179.432 108.982 179.337 109.008C177.859 109.573 183.734 109.101 182.402 108.761ZM187.258 17.4892C185.867 17.5053 184.222 17.3165 183.152 16.9331C184.522 17.117 185.895 17.2957 187.258 17.4892Z"
        fill={strokeMain}
        stroke={strokeSub}
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        paintOrder="stroke fill"
      />
    </svg>
  );
}

export function LandingSpotlightSection() {
  const { language } = useLanguage();
  const t = useTranslation();
  const headingLine1 = String(t(`${SPOTLIGHT_BASE}.headingLine1`));
  const line2BeforeAccent = String(t(`${SPOTLIGHT_BASE}.line2BeforeAccent`));
  const line2Accent = String(t(`${SPOTLIGHT_BASE}.line2Accent`));
  const slides = useMemo(
    () => parseSlides(t(`${SPOTLIGHT_BASE}.slides`)).reverse(),
    [language, t],
  );

  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const leftCopyRef = useRef<HTMLDivElement>(null);
  const mobilePinRef = useRef<HTMLDivElement>(null);
  const mobileCardsRef = useRef<HTMLDivElement>(null);
  const mobileCopyRef = useRef<HTMLDivElement>(null);

  const slide = slides[active] ?? slides[0];

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || slides.length === 0) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    let lastIdx = -1;
    const n = slides.length;

    function clamp(v: number, min: number, max: number) {
      return Math.min(max, Math.max(min, v));
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add('(min-width: 768px)', () => {
        const pin = pinRef.current;
        const clipEl = clipRef.current;
        if (!pin || !clipEl) return;

        const applyFan = (progress: number) => {
          const cards = clipEl.querySelectorAll<HTMLElement>('[data-fan-card]');
          if (cards.length === 0) return;

          const focus = progress * (n - 1);
          cards.forEach((el, j) => {
            const delta = j - focus;
            const rot = clamp(
              delta * FAN_DEG_PER_SLOT,
              -FAN_MAX_DEG,
              FAN_MAX_DEG,
            );
            gsap.set(el, {
              rotation: rot,
              opacity: 1,
              scale: 1,
              transformOrigin: `${FAN_ORIGIN_X} ${FAN_ORIGIN_Y}`,
              force3D: true,
              zIndex: Math.round(100 - Math.abs(delta) * 10),
            });
          });
        };

        ScrollTrigger.create({
          trigger: pin,
          start: 'top top',
          end: () =>
            `+=${Math.round(getStableViewportHeight() * Math.max(1.25, n * 0.5))}`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self: ScrollTrigger) => {
            const reversedProgress = 1 - self.progress;
            applyFan(reversedProgress);
            const rawIdx = Math.floor((1 - reversedProgress) * n);
            const idx = Math.min(n - 1, rawIdx);
            if (idx !== lastIdx) {
              lastIdx = idx;
              setActive(idx);
            }
          },
        });

        applyFan(1);
      });

      mm.add('(max-width: 767px)', () => {
        const mobilePin = mobilePinRef.current;
        const mobileCards = mobileCardsRef.current;
        if (!mobilePin || !mobileCards) return;

        const cards =
          mobileCards.querySelectorAll<HTMLElement>('[data-mobile-card]');
        if (cards.length === 0) return;

        gsap.set(cards, { y: 40, opacity: 0, scale: 1, force3D: true });
        gsap.set(cards[0], { y: 10, opacity: 1, scale: 1 });

        ScrollTrigger.create({
          trigger: mobilePin,
          start: 'top top',
          end: () =>
            `+=${Math.round(getStableViewportHeight() * Math.max(1.45, n * 0.78))}`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self: ScrollTrigger) => {
            const rawFocus = self.progress * Math.max(0.0001, n - 1);
            const baseIdx = clamp(Math.floor(rawFocus), 0, n - 1);
            const seg = rawFocus - baseIdx;
            // Fast entry, then short hold per slide to improve readability.
            const enterP = seg < 0.24 ? seg / 0.24 : 1;
            const focus = clamp(baseIdx + enterP, 0, n - 1);
            const idx = clamp(Math.round(focus), 0, n - 1);
            if (idx !== lastIdx) {
              lastIdx = idx;
              setActive(idx);
            }

            cards.forEach((el, j) => {
              let y = 40;
              let opacity = 0;
              let scale = 0.96;
              let tintOpacity = 0;
              const depth = focus - j;

              if (depth >= 0) {
                // Already shown cards move up smoothly and shrink per depth.
                y = 10 - depth * 30;
                scale = 1 - depth * 0.12;
                scale = clamp(scale, 0.3, 1.2);
                opacity = 1;
                tintOpacity = cardBackTintOpacity(depth);
              } else if (depth > -1) {
                // Next card enters smoothly from below and fades in quickly.
                const p = 1 + depth; // -1..0 => 0..1
                const fastFade = Math.pow(p, 0.6);
                y = 40 - 30 * p;
                opacity = fastFade;
                scale = 0.96 + 0.04 * p;
              }

              const tint = el.querySelector<HTMLElement>('[data-card-tint]');
              gsap.set(el, {
                y,
                scale,
                opacity,
                zIndex: 100 + j,
                force3D: true,
              });
              if (tint) {
                gsap.set(tint, { opacity: tintOpacity });
              }
            });
          },
        });
      });

      return () => {
        mm.revert();
      };
    }, sectionRef);

    let orientationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const onOrientationChange = () => {
      if (orientationRefreshTimer !== null) {
        clearTimeout(orientationRefreshTimer);
      }
      orientationRefreshTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 140);
    };
    window.addEventListener('orientationchange', onOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', onOrientationChange);
      if (orientationRefreshTimer !== null) {
        clearTimeout(orientationRefreshTimer);
      }
      ctx.revert();
    };
  }, [slides.length, slides]);

  useEffect(() => {
    if (slides.length === 0) {
      return;
    }
    const targets: Element[] = [];
    if (leftCopyRef.current) {
      targets.push(...leftCopyRef.current.querySelectorAll('h3, p'));
    }
    if (mobileCopyRef.current) {
      targets.push(...mobileCopyRef.current.querySelectorAll('h3, p'));
    }
    if (targets.length === 0) {
      return;
    }
    const tw = gsap.fromTo(
      targets,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.42,
        ease: 'power2.out',
        stagger: 0.05,
      },
    );
    return () => {
      tw.kill();
    };
  }, [active, slides.length]);

  if (!slide || slides.length === 0) {
    return null;
  }

  const scribble = scribbleStrokesForSlideIndex(active);

  return (
    <section
      ref={sectionRef}
      id="benefits"
      className="relative bg-[#3F3287]"
      aria-labelledby="landing-spotlight-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 md:pt-16">
        <div className="text-center">
          <h2
            id="landing-spotlight-heading"
            className="text-[2.4rem] sm:text-[4.4rem] text-white"
          >
            {headingLine1}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-2xl leading-snug text-[#C6FF00] sm:text-[2.2rem]">
            <span>{line2BeforeAccent}</span>
            <span className="relative inline-block whitespace-nowrap px-0.5">
              {line2Accent}
              <ChaoticUnderline
                color="#FFFFFF"
                className="pointer-events-none absolute -bottom-0.5 left-0 w-[105%] max-w-none -translate-x-[2%]"
              />
            </span>
          </p>
        </div>
      </div>

      <div
        ref={pinRef}
        className="mx-auto hidden w-full max-w-7xl min-h-[100svh] items-center  px-4 sm:px-6 md:flex md:h-[100svh] md:min-h-0"
      >
        <div className="grid w-full translate-y-6 grid-cols-1  items-start gap-10 md:translate-y-6 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div className="mt-6 text-left md:mt-12">
            <div ref={leftCopyRef}>
              <div className="relative inline-flex min-h-[4.5rem] text-center min-w-[15rem] items-center justify-center px-2 py-1 sm:min-h-[5rem]">
                <StatScribbleOval
                  key={slide.stat}
                  strokeMain={scribble.main}
                  strokeSub={scribble.sub}
                  className="pointer-events-none absolute inset-[-1rem] aspect-[3/1.2] w-[calc(100%+2rem)] max-w-[min(100vw,280px)] -translate-x-2 sm:w-[calc(100%+10rem)] sm:translate-x-0"
                />
                <span className="relative z-10 text-[2.75rem]  font-medium leading-none tracking-tight text-white sm:text-5xl md:text-[5rem]">
                  {slide.stat}
                </span>
              </div>

              <h3 className="mt-6 text-[1.5rem] leading-[1.1] font-semibold text-white md:text-[2.5rem]">
                {slide.featureTitle}
              </h3>
              <p className="mt-3 max-w-md text-[1rem] leading-[1.2]min-h-[4.5rem] text-white/90 md:text-[1.2rem]">
                {slide.description}
              </p>
            </div>

            <div className="mt-8 flex gap-2.5" role="group">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-[transform,opacity,box-shadow] duration-300 ${
                    i === active
                      ? 'scale-125 opacity-100'
                      : 'scale-100 opacity-45'
                  }`}
                  style={{
                    backgroundColor:
                      SPOTLIGHT_COLORS[i % SPOTLIGHT_COLORS.length] ??
                      '#FFFFFF',
                    boxShadow:
                      i === active
                        ? `0 0 0 2px ${SPOTLIGHT_COLORS[i % SPOTLIGHT_COLORS.length]}59`
                        : 'none',
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <div
            ref={clipRef}
            className="relative mx-auto mt-8 aspect-[4/3] w-full xl:w-[110%] md:mt-12"
            style={{ overflow: 'visible' }}
          >
            {slides.map((s, i) => (
              <div
                key={s.videoSrc}
                data-fan-card
                className="absolute inset-0 w-full overflow-hidden rounded-[2rem] sm:rounded-[2.25rem] md:rounded-[2.5rem] will-change-transform"
                style={{
                  // Initial stacking — GSAP will take over on mount
                  zIndex: slides.length - i,
                }}
              >
                <SpotlightLoopVideo
                  src={s.videoSrc}
                  label={s.videoLabel}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={mobilePinRef}
        className="mx-auto w-full max-w-md overflow-hidden px-4 pb-12 sm:hidden"
      >
        <div className="flex h-[100svh] flex-col items-center pt-12 justify-center gap-4 sm:py-3">
          <div
            ref={mobileCardsRef}
            className="relative mx-auto mt-1 aspect-[4/3] w-[92%]"
            style={{ overflow: 'visible' }}
          >
            {slides.map((s, i) => (
              <div
                key={`${s.videoSrc}-mobile`}
                data-mobile-card
                className="absolute inset-0 w-full overflow-hidden rounded-[2rem] will-change-transform"
                style={{ zIndex: slides.length - i }}
              >
                <SpotlightLoopVideo
                  src={s.videoSrc}
                  label={s.videoLabel}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div
                  data-card-tint
                  className="pointer-events-none absolute inset-0 z-10 opacity-0"
                  style={{
                    backgroundColor:
                      SPOTLIGHT_COLORS[i % SPOTLIGHT_COLORS.length] ??
                      '#FFFFFF',
                  }}
                  aria-hidden
                />
              </div>
            ))}
          </div>

          <div
            ref={mobileCopyRef}
            className="mt-15 sm:mt-3 text-left w-full min-h-[270px] flex flex-col"
          >
            <div className="relative inline-flex min-h-[3.6rem] min-w-[10rem] items-center justify-center w-fit px-2 py-1">
              <StatScribbleOval
                key={`mobile-${slide.stat}`}
                strokeMain={scribble.main}
                strokeSub={scribble.sub}
                className="pointer-events-none absolute inset-[-0.8rem] aspect-[3/1.2] w-[calc(100%+1.6rem)] max-w-[240px]"
              />
              <span className="relative z-10 text-[2.4rem] font-medium leading-none tracking-tight text-white">
                {slide.stat}
              </span>
            </div>
            <h3 className="mt-3 text-[1.5rem] leading-[1.08] font-semibold text-white">
              {slide.featureTitle}
            </h3>
            <p className="mt-3 min-h-[3.5rem] text-[1.2rem] leading-[1.3] text-white/90">
              {slide.description}
            </p>
            <div
              className="mt-auto sm:mt-5 flex justify-center gap-2.5"
              role="group"
            >
              {slides.map((_, i) => (
                <span
                  key={`mobile-dot-${i}`}
                  className={`h-2.5 w-2.5 rounded-full transition-[transform,opacity,box-shadow] duration-300 ${
                    i === active
                      ? 'scale-125 opacity-100'
                      : 'scale-100 opacity-45'
                  }`}
                  style={{
                    backgroundColor:
                      SPOTLIGHT_COLORS[i % SPOTLIGHT_COLORS.length] ??
                      '#FFFFFF',
                    boxShadow:
                      i === active
                        ? `0 0 0 2px ${SPOTLIGHT_COLORS[i % SPOTLIGHT_COLORS.length]}59`
                        : 'none',
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
