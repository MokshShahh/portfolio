import React, { useRef, useEffect, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const Shuffle = ({
  text,
  className = '',
  style = {},
  shuffleDirection = 'right',
  duration = 0.35,
  maxDelay = 0,
  ease = 'power3.out',
  threshold = 0.1,
  rootMargin = '-100px',
  tag = 'p',
  textAlign = 'center',
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = 'evenodd',
  loop = false,
  loopDelay = 0,
  stagger = 0.03,
  scrambleCharset = '',
  colorFrom,
  colorTo,
  triggerOnce = true,
  respectReducedMotion = true,
  triggerOnHover = true
}) => {
  const ref = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  const wrappersRef = useRef([]);
  const tlRef = useRef(null);
  const playingRef = useRef(false);
  const hoverHandlerRef = useRef(null);

  useEffect(() => {
    if ('fonts' in document) {
      if (document.fonts.status === 'loaded') setFontsLoaded(true);
      else document.fonts.ready.then(() => setFontsLoaded(true));
    } else setFontsLoaded(true);
    
    // Fallback visibility if animation fails to initialize
    const timer = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;

      if (respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setReady(true);
        onShuffleComplete?.();
        return;
      }

      const el = ref.current;
      
      const teardown = () => {
        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }
        playingRef.current = false;
      };

      const build = () => {
        teardown();
        el.innerHTML = '';
        
        const chars = text.split('');
        wrappersRef.current = [];

        const rolls = Math.max(1, Math.floor(shuffleTimes));
        const rand = set => set.charAt(Math.floor(Math.random() * set.length)) || '';

        chars.forEach((char, i) => {
          const wrap = document.createElement('span');
          wrap.className = 'inline-block overflow-hidden align-bottom';
          wrap.style.position = 'relative';

          const inner = document.createElement('span');
          inner.className = 'inline-block will-change-transform transform-gpu';
          inner.style.display = 'block';

          const charSpan = document.createElement('span');
          charSpan.textContent = char === ' ' ? '\u00A0' : char;
          charSpan.className = 'inline-block';
          
          inner.appendChild(charSpan);
          
          for (let k = 0; k < rolls; k++) {
            const c = charSpan.cloneNode(true);
            if (scrambleCharset) c.textContent = rand(scrambleCharset);
            inner.appendChild(c);
          }
          
          const finalChar = charSpan.cloneNode(true);
          finalChar.setAttribute('data-orig', '1');
          inner.appendChild(finalChar);

          wrap.appendChild(inner);
          el.appendChild(wrap);
          
          const h = wrap.offsetHeight;
          const w = wrap.offsetWidth;
          
          if (shuffleDirection === 'up') {
            gsap.set(inner, { y: 0 });
            inner.setAttribute('data-final-y', -(rolls + 1) * h);
          } else if (shuffleDirection === 'down') {
            gsap.set(inner, { y: -(rolls + 1) * h });
            inner.setAttribute('data-final-y', 0);
          } else if (shuffleDirection === 'right') {
            inner.style.whiteSpace = 'nowrap';
            gsap.set(inner, { x: -(rolls + 1) * w });
            inner.setAttribute('data-final-x', 0);
          } else {
             inner.style.whiteSpace = 'nowrap';
             gsap.set(inner, { x: 0 });
             inner.setAttribute('data-final-x', -(rolls + 1) * w);
          }

          wrappersRef.current.push(wrap);
        });
      };

      const play = () => {
        const inners = wrappersRef.current.map(w => w.firstElementChild);
        if (!inners.length) return;

        playingRef.current = true;
        const isVertical = shuffleDirection === 'up' || shuffleDirection === 'down';

        const tl = gsap.timeline({
          repeat: loop ? -1 : 0,
          repeatDelay: loop ? loopDelay : 0,
          onComplete: () => {
            playingRef.current = false;
            onShuffleComplete?.();
          }
        });

        const vars = {
          duration,
          ease,
          stagger: animationMode === 'evenodd' ? stagger : 0
        };

        if (isVertical) {
          vars.y = (i, t) => parseFloat(t.getAttribute('data-final-y') || '0');
        } else {
          vars.x = (i, t) => parseFloat(t.getAttribute('data-final-x') || '0');
        }

        tl.to(inners, vars);
        tlRef.current = tl;
      };

      const armHover = () => {
        if (!triggerOnHover) return;
        const handler = () => {
          if (playingRef.current) return;
          play();
        };
        hoverHandlerRef.current = handler;
        el.addEventListener('mouseenter', handler);
      };

      const init = () => {
        build();
        setReady(true);
        play();
        armHover();
      };

      // If already in viewport or hero section, init immediately
      init();

      return () => {
        if (hoverHandlerRef.current) el.removeEventListener('mouseenter', hoverHandlerRef.current);
        teardown();
      };
    },
    {
      dependencies: [text, fontsLoaded, shuffleDirection, shuffleTimes],
      scope: ref
    }
  );

  const Tag = tag || 'p';
  return (
    <Tag 
      ref={ref} 
      className={`inline-block uppercase text-[4rem] md:text-[7rem] leading-none font-bold text-white transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ textAlign, ...style }}
    >
      {text}
    </Tag>
  );
};

export default Shuffle;
