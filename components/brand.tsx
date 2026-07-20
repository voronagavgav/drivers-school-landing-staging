import Link from "next/link";
import { Svitlyk } from "@/components/svitlyk";

/** Wordmark: the «Світлик» mascot glyph + name (Wave-12a §C — replaces the blue ПДР tile). */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <Svitlyk size={30} />
      <span className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        Drivers School
      </span>
    </Link>
  );
}

/** Required positioning: a preparation tool, not an official exam system. */
export function LegalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-muted ${className ?? ""}`}>
      Навчальна платформа для <strong>підготовки</strong> до теоретичної частини іспиту з ПДР. Це не
      офіційна екзаменаційна система: вона не замінює обов'язкові практичні заняття, не дає права
      скласти державний іспит у застосунку, не інтегрована із системами МВС / ГСЦ МВС і не гарантує
      складання іспиту. Питання ґрунтуються на офіційній базі тестових питань ГСЦ МВС (наказ від
      04.09.2025); можливі похибки опрацювання — звіряйтеся з офіційним джерелом.{" "}
      Ми збираємо лише знеособлену статистику використання у власній базі (без сторонніх трекерів і без
      збереження ваших відповідей чи персональних даних); вимкнути збір можна в розділі «Акаунт», а сигнали
      Do&nbsp;Not&nbsp;Track / GPC браузера враховуються автоматично.
    </p>
  );
}
