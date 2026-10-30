import { CLOUD_SAVE } from '../config/cloud.ts';
import { STRINGS } from '../config/strings.ts';
import { COLORS } from '../config/visuals.ts';
import type { AuthMode } from './authErrors.ts';

const TEXT = STRINGS.account;

export interface AccountFormHandlers {
  /** Entrar o crear la cuenta. Devuelve el error a mostrar, o null si salió bien. */
  submit(mode: AuthMode, email: string, password: string): Promise<string | null>;
  /** Pedir el mail para elegir otra contraseña. */
  forgot(email: string): Promise<{ ok: boolean; text: string }>;
}

/**
 * La pantalla de la cuenta, en HTML encima de la página (Phaser no tiene campos de texto): ingreso,
 * esperas y avisos. Hasta que hay sesión el juego no se crea, así que es lo único que se ve.
 */
export class AccountScreen {
  private readonly root: HTMLDivElement;
  private readonly card: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = element('div', 'account');
    this.card = element('div', 'account-card');
    this.root.append(this.card);
    const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
    const vars: Record<string, string> = {
      '--account-primary': hex(COLORS.primary),
      '--account-danger': hex(COLORS.danger),
      '--account-card': hex(COLORS.card),
      '--account-row': hex(COLORS.cardRow),
      '--account-text': COLORS.textDark,
      '--account-muted': COLORS.textMuted,
      '--account-link': COLORS.textLink,
    };
    for (const [name, value] of Object.entries(vars)) this.root.style.setProperty(name, value);
    parent.append(this.root);
  }

  /** Un huevo que se balancea y qué se está esperando. `dim`: oscurece lo que hay detrás (el juego). */
  showLoading(text: string, dim = false): void {
    this.show([logo(), element('p', 'account-loading', text)], dim);
  }

  /** Un aviso con un botón; se resuelve al tocarlo. */
  showMessage(title: string, body: string, button: string, dim = false): Promise<void> {
    return new Promise((resolve) => {
      const action = element('button', 'account-primary', button);
      action.type = 'button';
      action.addEventListener('click', () => resolve(), { once: true });
      this.show([logo(), element('h2', 'account-title', title), element('p', 'account-lead', body), action], dim);
      action.focus();
    });
  }

  /** Formulario para entrar o crear la cuenta. `note`: aviso arriba (la partida que tiene el dispositivo). */
  showForm(handlers: AccountFormHandlers, note: string | null): void {
    let mode: AuthMode = 'signIn';
    let busy = false;

    const title = element('h2', 'account-title');
    const form = element('form', 'account-form');
    form.noValidate = true;

    const email = input('email', 'username', TEXT.email);
    email.inputMode = 'email';
    email.enterKeyHint = 'next';
    const password = input('password', 'current-password', TEXT.password);
    password.enterKeyHint = 'go';
    const eye = element('button', 'account-eye', '👁️');
    eye.type = 'button';
    const passwordBox = element('div', 'account-password');
    passwordBox.append(password, eye);
    const passwordHint = element('p', 'account-hint', TEXT.passwordHint(CLOUD_SAVE.minPasswordLength));
    const feedback = element('p', 'account-feedback');
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const submit = element('button', 'account-primary');
    submit.type = 'submit';
    form.append(field(TEXT.email, email), field(TEXT.password, passwordBox), passwordHint, feedback, submit);

    const forgot = element('button', 'account-link', TEXT.forgot);
    forgot.type = 'button';
    const switchText = element('span');
    const switchLink = element('button', 'account-link');
    switchLink.type = 'button';
    const switchRow = element('p', 'account-switch');
    switchRow.append(switchText, ' ', switchLink);

    const say = (text: string, kind: 'error' | 'info') => {
      feedback.textContent = text;
      feedback.className = `account-feedback is-${kind}`;
    };
    const render = () => {
      const signIn = mode === 'signIn';
      title.textContent = signIn ? TEXT.signInTitle : TEXT.signUpTitle;
      submit.textContent = signIn ? TEXT.signIn : TEXT.signUp;
      password.autocomplete = signIn ? 'current-password' : 'new-password';
      passwordHint.hidden = signIn;
      forgot.hidden = !signIn;
      switchText.textContent = signIn ? TEXT.toSignUp : TEXT.toSignIn;
      switchLink.textContent = signIn ? TEXT.toSignUpLink : TEXT.toSignInLink;
      say('', 'info');
    };
    const setBusy = (value: boolean) => {
      busy = value;
      for (const control of [email, password, submit, forgot, switchLink]) control.disabled = value;
    };

    eye.addEventListener('click', () => {
      const visible = password.type === 'password';
      password.type = visible ? 'text' : 'password';
      eye.textContent = visible ? '🙈' : '👁️';
      eye.setAttribute('aria-label', visible ? TEXT.hidePassword : TEXT.showPassword);
    });
    eye.setAttribute('aria-label', TEXT.showPassword);

    switchLink.addEventListener('click', () => {
      mode = mode === 'signIn' ? 'signUp' : 'signIn';
      render();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      submit.textContent = mode === 'signIn' ? TEXT.signingIn : TEXT.signingUp;
      say('', 'info');
      void handlers.submit(mode, email.value.trim(), password.value).then((problem) => {
        // Si salió bien, la pantalla pasa sola a "Trayendo tu partida…".
        if (problem === null) return;
        setBusy(false);
        render();
        say(problem, 'error');
      });
    });

    forgot.addEventListener('click', () => {
      if (busy) return;
      const address = email.value.trim();
      if (address === '') {
        say(TEXT.forgotNeedsEmail, 'error');
        email.focus();
        return;
      }
      setBusy(true);
      void handlers.forgot(address).then(({ ok, text }) => {
        setBusy(false);
        say(text, ok ? 'info' : 'error');
      });
    });

    const children: Node[] = [logo(), element('h1', 'account-brand', STRINGS.title), title];
    children.push(element('p', 'account-lead', TEXT.lead));
    if (note) children.push(element('p', 'account-note', note));
    children.push(form, forgot, switchRow);
    this.show(children, false);
    render();
  }

  hide(): void {
    this.root.hidden = true;
    this.card.replaceChildren();
  }

  private show(children: Node[], dim: boolean): void {
    this.card.replaceChildren(...children);
    this.root.classList.toggle('is-dim', dim);
    this.root.hidden = false;
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function logo(): HTMLElement {
  const egg = element('div', 'account-logo', '🥚');
  egg.setAttribute('aria-hidden', 'true');
  return egg;
}

function input(type: 'email' | 'password', autocomplete: AutoFill, label: string): HTMLInputElement {
  const node = element('input', 'account-input');
  node.type = type;
  node.name = type;
  node.autocomplete = autocomplete;
  node.autocapitalize = 'none';
  node.spellcheck = false;
  node.setAttribute('autocorrect', 'off');
  node.setAttribute('aria-label', label);
  return node;
}

function field(label: string, control: HTMLElement): HTMLLabelElement {
  const node = element('label', 'account-field');
  node.append(element('span', 'account-label', label), control);
  return node;
}
