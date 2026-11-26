#!/bin/sh
cd "$(dirname "$0")" || exit 1
exec python3 -E -s -B server.py --open
