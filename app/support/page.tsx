import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  DownloadSimple,
  Key,
  WifiSlash,
} from "@phosphor-icons/react/dist/ssr";
import {
  PublicTrustShell,
  TrustSection,
} from "@/components/public-trust-shell";

export const metadata: Metadata = {
  title: "Підтримка | Drivers School",
  description:
    "Допомога з акаунтом, навчанням, доступом та офлайн-режимом Drivers School.",
};

const HELP = [
  {
    icon: <Key size={21} weight="duotone" />,
    title: "Вхід і безпека",
    text: "Зміна пароля завершує старі сесії. Дані безпеки доступні у профілі.",
    href: "/account/security",
  },
  {
    icon: <DownloadSimple size={21} weight="duotone" />,
    title: "Дані акаунта",
    text: "Експортуйте JSON-копію або перегляньте наслідки повного видалення.",
    href: "/account/data",
  },
  {
    icon: <WifiSlash size={21} weight="duotone" />,
    title: "Офлайн-навчання",
    text: "Завантажені теми працюють без мережі, а відповіді синхронізуються після повернення звʼязку.",
    href: "/account",
  },
];

export default function SupportPage() {
  return (
    <PublicTrustShell
      eyebrow="Допомога"
      title="Підтримка"
      description="Спочатку перевірте короткі маршрути нижче. Якщо проблема лишилася, надішліть контекст без пароля або платіжних даних."
    >
      <section className="trust-route-grid grid gap-3 sm:grid-cols-3">
        {HELP.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="trust-route-card group flex min-h-56 flex-col rounded-card border border-border-light bg-surface p-4 transition-[border-color,background-color] hover:border-border-strong hover:bg-surface-raised"
          >
            <span className="grid size-10 place-items-center rounded-card bg-pink-100 text-pink-ink">
              {item.icon}
            </span>
            <h2 className="mt-4 text-sm font-semibold text-text-primary">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {item.text}
            </p>
            <ArrowRight
              size={16}
              weight="bold"
              className="mt-auto text-text-disabled transition-transform group-hover:translate-x-1"
            />
          </Link>
        ))}
      </section>
      <TrustSection title="Проблема зі збереженням або синхронізацією">
        <p>
          Не очищуйте дані браузера до перевірки офлайн-відповідей.
          Підʼєднайтеся до мережі, відкрийте застосунок і дочекайтеся
          повідомлення про відновлене зʼєднання. Якщо відповідь не зʼявилася у
          повторенні, вкажіть тему, приблизний час і пристрій.
        </p>
      </TrustSection>
      <TrustSection title="Проблема з навчальним контентом">
        <p>
          Для неточного питання надішліть його ідентифікатор або посилання,
          текст проблемного варіанта й офіційне джерело, якщо воно є. Не
          надсилайте скріншоти з чужими персональними даними.
        </p>
      </TrustSection>
      <TrustSection title="Доступ або оплата">
        <p>
          Зараз інтерфейс може показувати, що онлайн-оплата ще недоступна. У
          такому стані сервіс не повинен просити номер картки. Для ручної
          перевірки доступу вкажіть адресу електронної пошти акаунта та опишіть
          очікуваний статус.
        </p>
        <p>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-text-primary underline underline-offset-4"
          >
            Відкрити контакти <ArrowRight size={16} />
          </Link>
        </p>
      </TrustSection>
    </PublicTrustShell>
  );
}
