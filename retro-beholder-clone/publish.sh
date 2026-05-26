#!/usr/bin/env bash
# =============================================================================
# Script Name  : publish.sh
# Description  : Publishes Retro Beholder Clone to the nginx preview root
# Repository   : retro-gaming-html5
# Author       : VintageDon (https://github.com/vintagedon/)
# Created      : 2026-05-25
# Link         : https://github.com/vintagedon/retro-gaming-html5
# =============================================================================
#
# DESCRIPTION
#   Copies the static game files from this directory's game/ folder into the
#   ML01 nginx preview root for eobclone.donfather.site. The destination is
#   wiped first so removed files do not linger between publishes.
#
# USAGE
#   ./publish.sh
#
# EXAMPLES
#   ./publish.sh
#       Rebuilds /opt/agents/www/eobclone from the current game/ directory.
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/game"
DESTINATION_DIR="/opt/agents/www/eobclone"

# =============================================================================
# Main
# =============================================================================

main() {
    if [[ ! -d "${SOURCE_DIR}" ]]; then
        echo "Missing source directory: ${SOURCE_DIR}" >&2
        exit 1
    fi

    rm -rf "${DESTINATION_DIR}"
    mkdir -p "${DESTINATION_DIR}"
    cp -a "${SOURCE_DIR}/." "${DESTINATION_DIR}/"

    echo "Published Retro Beholder Clone to ${DESTINATION_DIR}"
}

main "$@"
