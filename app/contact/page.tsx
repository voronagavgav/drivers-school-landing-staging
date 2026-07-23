import type { Metadata } from "next";
import {
  EnvelopeSimple,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  PublicTrustShell,
  TrustList,
  TrustSection,
} from "@/components/public-trust-shell";

export const metadata: Metadata = {
  title: "Контакти | Drivers School",
  description:
    "Контактна інформація Drivers School для підтримки та запитів щодо даних.",
};

export default function ContactPage() {
  return (
    <PublicTrustShell
      eyebrow="Звʼязок"
      title="Контакти"
      description="Один канал для технічних питань, доступу, навчального контенту та запитів щодо приватності."
    >
      <section className="trust-contact-panel rounded-card bg-graphite-950 p-5 text-text-on-dark sm:p-7">
        <EnvelopeSimple size={25} weight="duotone" className="text-pink-300" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          hello@drivers.school
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-text-on-dark-muted">
          Відкрийте свій поштовий застосунок і додайте коротку тему звернення.
        </p>
        <a
          href="mailto:hello@drivers.school"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-card bg-pink-300 px-5 text-sm font-semibold text-pink-ink hover:bg-pink-400"
        >
          Написати листа
        </a>
      </section>
      <TrustSection title="Що додати до звернення">
        <TrustList>
          <li>
            Адресу електронної пошти акаунта, якщо питання стосується входу або
            доступу.
          </li>
          <li>Адресу сторінки, режим навчання й приблизний час проблеми.</li>
          <li>Модель пристрою та назву браузера для технічної помилки.</li>
          <li>Ідентифікатор питання або теми для зауваження до контенту.</li>
        </TrustList>
      </TrustSection>
      <div className="flex gap-3 rounded-card border border-warning/25 bg-warning-surface p-4 text-sm leading-6 text-warning">
        <WarningCircle size={20} weight="duotone" className="mt-0.5 shrink-0" />
        <p>
          Не надсилайте пароль, повний номер картки, CVV, коди підтвердження або
          фото документів. Підтримка Drivers School не просить ці дані.
        </p>
      </div>
      <TrustSection title="Запити щодо даних">
        <p>
          Експорт і видалення доступні без листування у профілі. Якщо увійти
          неможливо, напишіть з адреси, повʼязаної з акаунтом, і поясніть запит.
          Для захисту даних може знадобитися додаткова перевірка.
        </p>
      </TrustSection>
      <div className="flex gap-3 rounded-card border border-info/25 bg-info-surface p-4 text-sm leading-6 text-info">
        <LockKey size={20} weight="duotone" className="mt-0.5 shrink-0" />
        <p>
          Контактна адреса призначена для підтримки сервісу. Вона не надає
          офіційних розʼяснень ПДР або консультацій від імені МВС.
        </p>
      </div>
    </PublicTrustShell>
  );
}
