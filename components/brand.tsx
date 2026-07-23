import Link from "next/link";
import { Svitlyk } from "@/components/svitlyk";
import { OFFICIAL_CONTENT } from "@/lib/official-content";

/** Wordmark: the «Світлик» mascot glyph + name (Wave-12a §C — replaces the blue ПДР tile). */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-card pr-2"
    >
      <Svitlyk size={30} />
      <span className="font-display text-base font-semibold text-text-primary sm:text-lg">
        Drivers School
      </span>
    </Link>
  );
}

/** Required positioning: a preparation tool, not an official exam system. */
export function LegalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={`text-xs leading-relaxed text-text-secondary ${className ?? ""}`}
    >
      Навчальна платформа для <strong>підготовки</strong> до теоретичної частини
      іспиту з ПДР. Це не офіційна екзаменаційна система: вона не замінює
      обов&apos;язкові практичні заняття, не дає права скласти державний іспит у
      застосунку, не інтегрована із системами МВС / ГСЦ МВС і не гарантує
      складання іспиту. Усі питання, ілюстрації та правильні відповіді в
      навчальному банку імпортовано з реальної оприлюдненої бази ГСЦ МВС,
      схваленої наказом №{OFFICIAL_CONTENT.orderNumber} від{" "}
      {OFFICIAL_CONTENT.orderDate}. Перед іспитом звіряйте важливі формулювання з{" "}
      <Link
        href={OFFICIAL_CONTENT.sourcePage}
        target="_blank"
        rel="noreferrer"
        className="font-semibold underline underline-offset-2"
      >
        актуальним джерелом ГСЦ МВС
      </Link>
      . Навчальні відповіді зберігаються окремо для прогресу й
      повторень. Продуктова аналітика не містить сирих відповідей або значень
      форм і працює без сторонніх рекламних трекерів; вимкнути її можна в
      розділі «Профіль», а сигнали Do&nbsp;Not&nbsp;Track / GPC браузера
      враховуються автоматично. Докладніше — у{" "}
      <Link
        href="/privacy"
        className="font-semibold underline underline-offset-2"
      >
        політиці приватності
      </Link>
      .
    </p>
  );
}
