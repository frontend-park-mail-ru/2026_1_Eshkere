import './public-layout.scss';
import { renderTemplate } from 'shared/lib/render';
import { renderNavbar } from 'widgets/navbar';
import publicLayoutTemplate from './public-layout.hbs';

export async function renderPublicLayout(
  content: string,
  pathname: string = '/',
): Promise<string> {
  const navbar = await renderNavbar(pathname);

  return await renderTemplate(publicLayoutTemplate, {
    navbar,
    content,
    layoutClass:
      pathname === '/login' || pathname === '/register'
        ? 'public-layout--auth-static'
        : '',
  });
}

export async function updatePublicNavbarSlot(
  pathname: string = '/',
): Promise<void> {
  const layoutRoot = document.querySelector('.public-layout');
  if (layoutRoot) {
    layoutRoot.classList.toggle(
      'public-layout--auth-static',
      pathname === '/login' || pathname === '/register',
    );
  }

  const slot = document.getElementById('app-navbar-slot');
  if (!slot) {
    return;
  }
  slot.innerHTML = await renderNavbar(pathname);
}
