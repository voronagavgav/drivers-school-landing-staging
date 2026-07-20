import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { NudgeKind } from "@/lib/nudge-policy";

// Copy per nudge kind — pinned Ukrainian, calm, ZERO emoji, no guilt/FOMO (Wave 14 spec §A).
// DAY_OFF_OFFER is the ONLY first-person («я») kind — Світлик speaking to the learner.
// The count-free REVIEW_DUE variant is used (computeDueNudges returns only kind+id, so a
// precise due count isn't cheaply available here — spec allows the count-free string).
const NUDGE_COPY: Record<NudgeKind, string> = {
  REVIEW_DUE: "Є картки на повторення. 10 хвилин вистачить.",
  EXAM_COUNTDOWN:
    "До іспиту лишилось небагато. Один спокійний підхід сьогодні — краще, ніж марафон завтра.",
  DAY_OFF_OFFER:
    "Ви вчора виконали план. Якщо сьогодні без сил — візьміть вихідний, я збережу ваш поступ.",
  READINESS_MILESTONE: "Готовність зросла. Подивіться на карту тем — видно, що спрацювало.",
  RETAKE_WINBACK:
    "10 днів майже минули — повторимо слабкі теми перед новою спробою?", // COPY-PENDING-L4

};

/**
 * The day's single quiet nudge on the dashboard. Deliberately understated — the
 * readiness dial stays the screen's one bold element (Wave-12b design law): no
 * primary button, no animation, no alarm colours. Dismiss is a real server-action
 * form; the wrapper (`dismissAction`, an inline "use server" fn in the page) calls
 * dismissNudge(user.id, id) and the card is gone on the next render.
 */
export function NudgeCard({
  nudge,
  dismissAction,
}: {
  nudge: { id: string; kind: NudgeKind };
  dismissAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">{NUDGE_COPY[nudge.kind]}</p>
        <form action={dismissAction} className="shrink-0">
          <input type="hidden" name="id" value={nudge.id} />
          <SubmitButton variant="ghost" pendingLabel="Готово…">Зрозуміло</SubmitButton>
        </form>
      </div>
    </Card>
  );
}
