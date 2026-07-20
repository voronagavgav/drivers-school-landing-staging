#!/usr/bin/env bash
# loop.sh — paste-safe supervisor for the autonomous improvement program.
# Runs ONE wave (program.sh), sleeps, repeats, until the STOP flag exists. All paths are baked in
# here so the command you paste to launch it stays SHORT and can't be mangled by terminal wrapping.
#
# Launch (detached):  nohup bash ~/drivers-school/bin/loop.sh >/tmp/ds-loop.log 2>&1 &
# Stop:               touch ~/drivers-school/.program/STOP      (rm it to resume)
set -u
PROJ="$HOME/drivers-school"
STOP="$PROJ/.program/STOP"
while [ ! -f "$STOP" ]; do
  bash "$PROJ/bin/program.sh"
  sleep 600
done
