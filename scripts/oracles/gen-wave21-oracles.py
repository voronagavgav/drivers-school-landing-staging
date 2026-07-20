#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-wave21-oracles.py — Wave 21 study-plan honesty REFERENCE ORACLE (stdlib-only, network-free).

reference oracle — the TS impl MUST match this; never regenerate these values from TS.

This script INDEPENDENTLY re-encodes (from the published spec, NOT by importing/shelling out to any
TS/JS) the NEW `computeStudyPlan` model and the server-side `reviewLoad` estimator that Wave 21
freezes. It reproduces the quota/feasible/message-CLASS census, the clamp property, monotonicity in
daysLeft, the reviewLoad estimator on fixed stability vectors, and the boundary census.

Sources of the frozen model (this script reproduces their numbers; later tasks may NOT edit them):
  - specs/wave21-plan-honesty.md                                 (Goal + "The model fix" + Deliverable 1)
  - docs/research/PLAN-REVALIDATION-2026-07-14.md                (the explosion fixture + old-formula failure)

Oracle integrity: expected anchors come from the spec's model formulas themselves — never from the TS
impl. Run `python3 scripts/oracles/gen-wave21-oracles.py`; capture stdout into
tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt so the static evaluator reads a file, never runs.
"""

import math
import sys

# ─────────────────────────────────────────────────────────────────────────────
# Frozen constant (mirrors lib/study-plan.ts MAX_DAILY_QUOTA).
# ─────────────────────────────────────────────────────────────────────────────
MAX_DAILY_QUOTA = 40


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic day-index arithmetic — reproduces the TS `dayIndex`
# (Math.floor(Date.UTC(y, m-1, d) / 86_400_000)) with NO live clock and no datetime import.
# Howard Hinnant's days_from_civil / civil_from_days (proleptic Gregorian, epoch 1970-01-01).
# ─────────────────────────────────────────────────────────────────────────────
def days_from_civil(y, m, d):
    y -= 1 if m <= 2 else 0
    era = (y if y >= 0 else y - 399) // 400
    yoe = y - era * 400
    doy = (153 * (m + (-3 if m > 2 else 9)) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def civil_from_days(z):
    z += 719468
    era = (z if z >= 0 else z - 146096) // 146097
    doe = z - era * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    y = yoe + era * 400
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + (3 if mp < 10 else -9)
    return (y + (1 if m <= 2 else 0), m, d)


def day_index(key):
    y, m, d = (int(p) for p in key.split("-"))
    return days_from_civil(y, m, d)


def add_days(key, n):
    y, m, d = civil_from_days(day_index(key) + n)
    return "{:04d}-{:02d}-{:02d}".format(y, m, d)


# JS Math.round for non-negative x: floor(x + 0.5). Documented so the TS port matches exactly.
def jsround(x):
    return math.floor(x + 0.5)


# ─────────────────────────────────────────────────────────────────────────────
# The NEW computeStudyPlan model (spec §"The model fix"). Returns (klass, quota, feasible, daysLeft).
# klass ∈ {NODATE, MAINT, PACE, PRIORITIZE, EXAM_TODAY_OK, EXAM_TODAY_OVER}.
# reviewLoad = expected DAILY due arrivals (FLOW); dueCount = snapshot backlog (exam-today only).
# ─────────────────────────────────────────────────────────────────────────────
def compute_study_plan(exam_date, today_key, due_count, unseen_count, default_goal, review_load):
    if exam_date is None:
        return ("NODATE", default_goal, True, None)

    days_left = max(0, day_index(exam_date) - day_index(today_key))

    # Exam today / overdue: everything remaining lands on one day (CURRENT semantics + clamp).
    if days_left == 0:
        raw = unseen_count + due_count
        feasible = raw <= default_goal
        quota = min(raw, MAX_DAILY_QUOTA)  # clamp added
        return ("EXAM_TODAY_OK" if feasible else "EXAM_TODAY_OVER", quota, feasible, 0)

    # Caught up (unseen == 0): maintenance FLOW, regardless of due backlog. quota NOT clamped.
    if unseen_count == 0:
        return ("MAINT", review_load, True, days_left)

    # Unseen work remains: pace the one-shot unseen + the review flow.
    base = math.ceil(unseen_count / days_left) + review_load
    feasible = base <= MAX_DAILY_QUOTA
    if feasible:
        return ("PACE", base, True, days_left)
    return ("PRIORITIZE", min(base, MAX_DAILY_QUOTA), False, days_left)


# The OLD (pre-existing, buggy) formula — treats due as one-shot work. Documented, NOT asserted,
# except the fresh-user equality anchor (unseen-only ⇒ new == old).
def old_quota(days_left, unseen_count, due_count):
    return math.ceil((unseen_count + due_count) / days_left)


# reviewLoad estimator (server side, spec §"The model fix"): a card at stability S re-arrives ~1/S
# per day in steady state; sub-1 stability clamps to 1/day; cap at the seen count.
def review_load_estimate(stabilities):
    total = sum(1.0 / max(1.0, s) for s in stabilities)
    return total, min(len(stabilities), jsround(total))


# ─────────────────────────────────────────────────────────────────────────────
# Assertion harness — prints "ok <label> got=X exp=X" lines; tracks failures; exits non-zero on any.
# ─────────────────────────────────────────────────────────────────────────────
_PASS = 0
_FAIL = 0


def _num(x):
    if isinstance(x, float):
        return "{:.6f}".format(x)
    return str(x)


def _emit(ok, label, got, exp, extra=""):
    global _PASS, _FAIL
    if ok:
        _PASS += 1
    else:
        _FAIL += 1
    status = "ok" if ok else "not ok"
    tail = (" " + extra) if extra else ""
    print("{} {} got={} exp={}{}".format(status, label, _num(got),
                                          exp if isinstance(exp, str) else _num(exp), tail))


def eq(label, got, exp):
    _emit(got == exp, label, got, exp)


def eq6(label, got, exp):
    _emit(round(got, 6) == round(exp, 6), label, got, exp, "(6dp)")


def truth(label, cond, detail):
    _emit(bool(cond), label, detail, "TRUE")


def section(title):
    print("")
    print("# " + title)


# ═════════════════════════════════════════════════════════════════════════════
def main():
    print("static evidence — read, do not run")
    print("wave21 study-plan honesty reference oracle — stdlib-only, network-free")
    print("model sources: specs/wave21-plan-honesty.md · "
          "docs/research/PLAN-REVALIDATION-2026-07-14.md")
    print("reference oracle — the TS impl MUST match this; never regenerate these values from TS.")
    print("MAX_DAILY_QUOTA = {}; jsround(x) = floor(x + 0.5) (matches JS Math.round for x >= 0).".format(
        MAX_DAILY_QUOTA))

    TODAY = "2026-07-02"

    # ─────────────────────────────────────────────────────────────────────────
    section("(a) quota/feasible/message-CLASS census — todayKey 2026-07-02")

    # fixture rows: (name, examDate, daysLeft, U, D, reviewLoad, G, exp_class, exp_quota, exp_feasible)
    fixtures = [
        ("nodate",      None, None, 100, 10, 3,  15, "NODATE",          15, True),
        ("pace",        None, 10,   100, 20, 2,  15, "PACE",            12, True),
        ("priori",      None, 2,    190, 10, 5,  15, "PRIORITIZE",      40, False),
        ("maint",       None, 10,   0,   50, 8,  15, "MAINT",            8, True),
        ("explode",     None, 3,    0,   200, 45, 15, "MAINT",          45, True),
        ("today_ok",    None, 0,    5,   5,  0,  15, "EXAM_TODAY_OK",   10, True),
        ("today_over",  None, 0,    20,  10, 0,  15, "EXAM_TODAY_OVER", 30, False),
        ("today_clamp", None, 0,    50,  100, 0, 15, "EXAM_TODAY_OVER", 40, False),
        ("fresh",       None, 10,   100, 0,  0,  15, "PACE",            10, True),
        ("maint0",      None, 5,    0,   0,  0,  15, "MAINT",            0, True),
    ]

    for (name, exam, dleft, U, D, RL, G, ec, eq_quota, ef) in fixtures:
        exam_date = None if dleft is None else add_days(TODAY, dleft)
        klass, quota, feasible, days_left = compute_study_plan(exam_date, TODAY, D, U, G, RL)
        exp_dl = None if dleft is None else dleft
        eq("(a).{}.class".format(name), klass, ec)
        eq("(a).{}.quota".format(name), quota, eq_quota)
        eq("(a).{}.feasible".format(name), feasible, ef)
        eq("(a).{}.daysLeft".format(name), "null" if days_left is None else days_left,
           "null" if exp_dl is None else exp_dl)
        print("   (a) {:<12} class={:<15} quota={:>3} feasible={} daysLeft={}".format(
            name, klass, quota, feasible, "null" if days_left is None else days_left))

    # Documented (NOT asserted): the OLD one-shot formula EXPLODES on the caught-up explosion fixture.
    print("   # documented, NOT asserted: explode OLD formula ceil((U+D)/daysLeft)="
          "ceil((0+200)/3)={} — old verdict infeasible (> {}); the pre-existing defect this wave fixes."
          .format(old_quota(3, 0, 200), MAX_DAILY_QUOTA))

    # fresh-user equality anchor: unseen-only ⇒ NEW quota == OLD formula's day-1 value.
    fresh_old = old_quota(10, 100, 0)
    eq("(a).fresh.new_eq_old", 10, fresh_old)
    print("   # fresh-user anchor: new quota 10 == old ceil((100+0)/10) = {} (identical to today)".format(fresh_old))

    # ─────────────────────────────────────────────────────────────────────────
    section("(b) clamp property — displayed quota <= MAX_DAILY_QUOTA for unseen>0-infeasible & exam-today-overflow")
    # Max displayed quota across the infeasible fixtures (priori=40 PRIORITIZE, today_over=30,
    # today_clamp=40 clamp binds). MAINT is EXEMPT (see explode).
    infeasible_quotas = []
    for (name, exam, dleft, U, D, RL, G, ec, eq_quota, ef) in fixtures:
        if ec in ("PRIORITIZE", "EXAM_TODAY_OVER"):
            infeasible_quotas.append(eq_quota)
            truth("(b).clamp.{}<=max".format(name), eq_quota <= MAX_DAILY_QUOTA,
                  "{} <= {}".format(eq_quota, MAX_DAILY_QUOTA))
    mx = max(infeasible_quotas)
    eq("(b).clamp.max_over_infeasible", mx, MAX_DAILY_QUOTA)
    print("   clamp.max_over_infeasible = {} <= {}".format(mx, MAX_DAILY_QUOTA))
    # MAINT is intentionally NOT clamped — the explosion fixture's quota exceeds MAX to stay truthful.
    truth("(b).maint_exempt.explode>max", 45 > MAX_DAILY_QUOTA, "45 > {}".format(MAX_DAILY_QUOTA))
    print("   explode.quota = 45 > {} (MAINT exempt — maintenance is a truthful flow, never clamped)".format(
        MAX_DAILY_QUOTA))

    # ─────────────────────────────────────────────────────────────────────────
    section("(c) monotonicity in daysLeft — fixed U=100, reviewLoad=2, G=15")
    U, RL, G = 100, 2, 15
    bases = []
    displayed = []
    for dleft in [1, 2, 5, 10, 20, 100]:
        exam_date = add_days(TODAY, dleft)
        klass, quota, feasible, days_left = compute_study_plan(exam_date, TODAY, 0, U, G, RL)
        base = math.ceil(U / dleft) + RL
        bases.append(base)
        displayed.append(quota)
    exp_base = [102, 52, 22, 12, 7, 3]
    exp_disp = [40, 40, 22, 12, 7, 3]
    eq("(c).monotone.base", " ".join(str(x) for x in bases), " ".join(str(x) for x in exp_base))
    eq("(c).monotone.displayed", " ".join(str(x) for x in displayed), " ".join(str(x) for x in exp_disp))
    for i in range(1, len(bases)):
        truth("(c).base.strictly_decreasing[{}]".format(i), bases[i] < bases[i - 1],
              "{} < {}".format(bases[i], bases[i - 1]))
        truth("(c).displayed.non_increasing[{}]".format(i), displayed[i] <= displayed[i - 1],
              "{} <= {}".format(displayed[i], displayed[i - 1]))
    print("   monotone.base      = " + " ".join(str(x) for x in bases))
    print("   monotone.displayed = " + " ".join(str(x) for x in displayed))

    # ─────────────────────────────────────────────────────────────────────────
    section("(d) reviewLoad estimator — sum of 1/max(1,S) (6dp) -> jsround -> cap at seen count")
    rl_vectors = [
        ([1, 2, 4, 10],       1.850000, 2),
        ([0.5, 0.5, 0.5],     3.000000, 3),
        ([50, 50, 50],        0.060000, 0),
        ([1, 1, 1, 1, 1],     5.000000, 5),
        ([2, 3, 7, 20, 100],  1.036190, 1),
        ([0.1, 0.1],          2.000000, 2),
    ]
    for (vec, exp_sum, exp_rl) in rl_vectors:
        total, rl = review_load_estimate(vec)
        eq6("(d).reviewload.sum[{}]".format(vec), total, exp_sum)
        eq("(d).reviewload.value[{}]".format(vec), rl, exp_rl)
        print("   (d) stab={:<20} sum={:.6f} reviewLoad={} (seen={})".format(str(vec), total, rl, len(vec)))

    # ─────────────────────────────────────────────────────────────────────────
    section("(e) boundary census — daysLeft {0,1}, unseen 0, dueCount 0, reviewLoad 0; NODATE regression pin")
    # daysLeft 0 with everything 0 -> exam-today, raw 0, feasible -> EXAM_TODAY_OK quota 0.
    klass, quota, feasible, days_left = compute_study_plan(add_days(TODAY, 0), TODAY, 0, 0, 15, 0)
    eq("(e).boundary.d0_all0.class", klass, "EXAM_TODAY_OK")
    eq("(e).boundary.d0_all0.quota", quota, 0)
    print("   (e) daysLeft=0 U=0 D=0 reviewLoad=0 -> class={} quota={} feasible={}".format(klass, quota, feasible))
    # daysLeft 1 with unseen 0 -> maintenance, quota = reviewLoad 0.
    klass, quota, feasible, days_left = compute_study_plan(add_days(TODAY, 1), TODAY, 0, 0, 15, 0)
    eq("(e).boundary.d1_unseen0.class", klass, "MAINT")
    eq("(e).boundary.d1_unseen0.quota", quota, 0)
    print("   (e) daysLeft=1 U=0 D=0 reviewLoad=0 -> class={} quota={} feasible={}".format(klass, quota, feasible))

    # NODATE regression pin: quota == defaultGoal, feasible True, daysLeft null for each goal (UNCHANGED branch).
    for goal in [5, 15, 30]:
        klass, quota, feasible, days_left = compute_study_plan(None, TODAY, 10, 100, goal, 3)
        eq("(e).boundary.nodate_g{}.class".format(goal), klass, "NODATE")
        eq("(e).boundary.nodate_g{}.quota".format(goal), quota, goal)
        eq("(e).boundary.nodate_g{}.feasible".format(goal), feasible, True)
        eq("(e).boundary.nodate_g{}.daysLeft".format(goal), "null" if days_left is None else days_left, "null")
        print("   (e) NODATE defaultGoal={:>2} -> quota={} feasible={} daysLeft={}".format(
            goal, quota, feasible, "null" if days_left is None else days_left))

    # ─────────────────────────────────────────────────────────────────────────
    section("SUMMARY")
    total = _PASS + _FAIL
    print("checks: {} passed, {} failed, {} total".format(_PASS, _FAIL, total))
    if _FAIL:
        print("RESULT: FAIL")
        sys.exit(1)
    print("RESULT: ALL {} CHECKS PASSED".format(total))


if __name__ == "__main__":
    main()
