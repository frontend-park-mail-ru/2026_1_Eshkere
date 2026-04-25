import './iframe-layout.scss';
import { renderTemplate } from 'shared/lib/render';
import iframeLayoutTemplate from './iframe-layout.hbs';

export async function renderIframeLayout(content: string): Promise<string> {
  return renderTemplate(iframeLayoutTemplate, { content });
}
