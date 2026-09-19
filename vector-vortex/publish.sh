#!/usr/bin/env bash
# =============================================================================
# Script Name  : publish.sh
# Description  : Publishes Vector Vortex to the shared nginx preview umbrella
# Repository   : retro-gaming-html5
# Author       : VintageDon (https://github.com/vintagedon/)
# Created      : 2026-09-19
# Link         : https://github.com/vintagedon/retro-gaming-html5
# =============================================================================
#
# DESCRIPTION
#   Copies the static game files from this directory's game/ folder into the
#   shared retrogaming preview root under its own vector-vortex/ subfolder.
#   The subfolder is wiped first so removed files do not linger between
#   publishes. The destination is narrowed to the vector-vortex subfolder
#   only; a guard refuses to run if that path is not the expected subfolder,
#   so the retrogaming/ web root and sibling games are never touched.
#
#   After copying, the script writes vv-preview-marker.txt into the
#   destination carrying a deterministic content digest of the published
#   tree, so two publishes of identical sources are byte-identical and a
#   deployed build can be identified from the served files alone.
#
# USAGE
#   ./publish.sh
#
# EXAMPLES
#   ./publish.sh
#       Rebuilds /opt/agents/www/retrogaming/vector-vortex from game/.
#
# OUTPUT
#   Prints the destination and the preview marker digest on success.
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/game"
DEST_ROOT="/opt/agents/www/retrogaming"
DESTINATION_DIR="${DEST_ROOT}/vector-vortex"
MARKER_NAME="vv-preview-marker.txt"

# =============================================================================
# Functions
# =============================================================================

# Digest the publishable tree deterministically: one sorted sha256 line per
# file, relative paths only, then one final digest over that listing.
tree_digest() {
    local root="$1"
    (cd "${root}" && find . -type f ! -name "${MARKER_NAME}" -print0 \
        | sort -z \
        | xargs -0 sha256sum \
        | sha256sum \
        | awk '{print $1}')
}

# =============================================================================
# Main
# =============================================================================

main() {
    if [[ ! -d "${SOURCE_DIR}" ]]; then
        echo "Missing source directory: ${SOURCE_DIR}" >&2
        exit 1
    fi
    if [[ ! -f "${SOURCE_DIR}/index.html" ]]; then
        echo "Missing servable entry: ${SOURCE_DIR}/index.html" >&2
        exit 1
    fi

    # Safety guard: only wipe the vector-vortex subfolder, never the
    # umbrella root or a sibling game folder.
    if [[ "$(basename "${DESTINATION_DIR}")" != "vector-vortex" ]]; then
        echo "Refusing to publish: destination is not the vector-vortex subfolder (${DESTINATION_DIR})" >&2
        exit 1
    fi
    if [[ "$(dirname "${DESTINATION_DIR}")" != "${DEST_ROOT}" ]]; then
        echo "Refusing to publish: destination is not under ${DEST_ROOT}" >&2
        exit 1
    fi

    local digest
    digest="$(tree_digest "${SOURCE_DIR}")"

    rm -rf "${DESTINATION_DIR}"
    mkdir -p "${DESTINATION_DIR}"
    cp -a "${SOURCE_DIR}/." "${DESTINATION_DIR}/"

    printf 'tree-sha256: %s\n' "${digest}" > "${DESTINATION_DIR}/${MARKER_NAME}"

    echo "Published Vector Vortex to ${DESTINATION_DIR}"
    echo "Preview marker: ${digest}"
}

main "$@"
