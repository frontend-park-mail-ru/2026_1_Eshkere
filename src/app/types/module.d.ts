declare module '*.hbs' {
  const template: (data?: Record<string, unknown>) => string;
  export default template;
}

declare module '*.scss' {}
