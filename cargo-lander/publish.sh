#!/usr/bin/env bash
# =============================================================================
# Script Name  : publish.sh
# Description  : Publishes CargoLander to the shared nginx preview umbrella
# Repository   : retro-gaming-html5
# Author       : VintageDon (https://github.com/vintagedon/)
# Created      : 2026-09-18
# Link         : https://github.com/vintagedon/retro-gaming-html5
# =============================================================================
#
# DESCRIPTION
#   Copies the static game files from this directory's game/ folder into the
#   shared retrogaming preview root under its own cargo-lander/ subfolder. The
#   subfolder is wiped first so removed files do not linger between publishes.
#   The destination is narrowed to the cargo-lander subfolder only; a guard
#   refuses to run if that path is not the expected subfolder, so the
#   retrogaming/ web root and sibling games are never touched.
#
# USAGE
#   ./publish.sh
#
# EXAMPLES
#   ./publish.sh
#       Rebuilds /opt/agents/www/retrogaming/cargo-lander from game/.
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/game"
DESTINATION_DIR="/opt/agents/www/retrogaming/cargo-lander"

# =============================================================================
# Main
# =============================================================================

main() {
    if [[ ! -d "${SOURCE_DIR}" ]]; then
        echo "Missing source directory: ${SOURCE_DIR}" >&2
        exit 1
    fi

    # Safety guard: only wipe the cargo-lander subfolder, never the umbrella root.
    if [[ "$(basename "${DESTINATION_DIR}")" != "cargo-lander" ]]; then
        echo "Refusing to publish: destination is not the cargo-lander subfolder (${DESTINATION_DIR})" >&2
        exit 1
    fi

    rm -rf "${DESTINATION_DIR}"
    mkdir -p "${DESTINATION_DIR}"
    cp -a "${SOURCE_DIR}/." "${DESTINATION_DIR}/"

    echo "Published CargoLander to ${DESTINATION_DIR}"
}

main "$@"
