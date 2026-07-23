import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowSquareOut,
  FilePdf,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import {
  PublicTrustShell,
  TrustList,
  TrustSection,
} from "@/components/public-trust-shell";
import { OFFICIAL_CONTENT } from "@/lib/official-content";

export const metadata: Metadata = {
  title: "Джерело питань | Drivers School",
  description:
    "Офіційне джерело питань і правильних відповідей, використаних у навчальному банку Drivers School.",
};

const SOURCE_ACTIONS = [
  {
    href: OFFICIAL_CONTENT.sourcePage,
    label: "Сторінка ГСЦ МВС",
    detail: "Опис теоретичного іспиту та оприлюднені матеріали.",
    icon: ArrowSquareOut,
  },
  {
    href: OFFICIAL_CONTENT.questionsUrl,
    label: "Питання у PDF",
    detail: "Офіційний PDF із тестовими питаннями та ілюстраціями.",
    icon: FilePdf,
  },
  {
    href: OFFICIAL_CONTENT.answersUrl,
    label: "Відповіді у PDF",
    detail: "Оприлюднена таблиця номерів правильних відповідей.",
    icon: SealCheck,
  },
] as const;

export default function QuestionsSourcePage() {
  return (
    <PublicTrustShell
      eyebrow="Прозорість контенту"
      title="Джерело питань"
      description="Навчальний банк побудовано на реальній оприлюдненій базі ГСЦ МВС. Тут можна відкрити першоджерело, окремі файли питань і правильних відповідей."
      updated="23 липня 2026"
      sourceRail
    >
      <dl className="trust-source-proof grid overflow-hidden rounded-card border border-border-light bg-surface sm:grid-cols-3">
        <div className="min-h-28 p-5 sm:border-r sm:border-border-light">
          <dt className="font-mono text-xs text-text-disabled">Установа</dt>
          <dd className="mt-3 block font-display text-xl font-semibold text-text-primary">
            {OFFICIAL_CONTENT.authority}
          </dd>
        </div>
        <div className="min-h-28 border-t border-border-light p-5 sm:border-r sm:border-t-0">
          <dt className="font-mono text-xs text-text-disabled">Підстава</dt>
          <dd className="mt-3 block font-display text-xl font-semibold text-text-primary">
            Наказ №{OFFICIAL_CONTENT.orderNumber}
          </dd>
        </div>
        <div className="min-h-28 border-t border-border-light p-5 sm:border-t-0">
          <dt className="font-mono text-xs text-text-disabled">Дата бази</dt>
          <dd className="mt-3 block font-display text-xl font-semibold text-text-primary">
            {OFFICIAL_CONTENT.orderDate}
          </dd>
        </div>
      </dl>

      <TrustSection title="Відкрити першоджерела">
        <p>
          Посилання ведуть безпосередньо на домен ГСЦ МВС. PDF-файли можуть
          відкриватися довше через їхній розмір.
        </p>
        <div className="trust-source-actions mt-5 grid gap-3 sm:grid-cols-3">
          {SOURCE_ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <a
                key={action.href}
                href={action.href}
                target="_blank"
                rel="noreferrer"
                className="trust-source-action group flex min-h-48 flex-col rounded-card border border-border-light bg-surface p-4 text-text-primary transition-[border-color,background-color] hover:border-border-strong hover:bg-surface-raised"
              >
                <Icon
                  size={21}
                  weight="duotone"
                  className="trust-source-action-icon"
                  aria-hidden="true"
                />
                <span className="mt-7 block font-semibold">{action.label}</span>
                <span className="mt-auto block pt-2 text-sm leading-6 text-text-secondary">
                  {action.detail}
                </span>
                <span className="sr-only">
                  Відкриється в новій вкладці.
                </span>
              </a>
            );
          })}
        </div>
      </TrustSection>

      <TrustSection title="Що імпортовано без змін">
        <TrustList>
          <li>Формулювання тестового питання.</li>
          <li>Варіанти відповіді та номер правильної відповіді.</li>
          <li>Офіційні ілюстрації, коли вони входять до питання.</li>
          <li>Звʼязок питання з відповідною категорією підготовки.</li>
        </TrustList>
      </TrustSection>

      <TrustSection title="Що додає Drivers School">
        <p>
          Пояснення, навчальні теми, повторення, діагностика помилок і сигнал
          готовності є навчальним шаром Drivers School. Вони допомагають
          готуватися, але не є офіційними розʼясненнями МВС і можуть
          оновлюватися окремо від джерела.
        </p>
      </TrustSection>

      <TrustSection title="Помітили розбіжність">
        <p>
          Надішліть ідентифікатор питання, проблемне формулювання та посилання
          на актуальний офіційний матеріал через{" "}
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 font-semibold text-text-primary underline underline-offset-4"
          >
            контактну сторінку <ArrowRight size={16} aria-hidden="true" />
          </Link>
          .
        </p>
      </TrustSection>
    </PublicTrustShell>
  );
}
