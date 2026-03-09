import { renderTemplate } from "../../assets/js/utils/render.js";

export async function renderFormField(options = {}) {

  return await renderTemplate("./components/form-field/form-field.hbs", {
    label: options.label || "",
    id: options.id || "",
    name: options.name || "",
    type: options.type || "text",
    placeholder: options.placeholder || "",
    value: options.value || "",
    className: options.className || "",
    required: options.required || false,
    disabled: options.disabled || false
  });
}