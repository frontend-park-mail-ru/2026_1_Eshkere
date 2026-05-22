import './privacy.scss';
import { renderTemplate } from 'shared/lib/render';
import privacyTemplate from './privacy.hbs';

export async function renderPrivacyPage(): Promise<string> {
  return renderTemplate(privacyTemplate, {});
}
