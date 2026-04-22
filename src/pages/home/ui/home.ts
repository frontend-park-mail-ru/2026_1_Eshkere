import './home.scss';
import { renderTemplate } from 'shared/lib/render';
import homePageTemplate from './home.hbs';
import {
  setupAuroraBg,
  setupCounters,
  setupFirstScrollConfetti,
  setupMagnetic,
  setupMarqueePause,
  setupReveal,
  setupSectionParallax,
  setupSmoothAnchors,
  setupTilt,
} from './home-effects';
import { resetMotionCache } from './home-motion';
import { getHomeTemplateContext } from './home-view-model';

export async function renderHomePage() {
  return renderTemplate(homePageTemplate, getHomeTemplateContext());
}

export function Home(): VoidFunction {
  resetMotionCache();

  const publicLayout = document.querySelector('.public-layout');
  publicLayout?.classList.add('public-layout--home');

  const cleanups = [
    setupAuroraBg(),
    setupReveal(),
    setupMagnetic(),
    setupTilt(),
    setupCounters(),
    setupSmoothAnchors(),
    setupMarqueePause(),
    setupSectionParallax(),
    setupFirstScrollConfetti(),
  ];

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    publicLayout?.classList.remove('public-layout--home');
  };
}
