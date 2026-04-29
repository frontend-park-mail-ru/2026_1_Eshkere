import type { PaymentMethodOption } from 'features/balance/model/types';

function getPaymentMethodBadge(method: PaymentMethodOption): string {
  if (method.badge) {
    return method.badge;
  }

  if (method.kind === 'invoice') {
    return 'По счету';
  }

  return method.kind === 'corporate' ? 'Корпоративная' : 'Личная';
}

export function createPaymentMethodNode(
  method: PaymentMethodOption,
  selectedValue: string,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'balance-modal__method';
  wrapper.dataset.methodId = method.id;

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'method';
  input.value = method.value;
  input.checked = method.value === selectedValue;
  input.id = `balance-payment-method-${method.id}`;

  const label = document.createElement('label');
  label.className = 'balance-modal__method-ui';
  label.htmlFor = input.id;

  const main = document.createElement('span');
  main.className = 'balance-modal__method-main';

  const title = document.createElement('strong');
  title.className = 'balance-modal__method-title';
  title.textContent = method.value;

  const caption = document.createElement('span');
  caption.className = 'balance-modal__method-caption';
  caption.textContent = method.caption;

  const side = document.createElement('span');
  side.className = 'balance-modal__method-side';

  const badge = document.createElement('span');
  badge.className = 'balance-modal__method-badge';
  badge.textContent = getPaymentMethodBadge(method);

  const actions = document.createElement('span');
  actions.className = 'balance-modal__method-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'balance-modal__method-action';
  editButton.dataset.paymentMethodAction = 'edit';
  editButton.dataset.methodId = method.id;
  editButton.textContent = 'Редактировать';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className =
    'balance-modal__method-action balance-modal__method-action--danger';
  deleteButton.dataset.paymentMethodAction = 'delete';
  deleteButton.dataset.methodId = method.id;
  deleteButton.textContent = 'Удалить';

  actions.append(editButton, deleteButton);
  side.append(badge, actions);
  main.append(title, caption);
  label.append(main, side);
  wrapper.append(input, label);

  return wrapper;
}
