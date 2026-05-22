import './oferta.scss';
import { renderTemplate } from 'shared/lib/render';
import ofertaTemplate from './oferta.hbs';

export async function renderOfertaPage(): Promise<string> {
  return renderTemplate(ofertaTemplate, {});
}
