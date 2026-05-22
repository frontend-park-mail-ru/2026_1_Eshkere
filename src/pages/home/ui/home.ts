import './home.scss';
import { renderTemplate } from 'shared/lib/render';
import homePageTemplate from './home.hbs';
import { setupSmoothAnchors } from './home-effects';
import { setupHeroEntrance } from 'shared/lib/animations';
import { getHomeTemplateContext } from './home-view-model';

export async function renderHomePage() {
  return renderTemplate(homePageTemplate, getHomeTemplateContext());
}

export function Home(): VoidFunction {
  const publicLayout = document.querySelector('.public-layout');
  publicLayout?.classList.add('public-layout--home');

  const cleanups = [setupSmoothAnchors(), setupHeroEntrance()];

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    publicLayout?.classList.remove('public-layout--home');
  };
}
